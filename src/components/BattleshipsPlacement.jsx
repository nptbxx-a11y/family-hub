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
