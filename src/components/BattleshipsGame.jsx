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
