# Battleships Exit Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "✕ Exit game" button to all active Battleships screens so either player can abandon the current game and return to the lobby.

**Architecture:** `handleExit()` in `Battleships.jsx` marks the game `finished` (no winner) in Supabase and clears local state. The other player's realtime subscription picks up the change automatically. `onExit` is passed as a prop to `BattleshipsGame` and `BattleshipsPlacement` so they can render the button inside their own page containers.

**Tech Stack:** React 19, Vite, Supabase, no test framework configured.

---

## Files

| File | Change |
|------|--------|
| `src/components/Battleships.jsx` | `handleExit()`, null-winner guard, exit buttons on 2 screens, `onExit` prop passed to children |
| `src/components/BattleshipsGame.jsx` | Accept `onExit` prop, render exit button at bottom |
| `src/components/BattleshipsPlacement.jsx` | Accept `onExit` prop, render exit button at bottom |
| `src/components/Battleships.css` | Add `.bs-exit-btn` style |

---

## Task 1: handleExit, null-winner guard, and exit buttons in Battleships.jsx

**Files:**
- Modify: `src/components/Battleships.jsx`

Read the file first to confirm exact existing content, then make these targeted edits.

- [ ] **Step 1: Add handleExit function**

After the existing `handlePlayAgain` function, add:

```jsx
async function handleExit() {
  await supabase
    .from('battleships_games')
    .update({ status: 'finished' })
    .eq('id', game.id);
  setGame(null);
}
```

- [ ] **Step 2: Add null-winner guard to the victory block**

Find the existing victory block:
```jsx
  // ── Victory ──
  if (game?.status === 'finished') {
    const won = game.winner === playerKey;
    return (
      <div className="bs-page bs-victory">
        <div className="bs-victory-emoji">{won ? '🏆' : '😢'}</div>
        <h2>{won ? 'You won!' : `${displayName(game.winner)} wins!`}</h2>
        <p>{won ? 'All their sushi is eaten! 🍣' : 'Better luck next time!'}</p>
        <button className="bs-play-again-btn" onClick={handlePlayAgain}>
          Play Again 🍣
        </button>
      </div>
    );
  }
```

Replace with:
```jsx
  // ── Victory ──
  if (game?.status === 'finished') {
    if (!game.winner) {
      return (
        <div className="bs-page bs-victory">
          <div className="bs-victory-emoji">🚪</div>
          <h2>Game abandoned</h2>
          <p>Someone left the game.</p>
          <button className="bs-play-again-btn" onClick={handlePlayAgain}>
            Back to Lobby 🍣
          </button>
        </div>
      );
    }
    const won = game.winner === playerKey;
    return (
      <div className="bs-page bs-victory">
        <div className="bs-victory-emoji">{won ? '🏆' : '😢'}</div>
        <h2>{won ? 'You won!' : `${displayName(game.winner)} wins!`}</h2>
        <p>{won ? 'All their sushi is eaten! 🍣' : 'Better luck next time!'}</p>
        <button className="bs-play-again-btn" onClick={handlePlayAgain}>
          Play Again 🍣
        </button>
      </div>
    );
  }
```

- [ ] **Step 3: Add onExit prop to BattleshipsGame**

Find:
```jsx
      <BattleshipsGame
        game={game}
        playerKey={playerKey}
        opponentKey={getOpponentKey(playerKey)}
        onShot={handleShot}
        mode={game.mode}
      />
```

Replace with:
```jsx
      <BattleshipsGame
        game={game}
        playerKey={playerKey}
        opponentKey={getOpponentKey(playerKey)}
        onShot={handleShot}
        mode={game.mode}
        onExit={handleExit}
      />
```

- [ ] **Step 4: Add onExit prop to BattleshipsPlacement**

Find:
```jsx
    return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} mode={game.mode} />;
```

Replace with:
```jsx
    return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} mode={game.mode} onExit={handleExit} />;
```

- [ ] **Step 5: Add exit button to the waiting-creator lobby screen**

Find the waiting-creator block (it has `bs-lobby-waiting` class):
```jsx
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
```

