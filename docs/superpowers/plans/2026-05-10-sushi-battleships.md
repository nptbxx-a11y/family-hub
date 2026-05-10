# Sushi Battleships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time two-player sushi-themed Battleships game for Ozzy and Tommy, integrated into the Family Hub app at `/battleships`.

**Architecture:** Game state lives in a single `battleships_games` Supabase row. Both players subscribe to that row via a realtime channel. `Battleships.jsx` is the top-level orchestrator — it identifies the logged-in player by email, fetches the active game, and renders one of four phases (lobby → placement → battle → victory) based on `status`. Phase-specific child components receive game state as props and call handler functions to update Supabase.

**Tech Stack:** React 19, Vite, Supabase (postgres + realtime), React Router v7, Framer Motion (already installed), Nunito font, CSS custom properties from `src/index.css`.

---

## File Map

**Create:**
- `src/components/BattleshipsGrid.jsx` — reusable 10×10 grid, renders cell states
- `src/components/BattleshipsPlacement.jsx` — ship placement phase UI
- `src/components/BattleshipsGame.jsx` — battle phase UI (two grids + firing)
- `src/components/Battleships.jsx` — orchestrator: auth, Supabase, phase routing
- `src/components/Battleships.css` — all styles for the above

**Modify:**
- `src/App.jsx` — add lazy import + `/battleships` route inside `AnimatedRoutes`
- `src/components/NavBar.jsx` — add `⚔️ Battleships` sidebar NavLink

---

## Task 1: Create the Supabase table

**Files:** No local files — uses Supabase MCP tools directly.

- [ ] **Step 1: Create the battleships_games table**

Use `mcp__claude_ai_Supabase__execute_sql` with this SQL:

```sql
CREATE TABLE battleships_games (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status       text        NOT NULL DEFAULT 'waiting',
  created_by   text,
  ozzy_ships   jsonb,
  tommy_ships  jsonb,
  ozzy_shots   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  tommy_shots  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ozzy_ready   boolean     NOT NULL DEFAULT false,
  tommy_ready  boolean     NOT NULL DEFAULT false,
  current_turn text,
  winner       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Disable RLS**

```sql
ALTER TABLE battleships_games DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Verify**

Run `mcp__claude_ai_Supabase__list_tables` and confirm `battleships_games` appears.

- [ ] **Step 4: Commit a migration note**

```bash
git commit --allow-empty -m "feat: create battleships_games table in Supabase"
```

---

## Task 2: Look up player emails

The orchestrator maps the logged-in user's email to `'ozzy'` or `'tommy'`. Do this now so the constant is ready for Task 7.

**Files:** Result used in `src/components/Battleships.jsx` (Task 7).

- [ ] **Step 1: Query auth users**

Use `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT id, email FROM auth.users ORDER BY created_at;
```

- [ ] **Step 2: Note both emails**

Record which email belongs to Ozzy and which to Tommy. These will be inserted into the `PLAYERS` constant in Task 7 Step 1.

---

## Task 3: BattleshipsGrid.jsx

Reusable grid component used in both placement and battle phases.

**Files:**
- Create: `src/components/BattleshipsGrid.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/BattleshipsGrid.jsx
const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

export default function BattleshipsGrid({ cells, onCellClick, interactive = false }) {
  return (
    <div className="bs-grid">
      <div className="bs-grid-row bs-grid-header">
        <div className="bs-cell-label" />
        {COL_LABELS.map(l => (
          <div key={l} className="bs-cell-label">{l}</div>
        ))}
      </div>
      {cells.map((row, r) => (
        <div key={r} className="bs-grid-row">
          <div className="bs-cell-label">{r + 1}</div>
          {row.map((cell, c) => (
            <div
              key={c}
              className={[
                'bs-cell',
                `bs-cell--${cell.state}`,
                interactive && cell.state === 'empty' ? 'bs-cell--clickable' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => interactive && onCellClick?.(r, c)}
            >
              {cell.emoji}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BattleshipsGrid.jsx
git commit -m "feat: add BattleshipsGrid reusable component"
```

---

## Task 4: Battleships.css

All styles for every Battleships component.

**Files:**
- Create: `src/components/Battleships.css`

- [ ] **Step 1: Create the stylesheet**

