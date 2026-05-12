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
