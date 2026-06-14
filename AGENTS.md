## Project

Multiplayer BINGO web app. React+Vite+TS client + Spring Boot 3.5.4 (Java 21, Maven) backend. Firebase Auth (Google) or anonymous-name login. Real-time game events via raw WebSocket (not Socket.IO).

## Monorepo layout

- `client/` — Vite+React frontend, dev port 5173, build output dir `build/`
- `sb-server/` — Spring Boot (Maven) backend with raw WebSocket (`/game`), runs on port 8080
- `server/` — Legacy Express+Socket.IO backend (stale, kept for reference)

## Prerequisites

- **Backend**: Java 21 (Maven wrapper at `sb-server/mvnw`)
- **Frontend**: Node.js (npm), Vite 4
- **First-time setup**: create `client/.env` with `VITE_SOCKET_URL=ws://localhost:8080/game` (gitignored)

## Commands

**Client:**
- `npm run dev` — Vite dev server (port 5173, `usePolling: true` in config — relevant for Docker/WSL)
- `npm run build` — Vite build → `build/`
- `npm run lint` — ESLint + react-refresh only. Biome config exists but is NOT wired to any script.

**sb-server (Java/Spring Boot):**
- `./mvnw spring-boot:run` — dev server on port 8080
- `./mvnw compile` — compile only
- `./mvnw test` — run tests
- `./mvnw package` — build JAR

## Dev workflow

Run client on :5173, sb-server on :8080. Client reads `VITE_SOCKET_URL` from `.env`.

## Protocol

Raw WebSocket (no Socket.IO). Message format:
- Send: `JSON.stringify({ type: "...", field1: val1, ... })`
- Receive: `{"type": "...", "payload": ...}`
- Client → Server: join_room, user_ready, tile_clicked, user_won, set_next_player, leave_room, setup_complete
- Server → Client: user_joined, flush, next_player, game_over, all_ready, game_started
- `all_ready` triggers Waiting Room → Setup transition
- `game_started` triggers Setup → Game transition (sent when all players complete setup)

## Screens (screen state machine in App.tsx)

- `login` → `lobby` → `waiting` → `setup` → `game`
- State variable `screen` controls which component renders
- No router — conditional rendering based on screen state
- Components: Login, Lobby, WaitingRoom, GameSetup, Game
- Win overlay is inside Game component (WinOverlay + confetti)

## Frontend components

- `src/context/ThemeContext.tsx` — dark/light via `data-theme` on `<html>`
- `src/hooks/useWebSocket.ts` — raw WebSocket with auto-reconnect, `{ send, subscribe, ready }`
- `src/hooks/useConfetti.ts` — canvas confetti start/stop
- All CSS in `src/index.css` — neobrutalist design tokens, all component styles
- No per-component CSS files, no CSS framework

## Backend

- `GET /api/rooms` — lists active rooms with player count/max
- `GameService` — synchronized methods, `ConcurrentHashMap`-backed room state
- `GameHandler` — `TextWebSocketHandler`, tracks session→room→user mappings
- Disconnect cleanup removes user from room and broadcasts updated list

## Gotchas

- **Client build output** is `build/` (not default `dist/`). Both dirs gitignored.
- **No client tests** exist.
- **CI**: `.github/workflows/docker-publish.yml` on push to `main` — builds Docker for `sb-server/` (Spring Boot) and `client/`, pushes to GHCR. Client build passes `VITE_SOCKET_URL=wss://bingolfy.tamton.dev`.
- **Firebase config** (`client/src/firebase.ts`) is intentionally public — security enforced via Firebase console rules.
- **Tile identity** is by NUMBER (1-25), not grid position. Each player has a unique grid arrangement. Line checking compares the set of called numbers against each player's grid.
- **`setup_complete`** is sent after grid shuffle. Server waits for ALL players before broadcasting `game_started`.
- **Game requires ≥2 players**: `all_ready` only fires when at least 2 players are in the room.

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
