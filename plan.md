# Phase 1 — Security & Game Integrity

## Scope

Server-side win verification, input validation, turn enforcement, CORS restriction, anonymous UID fix.

## Execution Order

```
Server first (GameService → GameHandler → Config), then Client (App.tsx → Game.tsx)
```

## 1. GameService.java — New State + Methods

**New fields:**
```java
private final Map<String, Map<String, int[][]>> playerGrids = new ConcurrentHashMap<>();
private final Map<String, Set<Integer>> calledNumbers = new ConcurrentHashMap<>();
private final Map<String, String> currentPlayer = new ConcurrentHashMap<>(); // room → whose turn
private final Map<String, String> gamePhase = new ConcurrentHashMap<>();     // room → "SETUP"|"PLAYING"|"FINISHED"
```

**New/modified methods:**
- `storeGrid(room, name, grid)` — stores a player's 5x5 grid
- `updateCalledNumbers(room, newTiles)` — validates each tile is 1-25 and not already called, adds to `calledNumbers`, returns `false` if any invalid
- `countLines(room, name)` — checks 12 lines (5 rows + 5 cols + 2 diags) against `calledNumbers`, returns count
- `getCurrentPlayer(room)` / `setCurrentPlayer(room, name)`
- `getGamePhase(room)` / `setGamePhase(room, phase)`
- `setFirstPlayer(room)` — picks random player, sets as current, returns name
- `cleanupRoomState(room)` — removes `playerGrids`, `calledNumbers`, `currentPlayer`, `gamePhase` for a room
- Modify `removeUser` to also clean grid; call `cleanupRoomState` when room empties

## 2. GameHandler.java — Validation + Win Verification + Turn Enforcement

### `handleTextMessage` (line 37-51)
- Wrap entire body in `try/catch(Exception)` — log error
- Null-check `jsonNode.get("type")`, validate it's textual
- Validate `type` is in known set before the switch

### `handleJoinRoom` (line 53-73)
- Null-check `json.get("room")` and `json.get("name")`
- Trim, reject empty-after-trim
- Max length: room 50, name 30
- Reject control characters

### `handleUserReady` (line 75-87)
- **Replace** `json.get("room").asText()` with `sessionRooms.get(session.getId())`
- **Replace** `json.get("user").asText()` with `sessionUsers.get(session.getId())`
- Null-check both, return if null

### `handleTileClicked` (line 89-93)
- Derive room/name from session maps
- Check `gameService.getGamePhase(room) == "PLAYING"`, reject otherwise
- Check `gameService.getCurrentPlayer(room).equals(name)`, reject otherwise
- Validate `json.get("tiles")` is array, each element is int 1-25
- Call `gameService.updateCalledNumbers(room, tiles)`, reject if returns false
- Broadcast updated called numbers (not raw client payload)

### `handleUserWon` (line 95-98)
- Derive room/name from session
- Check game phase is PLAYING
- Call `gameService.countLines(room, name)`
- If `>= 5`: broadcast `game_over` with clean `Map.of("user", name)`, set phase to FINISHED
- If `< 5`: send `win_rejected` to just this session

### `handleSetNextPlayer` (line 100-104)
- Derive room from session (but `user` field = "the next player", not sender)
- Validate room exists and phase is PLAYING
- Update `gameService.setCurrentPlayer(room, nextPlayer)`
- Broadcast as before

### `handleSetupComplete` (line 128-139)
- Parse `json.get("grid")` as `int[][]`
- Validate: 5x5, contains numbers 1-25, no duplicates
- Call `gameService.storeGrid(room, name, grid)`
- Existing `markSetupComplete` logic stays

### `all_ready` broadcast (line 82-86)
- After `markSetupComplete`, call `gameService.setFirstPlayer(room)`
- Include `firstPlayer` in the `game_started` broadcast

### `handleLeaveRoom` / `afterConnectionClosed`
- Call `gameService.cleanupRoomState(room)` when room empties

## 3. WebSocketConfig.java — CORS

Line 22: `setAllowedOrigins("*")` → `setAllowedOriginPatterns("http://localhost:5173", "https://bingolfy.tamton.dev")`

## 4. WebConfig.java — CORS

```java
registry.addMapping("/api/**")
    .allowedOriginPatterns("http://localhost:5173", "https://bingolfy.tamton.dev")
    .allowedMethods("GET", "OPTIONS");
```

