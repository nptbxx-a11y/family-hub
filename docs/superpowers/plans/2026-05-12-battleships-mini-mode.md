# Battleships Mini Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6×6 Mini game mode to Sushi Battleships alongside the existing 10×10 Regular mode.

**Architecture:** A `mode` column is added to `battleships_games` in Supabase. The creator picks mode at game creation via two equal-width buttons. `Battleships.jsx` passes `mode` down to `BattleshipsPlacement` and `BattleshipsGame`, which derive `gridSize` and fleet locally. `BattleshipsGrid` is made mode-agnostic by deriving column count from the cells array.

**Tech Stack:** React 19, Vite, Supabase (MCP tools), no test framework configured.

---

## Files

| File | Change |
|------|--------|
| `battleships_games` (Supabase) | Add `mode TEXT NOT NULL DEFAULT 'regular'` column |
| `src/components/BattleshipsGrid.jsx` | Dynamic column header from cells width |
| `src/components/BattleshipsPlacement.jsx` | Accept `mode`, parameterise fleet + grid size |
| `src/components/BattleshipsGame.jsx` | Accept `mode`, parameterise grid size |
| `src/components/Battleships.jsx` | Two mode buttons, pass `mode` to children |
| `src/components/Battleships.css` | Style for two-button mode row |

---

## Task 1: Add `mode` column to Supabase

**Files:**
- Modify: `battleships_games` table (Supabase MCP)

- [ ] **Step 1: Apply migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__execute_sql` with the family-hub project. SQL:

```sql
ALTER TABLE battleships_games
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'regular';
```

Expected: no error; column added.

- [ ] **Step 2: Verify column exists**

Run via Supabase MCP:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'battleships_games' AND column_name = 'mode';
```

Expected: one row — `mode | text | 'regular'`.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: add mode column to battleships_games (Supabase migration)"
```

---

## Task 2: Fix BattleshipsGrid column header

**Files:**
- Modify: `src/components/BattleshipsGrid.jsx`

Currently the header always renders 10 column labels (`COL_LABELS.map(...)`). Change it to slice to the actual cell count.

- [ ] **Step 1: Update BattleshipsGrid.jsx**

Replace the entire file with:

```jsx
// src/components/BattleshipsGrid.jsx
const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

