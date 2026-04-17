# Live Game Architecture & Microservice Integration

This document explains the architecture of the live game system in **VON.CHESS**, focusing on how the Angular frontend interacts with the Node.js microservice and the Laravel backend.

## System Overview

The live game functionality is a distributed system designed for low-latency, authoritative gameplay. It consists of three primary components:

1.  **VON.PGN (Frontend)**: Angular 21 application.
2.  **VON.PGN_be (Backend)**: Laravel 12 API.
3.  **Chess-Microservice (Real-time)**: Node.js / Socket.io server.

---

## Component Roles

### 1. API Backend (Laravel)
- **Matchmaking**: Orchestrates "seeks" and "challenges". When two players are matched, Laravel selects the colors and initial parameters.
- **Persistence**: Stores the definitive record of games in the PostgreSQL database.
- **Authentication**: Issues and validates JWT/Sanctum tokens used by both the Frontend and the Microservice.
- **Result Processing**: Receives the final result from the Microservice, updates player ratings (Elo), and handles achievements/history.

### 2. Real-time Microservice (Node.js)
- **Authoritative Server**: Maintains the current state of all active games in memory (`games` Map in `game.js`).
- **Chess Physics**: Uses `chess.js` to validate every move submitted by clients. Rejecting illegal moves immediately.
- **Clock Management**: The only source of truth for time remaining. It calculates elapsed time between moves and flags timeouts.
- **Broadcasting**: Pushes real-time events (`move_made`, `clock_sync`, `game_ended`) to all connected players in a game "room".
- **Internal Coordination**: Communicates with Laravel via internal endpoints to report game start/end.

### 3. Frontend (Angular)
- **UI/UX**: Renders the board, move list, and clocks.
- **Optimistic Validation**: (Optional) Can validate moves locally for instant UI feedback, though it always waits for the microservice's `move_made` event for the definitive update.
- **Real-time Sync**: Uses `GameService` to maintain a persistent WebSocket connection to the microservice.

---

## Data Flow & Lifecycle

### Phase 1: Game Creation
1.  **User Search**: Player clicks "1+0 Bullet". Frontend sends a `POST /api/game/seek` to **Laravel**.
2.  **Matchmaking**: Laravel finds an opponent.
3.  **Initialization**: Laravel sends a `POST` request to the **Microservice**'s internal API to create a new game instance in memory.
4.  **Redirect**: Both players receive the match notification and navigate to `/play/{gameId}`.

### Phase 2: Gameplay (The "Live" Part)
1.  **Connection**: The `GameService` in Angular connects to the Microservice via **Socket.io**.
2.  **Subscription**: Frontend emits `join_game` with the `gameId`.
3.  **State Sync**: The Microservice responds with the current `game_state` (FEN, Clocks, etc.).
4.  **Move Execution**:
    -   Player moves a piece. Frontend emits `make_move` to the Microservice.
    -   Microservice validates the move. If legal, it updates the clock and the FEN.
    -   Microservice broadcasts `move_made` to both players.
    -   Microservice checks for game-over conditions (Checkmate, Draw, etc.).

### Phase 3: Game Completion
1.  **Termination**: When a game ends (Checkmate, Resignation, Timeout), the **Microservice** sets the status to `completed`.
2.  **Reporting**: The Microservice POSTs the final result, move list, and termination reason to **Laravel**'s internal cleanup endpoint.
3.  **Broadcast**: Microservice emits `game_ended` to the clients.
4.  **Finalization**: Laravel updates the database, calculates rating changes, and the Frontend displays the post-game summary.

---

## Communication Protocols

| Action | Source | Destination | Protocol |
| :--- | :--- | :--- | :--- |
| Create Seek / Matchmaking | Frontend | Laravel | HTTP REST |
| Make Move | Frontend | Microservice | WebSocket (Socket.io) |
| Broadcast Move | Microservice | Frontend | WebSocket (Socket.io) |
| Sync Clock | Microservice | Frontend | WebSocket / HTTP |
| Report Result | Microservice | Laravel | HTTP (Internal) |
| Auth Validation | Microservice | Laravel | HTTP / JWT |

---

## Key Files Reference

### Frontend (`VON.PGN`)
- `src/app/core/services/game.service.ts`: Core logic for socket connection and event handling.
- `src/app/features/play/`: Components for the board and game logic.

### Microservice (`chess-microservice`)
- `server.js`: Entry point and Socket.io setup.
- `game.js`: In-memory state management and `games` Map.
- `handlers/game.handler.js`: Socket event listeners (`make_move`, `join_game`).
- `services/game-logic.js`: The "brain" that processes moves and handles turn transitions.
- `utils/clock.js`: Handles time calculations and timeout flags.

### Backend (`VON.PGN_be`)
- `app/Http/Controllers/Api/GameController.php`: Matchmaking and active game retrieval.
- `app/Services/GameService.php`: Orchestration logic and microservice communication.