```css
/* src/components/Battleships.css */

/* ── Page wrapper ── */
.bs-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
  font-family: 'Nunito', sans-serif;
}
.bs-page h2 {
  color: var(--green-dark);
  margin-bottom: 8px;
  text-align: center;
}

/* ── Grid ── */
.bs-grid {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  background: #e8e8e8;
  border-radius: 10px;
  padding: 8px;
}
.bs-grid-row {
  display: flex;
  gap: 3px;
}
.bs-cell-label {
  width: 20px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
}
.bs-cell {
  width: 34px;
  height: 34px;
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-sizing: border-box;
  transition: background 0.12s, border-color 0.12s;
  user-select: none;
  -webkit-user-select: none;
}
.bs-cell--ship   { background: #dff0ff; border-color: #7ab8e0; }
.bs-cell--hit    { background: #fff0f0; border-color: #e07a7a; }
.bs-cell--miss   { background: #f0f0f0; border-color: #bbb; }
.bs-cell--clickable { cursor: pointer; }
.bs-cell--clickable:active { background: #e8f4ff; border-color: #7ab8e0; }

/* ── Lobby ── */
.bs-lobby {
  text-align: center;
  padding: 40px 0;
}
.bs-lobby p {
  color: #888;
  margin-bottom: 24px;
}
.bs-lobby-btn {
  background: var(--green-dark);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 14px 32px;
  font-size: 18px;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  margin-bottom: 12px;
}
.bs-lobby-waiting {
  color: #888;
  font-size: 15px;
}

/* ── Placement ── */
.bs-placement {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.bs-placement-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.bs-fleet-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.bs-fleet-title {
  font-size: 13px;
  font-weight: 700;
  color: #666;
  margin: 0 0 4px;
}
.bs-fleet-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.bs-fleet-item--selected { border-color: var(--green-dark); background: #f0fff0; }
.bs-fleet-item--placed   { border-color: #7ab8e0; background: #dff0ff; cursor: default; }
.bs-fleet-name { font-size: 13px; color: #444; flex: 1; }
.bs-remove-btn {
  background: none;
  border: none;
  color: #e07a7a;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
}
.bs-rotate-btn {
  background: var(--purple);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start;
}
.bs-ready-btn {
  background: var(--green-dark);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 14px 40px;
  font-size: 18px;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  cursor: pointer;
}

/* ── Battle ── */
.bs-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.bs-turn-indicator {
  background: var(--green-dark);
  color: #fff;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}
.bs-game-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bs-section-label {
  font-size: 13px;
  color: #888;
  margin: 0 0 6px;
  text-align: center;
}

/* ── Waiting message ── */
.bs-waiting-msg {
  text-align: center;
  color: #888;
  font-size: 15px;
  padding: 40px 0;
  line-height: 1.6;
}

/* ── Victory ── */
.bs-victory {
  text-align: center;
  padding: 40px 0;
}
.bs-victory-emoji { font-size: 64px; margin-bottom: 12px; }
.bs-victory h2 { font-size: 26px; margin-bottom: 8px; }
.bs-victory p { color: #888; margin-bottom: 8px; }
.bs-play-again-btn {
  background: var(--green-dark);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 14px 32px;
  font-size: 18px;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  cursor: pointer;
  margin-top: 20px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Battleships.css
git commit -m "feat: add Battleships CSS"
```

---

## Task 5: BattleshipsPlacement.jsx

Ship placement phase. Shows fleet panel + grid. Handles tap-to-place and rotate.

