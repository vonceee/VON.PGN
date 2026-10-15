import type * as ortType from 'onnxruntime-web';

/**
 * Dedicated Web Worker for in-browser chessboard vision inference.
 *
 * ARCHITECTURAL CHOICE / WHY:
 * Isolates ONNX Runtime Web and intensive image tensor calculations from the main UI thread.
 * Eliminates server dependency and ensures 0 KB impact on Cloudflare Workers SSR bundle.
 *
 * ALTERNATIVES CONSIDERED:
 * 1. Server-side OCR API: Rejected due to recurring GPU/compute costs and privacy concerns.
 * 2. Main-thread ONNX inference: Rejected because resizing and tensor normalization cause UI frame drops.
 *
 * INPUT / OUTPUT TYPES:
 * @param VisionWorkerRequest  'load' config or 'image' ImageBitmap payload.
 * @returns VisionWorkerResponse 'status', 'ready', 'placement', or 'error'.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Assumes the user device supports OffscreenCanvas and WebAssembly.
 * - Handles split ONNX weights (.part1.bin and .part2.bin) to bypass Cloudflare 25MB file limit.
 * - Caches assembled weights in CacheStorage for sub-second subsequent loads.
 *
 * // CRITICAL: Never import this worker in SSR / server-side modules.
 * // TRADEOFF: First-time model download is ~40MB, cached in browser CacheStorage.
 */

export type VisionWorkerProgress = {
  type: 'progress';
  message: string;
};

export type VisionWorkerResponse =
  | { type: 'ready' }
  | { type: 'placement'; boardFen: string }
  | { type: 'progress'; message: string }
  | { type: 'error'; message: string };

export type VisionWorkerRequest =
  | {
      type: 'load';
      runtimeUrl: string;
      part1Url: string;
      part2Url: string;
      wasmUrl: string;
      wasmModuleUrl: string;
      threads: number;
    }
  | {
      type: 'image';
      image: ImageBitmap;
    };

let runtime: typeof ortType | undefined;
let session: ortType.InferenceSession | undefined;

const RESOLUTION = 644;
const CHANNEL_SIZE = RESOLUTION * RESOLUTION;
const CLASS_SYMBOLS = '.PNBRQKpnbrqk';
// Standard ImageNet RGB normalization constants used by ViT
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;
const CACHE_NAME = 'vonchess-vision-v1';
const MODEL_CACHE_KEY = '/assets/vision/chessq-lite-v4-int8-assembled.onnx';

const workerScope = self as unknown as {
  crossOriginIsolated: boolean;
  onmessage: ((event: MessageEvent<VisionWorkerRequest>) => void) | null;
  postMessage(message: VisionWorkerResponse): void;
};

workerScope.onmessage = (event: MessageEvent<VisionWorkerRequest>) => {
  handleMessage(event.data).catch((error: unknown) => {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  });
};

async function handleMessage(request: VisionWorkerRequest): Promise<void> {
  if (request.type === 'load') {
    if (session) {
      workerScope.postMessage({ type: 'ready' });
      return;
    }

    workerScope.postMessage({ type: 'progress', message: 'Loading neural network runtime...' });

    // Dynamic import of ONNX runtime
    runtime = (await import(/* @vite-ignore */ request.runtimeUrl)) as typeof ortType;

    const threads =
      workerScope.crossOriginIsolated && typeof SharedArrayBuffer === 'function'
        ? request.threads
        : 1;

    runtime.env.wasm.numThreads = Math.max(1, threads);
    runtime.env.wasm.proxy = false;
    runtime.env.wasm.wasmPaths = {
      wasm: request.wasmUrl,
      mjs: request.wasmModuleUrl
    };

    workerScope.postMessage({ type: 'progress', message: 'Loading ChessQueries Lite model...' });

    // Retrieve or fetch model weights
    const modelBuffer = await getOrFetchModelBuffer(request.part1Url, request.part2Url);

    workerScope.postMessage({ type: 'progress', message: 'Initializing inference session...' });

    session = await runtime.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });

    workerScope.postMessage({ type: 'ready' });
    return;
  }

  if (request.type === 'image') {
    if (!runtime || !session) {
      throw new Error('Vision model is not loaded yet');
    }

    workerScope.postMessage({ type: 'progress', message: 'Preprocessing image...' });

    let tensor: ortType.Tensor;
    try {
      tensor = makeTensor(runtime, request.image);
    } finally {
      request.image.close();
    }

    workerScope.postMessage({ type: 'progress', message: 'Detecting chess pieces...' });

    const output = await session.run({ image: tensor });
    const logits = output['logits'];

    if (!logits || logits.dims.join(',') !== '1,64,13') {
      throw new Error(`Unexpected model output shape: ${logits?.dims?.join(',')}`);
    }

    const boardPlacement = boardFen(logits.data as Float32Array);
    workerScope.postMessage({ type: 'placement', boardFen: boardPlacement });
  }
}

