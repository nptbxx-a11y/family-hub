# Sushi Battleships — Design Spec
**Date:** 2026-05-10  
**Status:** Approved

---

## Overview

A real-time two-player Battleships game built into the Family Hub app, playable by Ozzy and Tommy on separate devices. Sushi-themed: ships are sushi pieces, hits are marked with chopsticks 🥢, misses with the annoyed face 😤.

---

## The Fleet

| Ship | Emoji | Size |
|---|---|---|
| Dragon Roll | 🐉 | 5 |
| Fatty Tuna | 🍣 | 4 |
| Prawn Tempura | 🦐 | 3 |
| Onigiri | 🍙 | 2 |
| Edamame | 🫛 | 1 |

---

## Visual Design

- **Grid:** 10×10, light grey background (`#e8e8e8`), white cells with a light grey border (`#ccc`)
- **Placed ship cell:** light blue tint (`#dff0ff`), blue border (`#7ab8e0`), ship emoji shown
- **Hit cell:** red tint (`#fff0f0`), red border (`#e07a7a`), 🥢 emoji
- **Miss cell:** neutral grey tint (`#f0f0f0`), grey border (`#bbb`), 😤 emoji
- **Sunk ship:** all cells of that ship reveal their emoji on the opponent's attack grid

---

## Game Flow

### Phase 1 — Lobby (`status: waiting`)
- Either player opens `/battleships`
- If no active game exists (status `waiting`, `placing`, or `playing`), show a "Start New Game" button
- Starting creates a new `battleships_games` row with `status: waiting`
- The other player opens the page, sees a "Join Game ⚔️" button, and taps it to join
- Joining sets the second player as confirmed and advances status to `placing`

### Phase 2 — Placement (`status: placing`)
- Each player sees their own 10×10 grid and a fleet panel listing unplaced ships
- Tap a ship in the fleet panel to select it
- Tap a cell on the grid to place it — ship extends horizontally from that cell by default
- Tap a placed ship on the grid to toggle its orientation (horizontal ↔ vertical)
- Ships cannot overlap or extend off the grid
- Once all 5 ships are placed, a "Ready! 🍣" button appears
- Tapping Ready sets `ozzy_ready` or `tommy_ready` to true
- When both are ready, status advances to `playing`; first turn assigned randomly

### Phase 3 — Battle (`status: playing`)
- Screen shows two grids stacked vertically:
  - **Your fleet (top):** your ship placements + opponent's shots on you (🥢 or 😤)
  - **Attack grid (bottom):** your shots on the opponent (🥢 or 😤), ships hidden until sunk
- On your turn: tap any un-shot cell on the attack grid to fire
  - A hit is detected by checking if the target cell is occupied in the opponent's ships data
  - Shot appended to `ozzy_shots` or `tommy_shots` with `{row, col, hit: bool}`
  - `current_turn` flips to the other player
- On the opponent's turn: attack grid is locked, status message reads "Waiting for [Name]..."
- When all cells of a ship are hit, that ship is considered sunk — its emoji is revealed on the attack grid

### Phase 4 — Victory (`status: finished`)
- When all of a player's ships are fully sunk, `winner` is set and `status` set to `finished`
- Both players see a win/lose screen with the winner's name
- A "Play Again 🍣" button creates a fresh game row (back to Phase 1)

---

## Data Model

### Table: `battleships_games`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `status` | text | `waiting` \| `placing` \| `playing` \| `finished` |
| `ozzy_ships` | jsonb | `[{name, emoji, cells: [{row, col}]}]` — null until placed |
| `tommy_ships` | jsonb | Same structure |
| `ozzy_shots` | jsonb | `[{row, col, hit: bool}]` — empty array initially |
| `tommy_shots` | jsonb | Same structure |
| `ozzy_ready` | boolean | Default false |
| `tommy_ready` | boolean | Default false |
| `current_turn` | text | `ozzy` \| `tommy` — set when playing begins |
| `winner` | text | `ozzy` \| `tommy` \| null |
| `created_at` | timestamptz | Auto-set |

RLS disabled (consistent with all other tables in the app).

Both players subscribe to the game row via `supabase.channel()` on `battleships_games` filtered by `id`. Any update (shot fired, ready status, turn change) triggers a realtime refresh on both devices.

---

## Architecture

### New files
- `src/components/Battleships.jsx` — top-level orchestrator; reads auth to determine player identity (ozzy vs tommy), manages Supabase subscription, renders correct phase
- `src/components/BattleshipsGrid.jsx` — reusable 10×10 grid component; accepts a `cells` prop (2D array of cell state objects) and an `onCellClick` handler
- `src/components/BattleshipsPlacement.jsx` — placement phase UI; fleet panel + grid + ready button
- `src/components/BattleshipsGame.jsx` — battle phase UI; two grids + turn indicator + firing logic
- `src/components/Battleships.css` — all styles

### Changes to existing files
- `src/App.jsx` — add lazy import for `Battleships` and `/battleships` route
- `src/components/NavBar.jsx` — add Battleships nav link

### Player identity
The app uses Supabase auth. Ozzy and Tommy have fixed email addresses. `Battleships.jsx` reads `session.user.email` and maps it to `ozzy` or `tommy` to know which columns to read/write.

### Turn enforcement
Turn enforcement is soft — the UI disables the attack grid when it's not your turn. Since this is a private two-user app, there's no need for server-side turn validation.

---

## Out of Scope
- Spectator mode
- Game history / stats
- Chat during game
- Sound effects
- Animations (beyond CSS transitions on hit/miss reveal)