**Files:**
- Create: `src/components/BattleshipsPlacement.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/BattleshipsPlacement.jsx
import { useState } from 'react';
import BattleshipsGrid from './BattleshipsGrid';

const FLEET = [
  { name: 'Dragon Roll',   emoji: '🐉', size: 5 },
  { name: 'Fatty Tuna',    emoji: '🍣', size: 4 },
  { name: 'Prawn Tempura', emoji: '🦐', size: 3 },
  { name: 'Onigiri',       emoji: '🍙', size: 2 },
  { name: 'Edamame',       emoji: '🫛', size: 1 },
];

function emptyGrid() {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ state: 'empty', emoji: null }))
  );
}

export default function BattleshipsPlacement({ playerName, onReady }) {
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [orientation, setOrientation] = useState('h');

  function buildCells() {
    const cells = emptyGrid();
    for (const ship of placedShips) {
      for (const { row, col } of ship.cells) {
        cells[row][col] = { state: 'ship', emoji: ship.emoji };
      }
    }
    return cells;
  }

  function handleCellClick(row, col) {
    if (!selectedShip) return;
    const shipCells = [];
    for (let i = 0; i < selectedShip.size; i++) {
      const r = orientation === 'h' ? row     : row + i;
      const c = orientation === 'h' ? col + i : col;
      if (r >= 10 || c >= 10) return;
      shipCells.push({ row: r, col: c });
    }
    const occupied = placedShips.flatMap(s => s.cells);
    for (const { row: r, col: c } of shipCells) {
      if (occupied.some(o => o.row === r && o.col === c)) return;
    }
    setPlacedShips(prev => [
      ...prev,
      { name: selectedShip.name, emoji: selectedShip.emoji, cells: shipCells },
    ]);
    setSelectedShip(null);
  }

  function removeShip(name) {
    setPlacedShips(prev => prev.filter(s => s.name !== name));
  }

  const unplaced = FLEET.filter(f => !placedShips.some(p => p.name === f.name));
  const allPlaced = unplaced.length === 0;
  const displayName = playerName === 'ozzy' ? 'Ozzy' : 'Tommy';

  return (
    <div className="bs-page bs-placement">
      <h2>Place your fleet!</h2>
      <p style={{ textAlign: 'center', color: '#888', marginTop: -4, marginBottom: 0 }}>
        {displayName}, hide your sushi 🍣
      </p>
      <div className="bs-placement-layout">
        <div className="bs-fleet-panel">
          <p className="bs-fleet-title">Tap a ship, then tap the grid to place it:</p>
          {unplaced.map(ship => (
            <div
              key={ship.name}
              className={`bs-fleet-item${selectedShip?.name === ship.name ? ' bs-fleet-item--selected' : ''}`}
              onClick={() => setSelectedShip(ship)}
            >
              <span>{ship.emoji.repeat(ship.size)}</span>
              <span className="bs-fleet-name">{ship.name} ({ship.size})</span>
            </div>
          ))}
          {placedShips.map(ship => (
            <div key={ship.name} className="bs-fleet-item bs-fleet-item--placed">
              <span>{ship.emoji.repeat(ship.cells.length)}</span>
              <span className="bs-fleet-name">{ship.name} ✓</span>
              <button className="bs-remove-btn" onClick={() => removeShip(ship.name)}>✕</button>
            </div>
          ))}
          {selectedShip && (
            <button
              className="bs-rotate-btn"
              onClick={() => setOrientation(o => (o === 'h' ? 'v' : 'h'))}
            >
              Rotate {orientation === 'h' ? '↕ vertical' : '↔ horizontal'}
            </button>
          )}
        </div>
        <BattleshipsGrid
          cells={buildCells()}
          onCellClick={handleCellClick}
          interactive={!!selectedShip}
        />
      </div>
      {allPlaced && (
        <button className="bs-ready-btn" onClick={() => onReady(placedShips)}>
          Ready! 🍣
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BattleshipsPlacement.jsx
git commit -m "feat: add BattleshipsPlacement component"
```

---

## Task 6: BattleshipsGame.jsx

Battle phase. Two grids: your fleet (top) + attack grid (bottom). Handles firing.

**Files:**
- Create: `src/components/BattleshipsGame.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/BattleshipsGame.jsx
import BattleshipsGrid from './BattleshipsGrid';

function emptyGrid() {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ state: 'empty', emoji: null }))
  );
}

export default function BattleshipsGame({ game, playerKey, opponentKey, onShot }) {
  const myShips  = game[`${playerKey}_ships`]   || [];
  const oppShips = game[`${opponentKey}_ships`] || [];
  const myShots  = game[`${playerKey}_shots`]   || [];
  const oppShots = game[`${opponentKey}_shots`] || [];
  const isMyTurn = game.current_turn === playerKey;
  const opponentName = opponentKey === 'ozzy' ? 'Ozzy' : 'Tommy';

  function buildMyFleetCells() {
    const cells = emptyGrid();
    for (const ship of myShips) {
      for (const { row, col } of ship.cells) {
        cells[row][col] = { state: 'ship', emoji: ship.emoji };
      }
    }
    for (const shot of oppShots) {
      cells[shot.row][shot.col] = {
        state: shot.hit ? 'hit' : 'miss',
        emoji: shot.hit ? '🥢' : '😤',
      };
    }
    return cells;
  }

  function buildAttackCells() {
    const cells = emptyGrid();
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
      cells[shot.row][shot.col] = {
        state: shot.hit ? 'hit' : 'miss',
        emoji: shot.hit ? '🥢' : '😤',
      };
    }
    return cells;
  }

  function handleAttackCell(row, col) {
    if (!isMyTurn) return;
    if (myShots.some(s => s.row === row && s.col === col)) return;
    const hit = oppShips.some(ship =>
      ship.cells.some(c => c.row === row && c.col === col)
    );
    onShot(row, col, hit);
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
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BattleshipsGame.jsx
git commit -m "feat: add BattleshipsGame component"
```

