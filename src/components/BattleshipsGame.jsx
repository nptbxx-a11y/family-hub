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