## 5. TestController.java — Guard

Add `@Profile("dev")` to the class.

## 6. App.tsx — UID + Grid

- **Line 44:** `Math.random() * 100` → `crypto.randomUUID()`
- **Line 106:** `socket.send("setup_complete")` → `socket.send("setup_complete", { grid: g })`

## 7. Game.tsx — Win Handling

- Keep `setWonUser(myName)` on line 93 (optimistic for snappy feel)
- Add `win_rejected` subscription: revert `wonUser` to `null`, reset `bingoReady`

## Files Modified (7 total)

| File | Type |
|------|------|
| `sb-server/.../GameService.java` | Major |
| `sb-server/.../GameHandler.java` | Major |
| `sb-server/.../WebSocketConfig.java` | Minor |
| `sb-server/.../WebConfig.java` | Minor |
| `sb-server/.../TestController.java` | Minor |
| `client/src/App.tsx` | Minor |
| `client/src/components/Game.tsx` | Minor |

---

# Phase 2 — Robustness

## Scope

Race condition fixes, per-room locking, thread safety, graceful shutdown, message queue, React error boundary.

## 1. RoomLockManager.java — New File

Per-room `ReentrantLock` manager. `ConcurrentHashMap<String, ReentrantLock>` with `getLock(room)` and `removeLock(room)`. Replaces global `synchronized` on `GameService`.

## 2. GameService.java — Per-Room Locking + Atomic Compound Methods

- Remove all `synchronized` keywords from methods
- Each room-scoped method uses `lockManager.getLock(room)` with `try/finally` unlock
- `getRoomList()` iterates `ConcurrentHashMap` without locking
- New `tryStartReadyPhase(room)`: atomically checks `allReady`, resets flags, picks random player — eliminates `handleUserReady` race
- New `tryStartGame(room, name)`: atomically marks setup complete, checks all done, resets, picks first player, sets phase — eliminates `handleSetupComplete` race
- `removeUser` calls `lockManager.removeLock(room)` when room empties

## 3. GameHandler.java — Use Atomic Methods

- `handleUserReady`: replace `allReady` + `resetAllReady` + `getRandomPlayer` with single `tryStartReadyPhase` call
- `handleSetupComplete`: replace `markSetupComplete` + `resetSetupComplete` + `setFirstPlayer` with single `tryStartGame` call

## 4. User.java — Thread Safety

`private boolean ready` → `private volatile boolean ready`

Ensures visibility when `User` objects escape via `List.copyOf` and are serialized by Jackson outside the lock.

## 5. Backend Config — Graceful Shutdown + Actuator

**pom.xml:** Add `spring-boot-starter-actuator`

**application.properties:**
```properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
```

## 6. useWebSocket.ts — Message Queue

- Add `messageQueue` ref (max 50 messages)
- `send()`: if socket not OPEN, push to queue (drop oldest on overflow)
- `ws.onopen`: flush queue
- On unmount: clear queue

## 7. ErrorBoundary.tsx — New File + App.tsx Wrap

Class component with `componentDidCatch` / `getDerivedStateFromError`. Reuses `.win-overlay` + `.win-card` CSS. Two buttons: "TRY AGAIN" (resets state) and "RELOAD PAGE". Wraps content in `App.tsx`.

## Files Modified (9 total)

| File | Type |
|------|------|
| New: `sb-server/.../service/RoomLockManager.java` | New |
| `sb-server/.../GameService.java` | Major |
| `sb-server/.../GameHandler.java` | Minor |
| `sb-server/.../entity/User.java` | Minor |
| `sb-server/pom.xml` | Minor |
| `sb-server/src/main/resources/application.properties` | Minor |
| `client/src/hooks/useWebSocket.ts` | Major |
| New: `client/src/components/ErrorBoundary.tsx` | New |
| `client/src/App.tsx` | Minor |

---

# Phase 3 — UX Polish

## 1. ThemeContext.tsx — Persist to localStorage

Read theme from `localStorage` on init (with `prefers-color-scheme` fallback). Write on toggle.

## 2. Login.tsx — Error Feedback

Add `googleError` state. Show error message on sign-in failure (except popup-closed/cancelled). Display with `role="alert"`.

## 3. Lobby.tsx — Error Feedback

Add `fetchError` state. Set on room fetch failure. Show "Could not load rooms. Retrying..." message.

## 4. WinOverlay.tsx — Focus Trap + Escape