---

## Task 7: Battleships.jsx — orchestrator

Top-level component. Identifies player, fetches active game, subscribes to realtime, routes between phases.

**Files:**
- Create: `src/components/Battleships.jsx`

- [ ] **Step 1: Fill in actual player emails**

Replace `OZZY_EMAIL_HERE` and `TOMMY_EMAIL_HERE` with the real emails from Task 2.

- [ ] **Step 2: Create the component**

```jsx
// src/components/Battleships.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import BattleshipsPlacement from './BattleshipsPlacement';
import BattleshipsGame from './BattleshipsGame';
import './Battleships.css';

// Populated from Task 2: auth.users query
const PLAYERS = {
  'OZZY_EMAIL_HERE':  'ozzy',
  'TOMMY_EMAIL_HERE': 'tommy',
};

function getOpponentKey(key) {
  return key === 'ozzy' ? 'tommy' : 'ozzy';
}

function displayName(key) {
  return key === 'ozzy' ? 'Ozzy' : 'Tommy';
}

export default function Battleships() {
  const [game, setGame]           = useState(null);
  const [playerKey, setPlayerKey] = useState(null);
  const [loading, setLoading]     = useState(true);

  // Identify player + fetch active game on mount
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const key = PLAYERS[session?.user?.email] || null;
      setPlayerKey(key);

      const { data } = await supabase
        .from('battleships_games')
        .select('*')
        .in('status', ['waiting', 'placing', 'playing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setGame(data || null);
      setLoading(false);
    }
    init();
  }, []);

  // Subscribe to realtime updates whenever the game id changes
  useEffect(() => {
    if (!game?.id) return;
    const channel = supabase
      .channel(`battleships:${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'battleships_games', filter: `id=eq.${game.id}` },
        payload => setGame(payload.new)
      )
      .subscribe();
    return () => channel.unsubscribe();
  }, [game?.id]);

  async function handleNewGame() {
    const { data } = await supabase
      .from('battleships_games')
      .insert({ status: 'waiting', created_by: playerKey })
      .select()
      .single();
    setGame(data);
  }

  async function handleJoin() {
    const { data } = await supabase
      .from('battleships_games')
      .update({ status: 'placing' })
      .eq('id', game.id)
      .select()
      .single();
    setGame(data);
  }

  async function handleReady(ships) {
    const oppKey              = getOpponentKey(playerKey);
    const opponentAlreadyReady = game[`${oppKey}_ready`];
    await supabase
      .from('battleships_games')
      .update({
        [`${playerKey}_ships`]: ships,
        [`${playerKey}_ready`]: true,
        ...(opponentAlreadyReady ? {
          status: 'playing',
          current_turn: Math.random() < 0.5 ? 'ozzy' : 'tommy',
        } : {}),
      })
      .eq('id', game.id);
  }

  async function handleShot(row, col, hit) {
    const oppKey   = getOpponentKey(playerKey);
    const newShots = [...(game[`${playerKey}_shots`] || []), { row, col, hit }];
    const oppShips = game[`${oppKey}_ships`] || [];
    const allSunk  = oppShips.every(ship =>
      ship.cells.every(c => newShots.some(s => s.row === c.row && s.col === c.col && s.hit))
    );
    await supabase
      .from('battleships_games')
      .update({
        [`${playerKey}_shots`]: newShots,
        current_turn: oppKey,
        ...(allSunk ? { winner: playerKey, status: 'finished' } : {}),
      })
      .eq('id', game.id);
  }

  async function handlePlayAgain() {
    await supabase
      .from('battleships_games')
      .update({ status: 'finished' })
      .eq('id', game.id);
    setGame(null);
  }

  if (loading) {
    return <div className="bs-page"><p className="bs-waiting-msg">Loading...</p></div>;
  }
  if (!playerKey) {
    return <div className="bs-page"><p className="bs-waiting-msg">Unknown player — try logging out and back in.</p></div>;
  }

  // ── Victory ──
  if (game?.status === 'finished') {
    const won = game.winner === playerKey;
    return (
      <div className="bs-page bs-victory">
        <div className="bs-victory-emoji">{won ? '🏆' : '😢'}</div>
        <h2>{won ? 'You won!' : `${displayName(game.winner)} wins!`}</h2>
        <p>{won ? 'All their sushi is eaten! 🍣' : 'Better luck next time!'}</p>
        <button className="bs-play-again-btn" onClick={handlePlayAgain}>Play Again 🍣</button>
      </div>
    );
  }

  // ── Battle ──
  if (game?.status === 'playing') {
    return (
      <BattleshipsGame
        game={game}
        playerKey={playerKey}
        opponentKey={getOpponentKey(playerKey)}
        onShot={handleShot}
      />
    );
  }

  // ── Placement — already ready, waiting for opponent ──
  if (game?.status === 'placing' && game[`${playerKey}_ready`]) {
    const oppReady = game[`${getOpponentKey(playerKey)}_ready`];
    return (
      <div className="bs-page">
        <h2>⚔️ Sushi Battleships</h2>
        <p className="bs-waiting-msg">
          {oppReady
            ? 'Both ready — battle starting! 🍣'
            : <><span>Fleet hidden ✅</span><br /><span>Waiting for {displayName(getOpponentKey(playerKey))} to place their fleet...</span></>}
        </p>
      </div>
    );
  }

  // ── Placement — place your ships ──
  if (game?.status === 'placing') {
    return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} />;
  }

  // ── Waiting lobby — you created the game ──
  if (game?.status === 'waiting' && game.created_by === playerKey) {
    return (
      <div className="bs-page bs-lobby">
        <h2>⚔️ Sushi Battleships</h2>
        <p className="bs-lobby-waiting">
          ⏳ Waiting for {displayName(getOpponentKey(playerKey))} to join...
        </p>
      </div>
    );
  }

  // ── Waiting lobby — opponent created, you can join ──
  if (game?.status === 'waiting') {
    return (
      <div className="bs-page bs-lobby">
        <h2>⚔️ Sushi Battleships</h2>
        <p>{displayName(game.created_by)} started a new game!</p>
        <button className="bs-lobby-btn" onClick={handleJoin}>Join Game ⚔️</button>
      </div>
    );
  }

  // ── No active game ──
  return (
    <div className="bs-page bs-lobby">
      <h2>⚔️ Sushi Battleships</h2>
      <p>A fishy battle awaits... 🍣</p>
      <button className="bs-lobby-btn" onClick={handleNewGame}>New Game 🍣</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Battleships.jsx
git commit -m "feat: add Battleships orchestrator component"
```

---

## Task 8: Wire into App.jsx and NavBar.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/NavBar.jsx`

- [ ] **Step 1: Add lazy import to App.jsx**

After the existing `WildlifeSpotter` lazy import line, add:

```jsx
const Battleships = lazy(() => import("./components/Battleships"));
```

- [ ] **Step 2: Add route to App.jsx**

Inside `AnimatedRoutes`, after the `/wildlife` route, add:

```jsx
<Route path="/battleships" element={<Battleships />} />
```

- [ ] **Step 3: Add NavLink to NavBar.jsx**

Inside the `sidebar-nav` block, after the Wildlife Spotter NavLink, add:

```jsx
<NavLink
  to="/battleships"
  className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
  onClick={() => setOpen(false)}
>
  ⚔️ Battleships
</NavLink>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/NavBar.jsx
git commit -m "feat: wire Battleships into app routing and navigation"
```

---

## Task 9: Build verification and deploy

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected: clean build, no errors. A chunk-size warning for the Battleships chunk is acceptable.

- [ ] **Step 2: Push to GitHub to trigger Vercel deploy**

```bash
git push
```

- [ ] **Step 3: Smoke-test on device**

Open the deployed app on two separate devices (or two browser tabs logged in as different users):
1. Player 1 taps ⚔️ Battleships → taps "New Game 🍣"
2. Player 2 taps ⚔️ Battleships → sees "X started a new game!" → taps "Join Game ⚔️"
3. Both enter placement phase — place all 5 ships and tap "Ready! 🍣"
4. Battle phase begins — verify turn indicator, 🥢 hits, 😤 misses appear on both screens in real time
5. Sink all opponent ships → verify victory screen and "Play Again 🍣"