/**
 * Loads the 41MB ONNX model, checking CacheStorage first.
 * If uncached, downloads both ~20MB parts in parallel and stitches them.
 */
async function getOrFetchModelBuffer(part1Url: string, part2Url: string): Promise<ArrayBuffer> {
  // 1. Try CacheStorage
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(MODEL_CACHE_KEY);
      if (cachedResponse) {
        return await cachedResponse.arrayBuffer();
      }
    }
  } catch (err) {
    console.warn('[ChessVisionWorker] CacheStorage match failed:', err);
  }

  // 2. Fetch both parts concurrently
  const [res1, res2] = await Promise.all([
    fetch(part1Url),
    fetch(part2Url)
  ]);

  if (!res1.ok || !res2.ok) {
    throw new Error(`Failed to download model parts: ${res1.statusText} / ${res2.statusText}`);
  }

  const [buf1, buf2] = await Promise.all([
    res1.arrayBuffer(),
    res2.arrayBuffer()
  ]);

  // 3. Assemble chunks
  const totalLength = buf1.byteLength + buf2.byteLength;
  const assembled = new Uint8Array(totalLength);
  assembled.set(new Uint8Array(buf1), 0);
  assembled.set(new Uint8Array(buf2), buf1.byteLength);

  // 4. Save to CacheStorage for instant future reloads
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(MODEL_CACHE_KEY, new Response(assembled.buffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      }));
    }
  } catch (err) {
    console.warn('[ChessVisionWorker] CacheStorage save failed:', err);
  }

  return assembled.buffer;
}

/**
 * Resizes and normalizes the input ImageBitmap to a 644x644 Float32 Tensor.
 */
function makeTensor(ort: typeof ortType, image: ImageBitmap): ortType.Tensor {
  const canvas = new OffscreenCanvas(RESOLUTION, RESOLUTION);
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) throw new Error('OffscreenCanvas 2D context unavailable');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, RESOLUTION, RESOLUTION);

  const pixels = context.getImageData(0, 0, RESOLUTION, RESOLUTION).data;
  const input = new Float32Array(3 * CHANNEL_SIZE);

  for (let pixel = 0, rgba = 0; pixel < CHANNEL_SIZE; pixel++, rgba += 4) {
    for (let ch = 0; ch < 3; ch++) {
      input[ch * CHANNEL_SIZE + pixel] = (pixels[rgba + ch] / 255 - MEAN[ch]) / STD[ch];
    }
  }

  return new ort.Tensor('float32', input, [1, 3, RESOLUTION, RESOLUTION]);
}

/**
 * Converts 64x13 logits into standard FEN placement ranks.
 */
function boardFen(logits: Float32Array): string {
  const labels = new Uint8Array(64);

  for (let square = 0; square < 64; square++) {
    const offset = square * 13;
    let bestClass = 0;
    for (let piece = 1; piece < 13; piece++) {
      if (logits[offset + piece] > logits[offset + bestClass]) {
        bestClass = piece;
      }
    }
    labels[square] = bestClass;
  }

  const ranks: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    let encoded = '';
    let emptyCount = 0;
    const rankLabels = labels.slice(rank * 8, rank * 8 + 8);

    for (const label of rankLabels) {
      if (label === 0) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          encoded += emptyCount;
          emptyCount = 0;
        }
        encoded += CLASS_SYMBOLS[label];
      }
    }

    if (emptyCount > 0) {
      encoded += emptyCount;
    }
    ranks.push(encoded);
  }

  return ranks.join('/');
}
