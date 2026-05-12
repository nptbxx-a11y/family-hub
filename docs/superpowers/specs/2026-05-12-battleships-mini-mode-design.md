# Battleships Mini Mode Design
**Date:** 2026-05-12

## Overview

Add a second game mode to Sushi Battleships: a quick 6×6 Mini game alongside the existing 10×10 Regular game. Mode is chosen by the creator at game creation and persists for both players throughout the game.

## Database

Add one column to `battleships_games`:

```sql
ALTER TABLE battleships_games ADD COLUMN mode TEXT NOT NULL DEFAULT 'regular';
```

- `'regular'` — 10×10 grid, existing 5-ship fleet
- `'mini'` — 6×6 grid, 4-ship fleet
- Existing rows default to `'regular'`, no migration needed

## Fleets

**Regular (10×10):** Dragon Roll (5), Fatty Tuna (4), Prawn Tempura (3), Onigiri (2), Edamame (1)

**Mini (6×6):** Fatty Tuna (4), Prawn Tempura (3), Onigiri (2), Edamame (1)

## UI — Mode Selection

The "No active game" lobby screen shows two equal-width side-by-side buttons instead of one:

```
[ Full Game 🍣 ]  [ Mini 🍱 ]
```

The joining player sees no mode choice — they just join the game the creator started. The mode is already stored in the DB row.

## Component Changes

### `Battleships.jsx`
- `handleNewGame(mode)` — takes `mode` param, inserts `{ mode }` into `battleships_games`
- Lobby screen: two equal-width buttons calling `handleNewGame('regular')` and `handleNewGame('mini')`
- Pass `mode={game.mode}` to both `<BattleshipsPlacement>` and `<BattleshipsGame>`

### `BattleshipsPlacement.jsx`
- Accept `mode` prop
- Define `MINI_FLEET` constant (4 ships for 6×6)
- `emptyGrid(size)` parameterised — takes size, creates size×size array
- Derive `gridSize` (6 or 10) and active fleet from `mode`
- Replace all hardcoded `10` bounds checks with `gridSize`

### `BattleshipsGame.jsx`
- Accept `mode` prop
- Same `emptyGrid(size)` parameterisation
- Derive `gridSize` from `mode`
- `COL_LABELS` array lookup already works for both sizes (just indexes 0–5 for mini)
- Bounds guard (`shot.row >= gridSize`) updated from hardcoded `10`

### `BattleshipsGrid.jsx`
- Column header: change `COL_LABELS.map(...)` to `COL_LABELS.slice(0, cells[0]?.length ?? 10).map(...)` so it matches the actual grid width passed in
- No other changes needed — row rendering already derives from the cells array

## Approach

Option A: pass `mode` as a prop, each component derives `gridSize` and fleet locally. No new shared utility needed — the logic is simple enough to inline.