Replace with:
```jsx
  if (game?.status === 'waiting' && game.created_by === playerKey) {
    return (
      <div className="bs-page bs-lobby">
        <h2>⚔️ Sushi Battleships</h2>
        <p className="bs-lobby-waiting">
          ⏳ Waiting for {displayName(getOpponentKey(playerKey))} to join...
        </p>
        <button className="bs-exit-btn" onClick={handleExit}>✕ Exit game</button>
      </div>
    );
  }
```

- [ ] **Step 6: Add exit button to the ready-waiting-for-opponent screen**

Find the block where `game.status === 'placing'` and `game[playerKey_ready]` is true (it has `bs-waiting-msg` and mentions "Fleet hidden"):
```jsx
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
```

Replace with:
```jsx
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
        <button className="bs-exit-btn" onClick={handleExit}>✕ Exit game</button>
      </div>
    );
  }
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Battleships.jsx
git commit -m "feat: add handleExit and exit buttons to Battleships lobby screens"
```

---

## Task 2: Accept onExit in BattleshipsGame and BattleshipsPlacement

**Files:**
- Modify: `src/components/BattleshipsGame.jsx`
- Modify: `src/components/BattleshipsPlacement.jsx`

Read both files first, then make these targeted edits.

- [ ] **Step 1: Add onExit to BattleshipsGame signature and render button**

Find the component signature:
```jsx
export default function BattleshipsGame({ game, playerKey, opponentKey, onShot, mode = 'regular' }) {
```

Replace with:
```jsx
export default function BattleshipsGame({ game, playerKey, opponentKey, onShot, mode = 'regular', onExit }) {
```

Then find the closing `</div>` of the outermost `bs-game` div (it's the last line of the return statement, after the attack section). Add the exit button just before it:

```jsx
      <button className="bs-exit-btn" onClick={onExit}>✕ Exit game</button>
    </div>
  );
```

The full return statement should end like:
```jsx
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
      <button className="bs-exit-btn" onClick={onExit}>✕ Exit game</button>
    </div>
  );
}
```

- [ ] **Step 2: Add onExit to BattleshipsPlacement signature and render button**

Find the component signature:
```jsx
export default function BattleshipsPlacement({ playerName, onReady, mode = 'regular' }) {
```

Replace with:
```jsx
export default function BattleshipsPlacement({ playerName, onReady, mode = 'regular', onExit }) {
```

Then find the closing `</div>` of the outermost `bs-placement` div (it's the last line of the return, after the `{allPlaced && ...}` button). Add the exit button just before it:

```jsx
      {allPlaced && (
        <button className="bs-ready-btn" onClick={() => onReady(placedShips)}>
          Ready! 🍣
        </button>
      )}
      {onExit && <button className="bs-exit-btn" onClick={onExit}>✕ Exit game</button>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BattleshipsGame.jsx src/components/BattleshipsPlacement.jsx
git commit -m "feat: add exit button to BattleshipsGame and BattleshipsPlacement"
```

---

## Task 3: CSS, build, and push

**Files:**
- Modify: `src/components/Battleships.css`

- [ ] **Step 1: Append .bs-exit-btn to Battleships.css**

Add to the very end of `src/components/Battleships.css`:

```css
/* Exit game button */
.bs-exit-btn {
  display: block;
  margin: 16px auto 0;
  background: none;
  border: none;
  color: #999;
  font-size: 0.85rem;
  font-family: 'Nunito', sans-serif;
  cursor: pointer;
  padding: 8px 16px;
  touch-action: manipulation;
}

.bs-exit-btn:hover {
  color: #666;
}
```

- [ ] **Step 2: Commit CSS**

```bash
git add src/components/Battleships.css
git commit -m "style: add bs-exit-btn style for Battleships exit button"
```

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 4: Push to GitHub**

```bash
git push
```

- [ ] **Step 5: Verify on Vercel**

Check these screens all show "✕ Exit game" in a small muted style:
1. Waiting lobby (after creating a game, before opponent joins)
2. Placement phase (while placing ships)
3. Ready screen (ships placed, waiting for opponent)
4. Active battle (during gameplay, below both grids)

Tap "✕ Exit game" on any screen:
- Your view returns to the "Full Game / Mini" lobby
- The other player (if in the game) should see "Game abandoned" with a "Back to Lobby" button
