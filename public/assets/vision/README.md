# ChessQueries Lite Vision Model Assets

This directory contains the quantized ONNX model weights and WebAssembly runtime binaries for chessboard position recognition.

- Model: `chessq-lite-v4-int8.part1.bin` and `chessq-lite-v4-int8.part2.bin` (split for Cloudflare 25MB static asset limit).
- Original ViT-S weights by Joël Seytre: https://huggingface.co/joelseytre/chessq-lite
- Reference Paper: https://arxiv.org/abs/2608.30762
- Quantized and distributed by Lichess (Lila): https://github.com/lichess-org/lila
- ViT-S weights provided under PolyForm Noncommercial License 1.0.0 (https://huggingface.co/joelseytre/chessq-lite/blob/main/LICENSE)
