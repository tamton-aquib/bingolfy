# BINGOLFY

A multiplayer web app game of BINGO.
Access the game at:
> https://bingolfy.tamton.dev

## Persistence

- **Rooms and games are in-memory** — a server restart clears all rooms and
  mid-game state; players can resume after a page reload (grid and room are
  restored from localStorage via `game_state`), but not across restarts.
- **Leaderboard is persisted** in a SQLite database at `sb-server/data/bingolfy.db`
  (JPA, `ddl-auto=update`).

