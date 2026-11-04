import { useCallback, useEffect, useMemo, useReducer } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import MahjongBoard from "./MahjongBoard";
import { canMatch, findHint, isFree, newGame, removePair, reshuffle } from "../mahjong/engine";
import { LAYOUTS } from "../mahjong/layouts";
import "./Mahjong.css";

const STORAGE_KEY = "mahjong:v1";
const MODE_LABELS = { quick: "Quick", classic: "Classic" };

// The game in progress is kept on this device only (no database).
function loadGame() {
  try {
    const g = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = g && LAYOUTS[g.mode] && Array.isArray(g.tiles) && Array.isArray(g.history)
      && Number.isFinite(g.elapsed);
    return valid ? g : null;
  } catch {
    return null;
  }
}

function saveGame(game) {
  try {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. private browsing): the game still works, it just won't resume.
  }
}

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const fresh = (game) => ({ game, selectedId: null, hintIds: null, notice: null });

function reducer(state, action) {
  const { game } = state;
  switch (action.type) {
    case "start":
      return fresh({ mode: action.mode, tiles: action.tiles, history: [], elapsed: 0 });
    case "menu":
      return fresh(null);
    case "tick":
      return game && game.tiles.length
        ? { ...state, game: { ...game, elapsed: game.elapsed + 1 } }
        : state;
    case "tap": {
      const { tile } = action;
      if (!game || !isFree(tile, game.tiles)) return state;
      if (state.selectedId === tile.id) return { ...state, selectedId: null, hintIds: null };
      const selected = game.tiles.find((t) => t.id === state.selectedId);
      if (selected && canMatch(selected, tile)) {
        return fresh({
          ...game,
          tiles: removePair(game.tiles, selected, tile),
          history: [...game.history, [selected, tile]],
        });
      }
      return { ...state, selectedId: tile.id, hintIds: null, notice: null };
    }
    case "hint": {
      const pair = game && findHint(game.tiles);
      return pair ? { ...state, hintIds: pair.map((t) => t.id) } : state;
    }
    case "shuffle":
      if (!game) return state;
      if (!action.tiles) {
        return { ...state, notice: "These tiles can't be rearranged into a winnable board — start a new game." };
      }
      return fresh({ ...game, tiles: action.tiles, history: [] });
    case "undo": {
      if (!game || !game.history.length) return state;
      const last = game.history[game.history.length - 1];
      return fresh({ ...game, tiles: [...game.tiles, ...last], history: game.history.slice(0, -1) });
    }
    default:
      return state;
  }
}

function ModePicker({ onStart }) {
  return (
    <div className="mj-picker">
      <h1 className="mj-title">🀄 Mahjong</h1>
      <p className="mj-how">
        Tap two matching tiles to clear them. A tile is free when nothing is on top of it and
        its left or right side is open. Flowers match any flower, seasons any season. Clear the
        board to win.
      </p>
      <button type="button" className="mj-pick" onClick={() => onStart("quick")}>
        <span className="mj-pick-name">Quick</span>
        <span className="mj-pick-meta">72 tiles · about 5 minutes · made for your phone</span>
      </button>
      <button type="button" className="mj-pick" onClick={() => onStart("classic")}>
        <span className="mj-pick-name">Classic</span>
        <span className="mj-pick-meta">144 tiles · the traditional Turtle · best turned sideways</span>
      </button>
    </div>
  );
}

export default function Mahjong() {
  const [state, dispatch] = useReducer(reducer, null, () => fresh(loadGame()));
  const { game, selectedId, hintIds, notice } = state;
  const tiles = game?.tiles;
  const playing = !!tiles && tiles.length > 0;
  const won = !!tiles && tiles.length === 0;
  const stuck = useMemo(() => !!tiles && tiles.length > 0 && !findHint(tiles), [tiles]);

  useEffect(() => saveGame(game), [game]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  const onTap = useCallback((tile) => dispatch({ type: "tap", tile }), []);
  const start = (mode) => dispatch({ type: "start", mode, tiles: newGame(mode) });
  const shuffleBoard = () => dispatch({ type: "shuffle", tiles: reshuffle(tiles) });
  const backToMenu = () => {
    if (playing && game.history.length && !window.confirm("Start a new game? This one will be lost.")) return;
    dispatch({ type: "menu" });
  };

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mj-page">
        {!game ? (
          <ModePicker onStart={start} />
        ) : (
          <>
            <div className="mj-topbar">
              <h1 className="mj-title">
                🀄 Mahjong <span className="mj-mode">{MODE_LABELS[game.mode]}</span>
              </h1>
              <span className="mj-stats">⏱ {formatTime(game.elapsed)} · {tiles.length} left</span>
            </div>
            {game.mode === "classic" && <p className="mj-tip">Tip: turn your phone sideways for bigger tiles.</p>}
            {notice ? (
              <div className="mj-notice" role="status">{notice}</div>
            ) : stuck ? (
              <div className="mj-notice" role="status">
                No moves left.
                <button type="button" onClick={shuffleBoard}>🔀 Shuffle</button>
              </div>
            ) : null}
            <MahjongBoard mode={game.mode} tiles={tiles} selectedId={selectedId} hintIds={hintIds} onTap={onTap} />
            <div className="mj-toolbar">
              <button type="button" onClick={() => dispatch({ type: "hint" })} disabled={!playing || stuck}>💡 Hint</button>
              <button type="button" onClick={shuffleBoard} disabled={!playing}>🔀 Shuffle</button>
              <button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!game.history.length || won}>↩️ Undo</button>
              <button type="button" onClick={backToMenu}>✨ New</button>
            </div>
          </>
        )}
      </div>

      {won && createPortal(
        <div className="mj-win" role="dialog" aria-label="Board cleared">
          <motion.div
            className="mj-win-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="mj-win-emoji" aria-hidden="true">🎉🀄🎉</div>
            <h2>Board cleared!</h2>
            <p>{MODE_LABELS[game.mode]} · {formatTime(game.elapsed)}</p>
            <div className="mj-win-actions">
              <button type="button" onClick={() => start(game.mode)}>Play again</button>
              <button type="button" className="secondary" onClick={() => dispatch({ type: "menu" })}>Choose board</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
