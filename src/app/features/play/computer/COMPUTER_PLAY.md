# Computer Play Module Documentation

The `ComputerPlayModule` (implemented as the `ComputerPlayComponent`) provides a full-featured "Play against Computer" experience in VonChess. It integrates the Stockfish chess engine to provide scalable difficulty levels and real-time evaluation.

## Architecture Overview

The system is split into two main parts:
1.  **UI Controller (`ComputerPlayComponent`)**: Manages the game state, timer, user interactions, and coordination between the board and the engine.
2.  **Engine Layer (`EngineService`)**: A wrapper around a Stockfish Web Worker that communicates via the UCI (Universal Chess Interface) protocol.

## Core Features

### 1. Difficulty Levels
VonChess supports 8 levels of difficulty. These are mapped to Stockfish's internal `Skill Level` parameter (0 to 20) via a mapping utility in `EngineService`.
- **Level 1**: Beginner (Skill Level 0)
- **Level 8**: Grandmaster (Skill Level 20)

### 2. Time Control
Supports both standard and custom time controls:
- **Base Time**: The starting time for each player.
- **Increment**: Extra seconds added after every move.
- **Timer Subsystem**: A precise interval-based timer that updates every 100ms to ensure a responsive UI.

### 3. Move Handling & Validation
- **Chess.js Integration**: The component uses `chess.js` for rule validation, checkmate detection, and state management (FEN/PGN).
- **UCI Protocol**: The component and engine exchange moves using Coordinate Notation (e.g., "e2e4"), which is then converted by `chess.js` for notation display.

## Technical Workflow

### Game Initialization
1.  `startGame()` is called when the user clicks "Play".
2.  Colors are assigned (randomized if necessary).
3.  `EngineService.prepareGame(level)` sets the `Skill Level` on the engine and resets its state.
4.  `chess.js` instance is reset.
5.  If the player is Black, the component immediately triggers `requestEngineMove()`.

### The Move Loop
1.  **User Move**: User interacts with `<app-chess-board>`. The component receives the move, updates the local `game` instance, and applies the time increment.
2.  **Engine Request**: Component calls `engineService.requestMove()`, sending the current FEN and the remaining time for both sides.
3.  **Engine Thinking**: Stockfish processes the position in a background thread (Web Worker).
4.  **Engine Response**: Stockfish returns the `bestmove` via a postMessage. The `EngineService` emits this to its subscribers.
5.  **State Update**: `ComputerPlayComponent` applies the engine's move to `chess.js`, updates the board's FEN, and toggles the turn back to the user.

### Evaluation Updates
While thinking, the engine sends `info` strings containing scores. These are parsed by `EngineService` and displayed in the sidebar as a centipawn evaluation (e.g., `+1.5`) or mate distance (e.g., `#3`).

## Key Files
- `computer-play.component.ts`: Main logic and state.
- `computer-play.component.html`: UI Layout (Setup vs Game).
- `engine.service.ts`: Stockfish worker abstraction.
- `assets/engine/stockfish.js`: The compiled Stockfish engine (WebAssembly/JS).

---

> [!TIP]
> To improve engine performance on slower devices, consider adjusting the "depth" or "nodes" parameters in `EngineService.requestMove()` if games feel too sluggish.
