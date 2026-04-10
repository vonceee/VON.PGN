# VON.CHESS Frontend

The UI/UX layer for the VON.CHESS platform, built with Angular 21 and Tailwind CSS.

## Core Responsibilities

- **Gameplay Interface**: Real-time chess board using standard SVG/CSS rendering.
- **Real-time Integration**: Direct Socket.io connection to the [chess-microservice](../chess-microservice/) for move broadcasting.
- **Dashboard & Social**: User statistics, profile management, and chat.
- **Tactics Training**: Integrated tactics engine and board analysis.

## Project Structure

- **[`src/app/core/services/`](./src/app/core/services/)**:
  - `game.service.ts`: Primary service for managing socket connections and game state.
  - `auth.service.ts`: Integration with Laravel Sanctum for secure sessions.
- **[`src/app/features/`](./src/app/features/)**:
  - `board/`: Component logic for the interactive chess board.
  - `tactics/`: Modular tactics training engine.
- **[`src/app/shared/`](./src/app/shared/)**: Reusable UI components and design system tokens.

## Architecture & Communication

- **API Layer**: All persistent data (profiles, history) is fetched from the **Laravel Backend** via HTTP.
- **Real-time Layer**: Moves, game status, and live clock sync are handled via **Socket.io** directly with the Node.js engine.
- **State Management**: Uses a service-based approach for keeping the local board state in sync with the authoritative engine.

## Development

```bash
npm install
ng serve
```

## Styling & Theme

Uses a custom design system built with **Tailwind CSS**. 
- Highlights include vibrant HSL-tailored color palettes.
- Responsive design optimized for both desktop and mobile layouts.

---
*Note: This is a standalone frontend repository. It requires the [Laravel Backend](../VON.PGN_be/) and [Node.js Microservice](../chess-microservice/) to be running for full functionality.*