- Escape key handler → calls `onGoHome`
- Tab/Shift+Tab focus trap within the card
- Auto-focus first button on open
- `aria-hidden="true"` on confetti canvas

## 5. Game.tsx — Space Key

Add `e.key === ' '` alongside Enter in tile `onKeyDown` handler. Call `e.preventDefault()`.

## 6. Game State Recovery on Reconnect

**Server:** New `request_state` handler. Returns `game_state` with `phase`, `calledNumbers`, `currentPlayer`, `lines`.

**Client (App.tsx):** Subscribe to `game_state`, restore `currentPlayer` and `screen`. Send `request_state` after `join_room` on reconnect if grid exists.

**Client (Game.tsx):** Subscribe to `game_state`, restore `marked` set and `lines` count.

## Files Modified (8 total)

| File | Type |
|------|------|
| `client/src/context/ThemeContext.tsx` | Minor |
| `client/src/components/Login.tsx` | Minor |
| `client/src/components/Lobby.tsx` | Minor |
| `client/src/components/WinOverlay.tsx` | Major |
| `client/src/components/Game.tsx` | Minor |
| `client/src/App.tsx` | Minor |
| `sb-server/.../GameHandler.java` | Minor |
| `client/src/index.css` | Minor |

---

# Phase 4 — Infrastructure

## 1. Non-Root Docker Users

Both Dockerfiles create `appuser:appgroup` (UID/GID 1001), `chown` files, and `USER appuser`.

## 2. nginx Config

New `client/nginx.conf`: SPA fallback (`try_files`), cache headers for static assets, security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), gzip compression.

## 3. CI Test Step

New `test` job runs before `build-and-push`: `./mvnw test` for server, `npm ci` + `npm run lint` for client. Updated action versions to v4/v3/v6.

## 4. Versioned Docker Tags

Uses `docker/metadata-action` to generate both `:latest` and `:sha-<short>` tags.

## 5. .dockerignore for client

Excludes `node_modules`, `build`, `.git`, `.env`, `*.md`, IDE files, Docker files.

## Files Modified/Created (5 total)

| File | Type |
|------|------|
| `client/Dockerfile` | Modified |
| `client/nginx.conf` | New |
| `client/.dockerignore` | New |
| `sb-server/Dockerfile` | Modified |
| `.github/workflows/docker-publish.yml` | Modified |

---

# Remaining Fixes (Post-Audit)

## Critical

1. **`tile_clicked` sends only new tile** — was sending ALL marked tiles, causing server `updateCalledNumbers` to reject duplicates. Fixed: `socket.send("tile_clicked", { tiles: [n], room })`
2. **`.dockerignore` no longer excludes `nginx.conf`** — was breaking Docker build

## High

3. **Atomic compound ops in GameHandler** — `handleTileClicked` uses `isPlayersTurn()`, `handleUserWon` uses `tryClaimWin()`, `handleSetNextPlayer` uses `advanceTurn()`. All under per-room locks.
4. **Client-side error handler** — `App.tsx` subscribes to `"error"` messages, shows banner for 4s
5. **Play Again resets server** — `handlePlayAgain` sends `reset_game` to server. Server resets `calledNumbers`, `gamePhase`, `currentPlayer`. Broadcasts `game_reset` to room.
6. **`game_reset` subscriber** — Game.tsx clears local state on `game_reset`

## Medium

7. **Stale grid closure fixed** — `App.tsx` uses `gridRef` for `game_state` handler instead of stale closure
8. **Dead code removed** — `markedRef` (Game.tsx), `getUserCount` (GameService), `setFirstPlayer` (GameService), `setCurrentPlayer` (GameService), `spring-boot-starter-web-services` (pom.xml)
9. **Debug println removed** from TestController

## New Files Modified

| File | Change |
|------|--------|
| `client/src/components/Game.tsx` | tile_clicked fix, game_reset handler, dead code removal |
| `client/src/App.tsx` | error handler, gridRef for stale closure |
| `client/src/index.css` | `.error-banner` class |
| `client/.dockerignore` | removed nginx.conf exclusion |
| `sb-server/.../GameService.java` | atomic methods, dead code removal |
| `sb-server/.../GameHandler.java` | uses atomic methods, reset_game handler |
| `sb-server/pom.xml` | removed unused dependency |
| `sb-server/.../TestController.java` | removed debug println |