export default function BattleshipsGrid({ cells, onCellClick, interactive = false, pendingCell = null }) {
  const colCount = cells[0]?.length ?? 10;
  return (
    <div className="bs-grid">
      <div className="bs-grid-row bs-grid-header">
        <div className="bs-cell-label" />
        {COL_LABELS.slice(0, colCount).map(l => (
          <div key={l} className="bs-cell-label">{l}</div>
        ))}
      </div>
      {cells.map((row, r) => (
        <div key={r} className="bs-grid-row">
          <div className="bs-cell-label">{r + 1}</div>
          {row.map((cell, c) => {
            const isPending = pendingCell?.row === r && pendingCell?.col === c;
            return (
              <div
                key={c}
                className={[
                  'bs-cell',
                  isPending ? 'bs-cell--pending' : `bs-cell--${cell.state}`,
                  interactive && (cell.state === 'empty' || isPending) ? 'bs-cell--clickable' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => interactive && onCellClick?.(r, c)}
              >
                {cell.emoji}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BattleshipsGrid.jsx
git commit -m "fix: derive BattleshipsGrid column count from cells array"
```

---

## Task 3: Parameterise BattleshipsPlacement

**Files:**
- Modify: `src/components/BattleshipsPlacement.jsx`

Three targeted edits — do NOT rewrite the whole file (emoji characters in the existing FLEET constant must be preserved exactly as-is).

- [ ] **Step 1: Add MINI_FLEET constant and parameterise emptyGrid**

After the closing `];` of the existing `FLEET` constant, add:

```jsx
const MINI_FLEET = FLEET.filter(ship => ship.name !== 'Dragon Roll');

function emptyGrid(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ state: 'empty', emoji: null }))
  );
}
```

Then delete the original `function emptyGrid()` (the one with the hardcoded 10) — it is replaced by the parameterised version above.

- [ ] **Step 2: Update the component signature and derive gridSize/fleet**

Find the component signature line:
```jsx
export default function BattleshipsPlacement({ playerName, onReady }) {
```

Replace with:
```jsx
export default function BattleshipsPlacement({ playerName, onReady, mode = 'regular' }) {
  const gridSize   = mode === 'mini' ? 6 : 10;
  const activeFleet = mode === 'mini' ? MINI_FLEET : FLEET;
```

- [ ] **Step 3: Use gridSize and activeFleet throughout the component**

Replace the two uses of hardcoded `10` in `handleCellClick`:
```jsx
      if (r >= 10 || c >= 10) return;
```
→
```jsx
      if (r >= gridSize || c >= gridSize) return;
```

Replace `buildCells` to call `emptyGrid(gridSize)`:
```jsx
  function buildCells() {
    const cells = emptyGrid(gridSize);
```

Replace the `unplaced` and `allPlaced` lines to use `activeFleet`:
```jsx
  const unplaced  = activeFleet.filter(f => !placedShips.some(p => p.name === f.name));
  const allPlaced = unplaced.length === 0;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BattleshipsPlacement.jsx
git commit -m "feat: parameterise BattleshipsPlacement for mini mode (6x6)"
```

---

## Task 4: Parameterise BattleshipsGame

**Files:**
- Modify: `src/components/BattleshipsGame.jsx`

Accept `mode` prop, parameterise `emptyGrid(size)`, replace hardcoded `10` bounds checks with `gridSize`.

- [ ] **Step 1: Replace BattleshipsGame.jsx**

```jsx
// src/components/BattleshipsGame.jsx
import { useState } from 'react';
import BattleshipsGrid from './BattleshipsGrid';

const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

function emptyGrid(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ state: 'empty', emoji: null }))
  );
}

export default function BattleshipsGame({ game, playerKey, opponentKey, onShot, mode = 'regular' }) {
  const gridSize = mode === 'mini' ? 6 : 10;
  const [pendingShot, setPendingShot] = useState(null);

  const myShips  = game[`${playerKey}_ships`]   || [];
  const oppShips = game[`${opponentKey}_ships`] || [];
  const myShots  = game[`${playerKey}_shots`]   || [];
  const oppShots = game[`${opponentKey}_shots`] || [];
  const isMyTurn = game.current_turn === playerKey;
  const opponentName = opponentKey === 'ozzy' ? 'Ozzy' : 'Tommy';

  function buildMyFleetCells() {
    const cells = emptyGrid(gridSize);
    for (const ship of myShips) {
      for (const { row, col } of ship.cells) {
        cells[row][col] = { state: 'ship', emoji: ship.emoji };
      }
    }
    for (const shot of oppShots) {
      if (shot.row < 0 || shot.row >= gridSize || shot.col < 0 || shot.col >= gridSize) continue;
      cells[shot.row][shot.col] = {
        state: shot.hit ? 'hit' : 'miss',
        emoji: shot.hit ? '🥢' : '😤',
      };
    }
    return cells;
  }

  function buildAttackCells() {
    const cells = emptyGrid(gridSize);
    for (const ship of oppShips) {
      const sunk = ship.cells.every(c =>
        myShots.some(s => s.row === c.row && s.col === c.col && s.hit)
      );
      if (sunk) {
        for (const { row, col } of ship.cells) {
          cells[row][col] = { state: 'ship', emoji: ship.emoji };
        }
      }
    }
    for (const shot of myShots) {
      if (shot.row < 0 || shot.row >= gridSize || shot.col < 0 || shot.col >= gridSize) continue;
      if (shot.hit && cells[shot.row][shot.col].state === 'ship') {
        cells[shot.row][shot.col].state = 'hit';
      } else {
        cells[shot.row][shot.col] = {
          state: shot.hit ? 'hit' : 'miss',
          emoji: shot.hit ? '🥢' : '😤',
        };
      }
    }
    return cells;
  }

  function handleAttackCell(row, col) {
    if (!isMyTurn) return;
    if (myShots.some(s => s.row === row && s.col === col)) return;
    if (pendingShot?.row === row && pendingShot?.col === col) {
      setPendingShot(null);
      return;
    }
    setPendingShot({ row, col });
  }

  function handleConfirmShot() {
    if (!pendingShot) return;
    const { row, col } = pendingShot;
    const hit = oppShips.some(ship =>
      ship.cells.some(c => c.row === row && c.col === col)
    );
    setPendingShot(null);
    onShot(row, col, hit);
  }

  function handleCancelShot() {
    setPendingShot(null);
  }

  return (
    <div className="bs-page bs-game">
      <div className="bs-turn-indicator">
        {isMyTurn ? '🍣 Your turn — tap to fire!' : `⏳ Waiting for ${opponentName}...`}
      </div>
      <div className="bs-game-section">
        <h3 className="bs-section-label">Your fleet</h3>
        <BattleshipsGrid cells={buildMyFleetCells()} interactive={false} />
      </div>
      <div className="bs-game-section">
        <h3 className="bs-section-label">Attack!</h3>
        <BattleshipsGrid
          cells={buildAttackCells()}
          onCellClick={handleAttackCell}
          interactive={isMyTurn}
          pendingCell={pendingShot}
        />
        {pendingShot && (
          <div className="bs-confirm-banner">
            <span>Fire at {COL_LABELS[pendingShot.col]}{pendingShot.row + 1}? 🎯</span>
            <div className="bs-confirm-buttons">
              <button className="bs-confirm-btn" onClick={handleConfirmShot}>Strike! 🥢</button>
              <button className="bs-cancel-btn" onClick={handleCancelShot}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BattleshipsGame.jsx
git commit -m "feat: parameterise BattleshipsGame for mini mode (6x6)"
```

---

## Task 5: Two-button lobby + pass mode through Battleships.jsx

**Files:**
- Modify: `src/components/Battleships.jsx`
- Modify: `src/components/Battleships.css`

Two changes in `Battleships.jsx`:
1. `handleNewGame(mode)` accepts and stores mode
2. `mode` passed to `<BattleshipsPlacement>` and `<BattleshipsGame>`
3. "No active game" screen shows two equal-width buttons

- [ ] **Step 1: Update handleNewGame in Battleships.jsx**

Find the existing `handleNewGame` function and replace it:

```jsx
async function handleNewGame(mode) {
  const { data } = await supabase
    .from('battleships_games')
    .insert({ status: 'waiting', created_by: playerKey, mode })
    .select()
    .single();
  setGame(data);
}
```

- [ ] **Step 2: Pass mode to BattleshipsPlacement**

Find the line:
```jsx
if (game?.status === 'placing') {
  return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} />;
}
```

Replace with:
```jsx
if (game?.status === 'placing') {
  return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} mode={game.mode} />;
}
```

- [ ] **Step 3: Pass mode to BattleshipsGame**

Find the line:
```jsx
return (
  <BattleshipsGame
    game={game}
    playerKey={playerKey}
    opponentKey={getOpponentKey(playerKey)}
    onShot={handleShot}
  />
);
```

Replace with:
```jsx
return (
  <BattleshipsGame
    game={game}
    playerKey={playerKey}
    opponentKey={getOpponentKey(playerKey)}
    onShot={handleShot}
    mode={game.mode}
  />
);
```

- [ ] **Step 4: Replace the "No active game" return with two buttons**

Find:
```jsx
// ── No active game ──
return (
  <div className="bs-page bs-lobby">
    <h2>⚔️ Sushi Battleships</h2>
    <p>A fishy battle awaits... 🍣</p>
    <button className="bs-lobby-btn" onClick={handleNewGame}>
      New Game 🍣
    </button>
  </div>
);
```

Replace with:
```jsx
// ── No active game ──
return (
  <div className="bs-page bs-lobby">
    <h2>⚔️ Sushi Battleships</h2>
    <p>A fishy battle awaits... 🍣</p>
    <div className="bs-mode-buttons">
      <button className="bs-lobby-btn" onClick={() => handleNewGame('regular')}>
        Full Game 🍣
      </button>
      <button className="bs-lobby-btn" onClick={() => handleNewGame('mini')}>
        Mini 🍱
      </button>
    </div>
  </div>
);
```

- [ ] **Step 5: Add bs-mode-buttons CSS to Battleships.css**

Append to the end of `src/components/Battleships.css`:

```css
/* Mode selection buttons */
.bs-mode-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.bs-mode-buttons .bs-lobby-btn {
  flex: 1;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Battleships.jsx src/components/Battleships.css
git commit -m "feat: add Full Game / Mini mode selection to Battleships lobby"
```

---

## Task 6: Build verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: build completes with no errors. Any TypeScript/lint errors must be fixed before continuing.

- [ ] **Step 2: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

- [ ] **Step 3: Verify on Vercel**

Open the Vercel preview URL. Check:
1. Lobby shows "Full Game 🍣" and "Mini 🍱" side by side, equal width
2. Creating a Mini game → placement screen shows a 6×6 grid with 4 ships (Fatty Tuna, Prawn Tempura, Onigiri, Edamame)
3. Creating a Regular game → placement screen shows a 10×10 grid with all 5 ships
4. Grid column headers A–F for mini, A–J for regular
5. Shot confirmation banner shows correct coordinates (e.g. "Fire at C3?")
6. Existing Regular games (if any in DB) still work
