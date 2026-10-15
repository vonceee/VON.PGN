import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { ToastService } from './toast.service';
import {
  VisionStatusDialogComponent,
  VisionStatusDialogData
} from '../../features/study/dialogs/vision-status-dialog/vision-status-dialog.component';
import type {
  VisionWorkerRequest,
  VisionWorkerResponse
} from '../workers/chess-vision.worker';

/**
 * Service orchestrating in-browser neural recognition of chessboards from images.
 *
 * ARCHITECTURAL CHOICE (WHY):
 * Provides an asynchronous bridge between UI components (Study Add Chapter, Board Editor)
 * and the background inference Web Worker. Encapsulates feature detection, model lifecycle,
 * dialog presentation, and error handling.
 *
 * ALTERNATIVES CONSIDERED:
 * - Direct worker interaction in components: Rejected to maintain DRY logic and avoid duplicating
 *   Web Worker initialization and asset paths across different boards/pages.
 *
 * EXPECTED INPUT / OUTPUT TYPES:
 * @param file File - User-provided image file (PNG, JPEG, WebP, etc.)
 * @returns Promise<string> - The decoded full FEN string (e.g. "r1bqkb1r/pppp1ppp/... w - - 0 1")
 *
 * ASSUMPTIONS & EDGE CASES:
 * - SSR: All execution is guarded with isPlatformBrowser. If called on server, rejects immediately.
 * - Hardware capabilities: Checks for Worker and OffscreenCanvas support.
 * - Model caching: Handled transparently by the Web Worker using CacheStorage.
 *
 * // CRITICAL: Never instantiate Worker when !isPlatformBrowser(platformId).
 * // TRADEOFF: First-time model download is ~40MB, cached in browser CacheStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class ChessVisionService {
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(Dialog);
  private toast = inject(ToastService);

  private worker: Worker | null = null;
  private isModelReady = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Checks whether the current browser environment supports the required vision primitives.
   */
  isSupported(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
  }

  /**
   * Recognizes a chessboard position from an uploaded image file.
   */
  async analyzeImage(file: File): Promise<string> {
    if (!this.isSupported()) {
      const msg = 'Image recognition is not supported in this browser or device.';
      this.toast.error(msg);
      throw new Error(msg);
    }

    const dialogData: VisionStatusDialogData = {
      title: 'Recognizing Position',
      statusText: 'Preparing vision engine...'
    };

    const dialogRef = this.dialog.open(VisionStatusDialogComponent, {
      data: dialogData,
      width: '360px',
      maxWidth: '90vw',
      disableClose: true,
      backdropClass: ['bg-black/60']
    });

    try {
      const worker = this.getOrCreateWorker();

      // Ensure model is loaded in worker
      await this.ensureModelLoaded(worker, dialogData);

      dialogData.statusText = 'Reading image...';

      // Normalize orientation (EXIF) and convert to transferrable ImageBitmap
      const imageBitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image'
      });

      dialogData.statusText = 'Analyzing board squares...';

      const placement = await new Promise<string>((resolve, reject) => {
        let isComplete = false;

        const messageHandler = (event: MessageEvent<VisionWorkerResponse>) => {
          const res = event.data;
          if (res.type === 'progress') {
            dialogData.statusText = res.message;
          } else if (res.type === 'placement') {
            isComplete = true;
            worker.removeEventListener('message', messageHandler);
            resolve(res.boardFen);
          } else if (res.type === 'error') {
            isComplete = true;
            worker.removeEventListener('message', messageHandler);
            reject(new Error(res.message));
          }
        };

        const errorHandler = (err: ErrorEvent) => {
          if (!isComplete) {
            isComplete = true;
            worker.removeEventListener('message', messageHandler);
            worker.removeEventListener('error', errorHandler);
            reject(new Error(err.message || 'Worker execution error'));
          }
        };

        // Listen for cancellation from dialog
        const sub = dialogRef.closed.subscribe(() => {
          if (!isComplete) {
            isComplete = true;
            worker.removeEventListener('message', messageHandler);
            worker.removeEventListener('error', errorHandler);
            reject(new Error('Recognition was cancelled by user.'));
          }
        });

        worker.addEventListener('message', messageHandler);
        worker.addEventListener('error', errorHandler, { once: true });

        const req: VisionWorkerRequest = { type: 'image', image: imageBitmap };
        worker.postMessage(req, [imageBitmap]);
      });

      dialogRef.close();
      this.toast.success('Position successfully recognized!');
      return `${placement} w - - 0 1`;
    } catch (err: unknown) {
      dialogRef.close();
      const message = err instanceof Error ? err.message : String(err);
      if (message !== 'Recognition was cancelled by user.') {
        this.toast.error(message || 'Failed to recognize chessboard from image.');
      }
      throw err;
    }
  }

  private getOrCreateWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/chess-vision.worker', import.meta.url), {
        type: 'module'
      });
    }
    return this.worker;
  }

  private async ensureModelLoaded(worker: Worker, dialogData: VisionStatusDialogData): Promise<void> {
    if (this.isModelReady) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      dialogData.statusText = 'Downloading ChessQueries Lite...';

      const handleReady = (event: MessageEvent<VisionWorkerResponse>) => {
        const res = event.data;
        if (res.type === 'progress') {
          dialogData.statusText = res.message;
        } else if (res.type === 'ready') {
          this.isModelReady = true;
          worker.removeEventListener('message', handleReady);
          resolve();
        } else if (res.type === 'error') {
          this.initPromise = null;
          worker.removeEventListener('message', handleReady);
          reject(new Error(res.message));
        }
      };

      worker.addEventListener('message', handleReady);

      const req: VisionWorkerRequest = {
        type: 'load',
        runtimeUrl: '/assets/vision/ort.wasm.min.mjs',
        wasmUrl: '/assets/vision/ort-wasm-simd-threaded.wasm',
        wasmModuleUrl: '/assets/vision/ort-wasm-simd-threaded.mjs',
        part1Url: '/assets/vision/chessq-lite-v4-int8.part1.bin',
        part2Url: '/assets/vision/chessq-lite-v4-int8.part2.bin',
        threads: Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1)
      };

      worker.postMessage(req);
    });

    return this.initPromise;
  }
}
