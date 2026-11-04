import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import MahjongBoard from "./MahjongBoard";
import MahjongLeaderboard from "./MahjongLeaderboard";
import { canMatch, findHint, isFree, newGame, removePair, reshuffle } from "../mahjong/engine";
import { LAYOUTS } from "../mahjong/layouts";
import { PLAYERS, PLAYER_NAMES, formatTime, isPersonalBest } from "../mahjong/leaderboard";
import "./Mahjong.css";

const STORAGE_KEY = "mahjong:v1";
// Shared with All Aboard, so each phone already knows who it belongs to.
const PLAYER_KEY = "battleships_player";
const MODE_LABELS = { quick: "Quick", classic: "Classic" };

// The game in progress is kept on this device only; finished games go to the
// mahjong_scores table.
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

function loadPlayer() {
  try {
    const p = localStorage.getItem(PLAYER_KEY);
    return PLAYERS.includes(p) ? p : null;
  } catch {
    return null;
  }
}

const fresh = (game) => ({ game, selectedId: null, hintIds: null, notice: null });

function reducer(state, action) {
  const { game } = state;
  switch (action.type) {
    case "start":
      return fresh({
        mode: action.mode, player: action.player, tiles: action.tiles,
        history: [], elapsed: 0, assisted: false, outcome: null,
      });
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
      return pair
        ? { ...state, game: { ...game, assisted: true }, hintIds: pair.map((t) => t.id) }
        : state;
    }
    case "shuffle":
      if (!game) return state;
      if (!action.tiles) {
        return { ...state, notice: "These tiles can't be rearranged into a winnable board — start a new game." };
      }
      return fresh({ ...game, tiles: action.tiles, history: [], assisted: true });
    case "undo": {
      if (!game || !game.history.length) return state;
      const last = game.history[game.history.length - 1];
      return fresh({ ...game, tiles: [...game.tiles, ...last], history: game.history.slice(0, -1) });
    }
    case "outcome":
      return game ? { ...state, game: { ...game, outcome: action.outcome } } : state;
    default:
      return state;
  }
}

function ModePicker({ player, onPlayer, onStart, scores, scoresError }) {
  return (
    <div className="mj-picker">
      <h1 className="mj-title">🀄 Mahjong</h1>
      <p className="mj-how">
        Tap two matching tiles to clear them. A tile is free when nothing is on top of it and
        its left or right side is open. Flowers match any flower, seasons any season. Clear the
        board to win.
      </p>
      <div className="mj-who">
        <span className="mj-who-label">Who's playing?</span>
        <div className="mj-who-btns" role="group" aria-label="Who's playing?">
          {PLAYERS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={player === p}
              className={"mj-who-btn" + (player === p ? " active" : "")}
              onClick={() => onPlayer(p)}
            >
              {PLAYER_NAMES[p]}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="mj-pick" disabled={!player} onClick={() => onStart("quick")}>
        <span className="mj-pick-name">Quick</span>
        <span className="mj-pick-meta">72 tiles · about 5 minutes · made for your phone</span>
      </button>
      <button type="button" className="mj-pick" disabled={!player} onClick={() => onStart("classic")}>
        <span className="mj-pick-name">Classic</span>
        <span className="mj-pick-meta">144 tiles · the traditional Turtle · best turned sideways</span>
      </button>
      <h2 className="mj-board-title">🏆 Leaderboard</h2>
      <MahjongLeaderboard scores={scores} error={scoresError} />
    </div>
  );
}

function resultMessage(outcome, name) {
  switch (outcome) {
    case "best": return { cls: "best", text: `New personal best for ${name}! 🏅` };
    case "saved": return { cls: "muted", text: `Time saved for ${name}` };
    case "assisted": return { cls: "muted", text: "Hint or Shuffle used, so this one isn't on the leaderboard" };
    case "error": return { cls: "error", text: "Couldn't save your time — check your connection" };
    case "noplayer": return { cls: "muted", text: "Not saved — nobody was picked as the player" };
    case "saving": return { cls: "muted", text: "Saving your time…" };
    default: return null;
  }
}

export default function Mahjong() {
  const [state, dispatch] = useReducer(reducer, null, () => fresh(loadGame()));
  const [player, setPlayer] = useState(loadPlayer);
  const [scores, setScores] = useState([]);
  const [scoresError, setScoresError] = useState(false);
  const { game, selectedId, hintIds, notice } = state;
  const tiles = game?.tiles;
  const playing = !!tiles && tiles.length > 0;
  const won = !!tiles && tiles.length === 0;
  const stuck = useMemo(() => !!tiles && tiles.length > 0 && !findHint(tiles), [tiles]);

  useEffect(() => saveGame(game), [game]);

  // Scores: fetch on open, then keep live (e.g. the other phone finishes a game).
  useEffect(() => {
    const fetchScores = async () => {
      const { data, error } = await supabase.from("mahjong_scores").select("player, mode, seconds, assisted");
      if (error) {
        console.warn("Mahjong scores fetch failed:", error.message);
        setScoresError(true);
      } else {
        setScores(data);
        setScoresError(false);
      }
    };
    fetchScores();
    const channel = supabase
      .channel("mahjong_scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "mahjong_scores" }, fetchScores)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  // Record a cleared board once. Marking it "saving" first stops a re-run
  // (e.g. the realtime refresh of scores) from saving it twice.
  useEffect(() => {
    if (!won || game.outcome) return;
    const who = game.player ?? player;
    if (!who) {
      dispatch({ type: "outcome", outcome: "noplayer" });
      return;
    }
    const best = !game.assisted && isPersonalBest(scores, who, game.mode, game.elapsed);
    dispatch({ type: "outcome", outcome: "saving" });
    supabase
      .from("mahjong_scores")
      .insert({ player: who, mode: game.mode, seconds: game.elapsed, assisted: game.assisted })
      .then(({ error }) => {
        if (error) console.warn("Mahjong score save failed:", error.message);
        const outcome = error ? "error" : game.assisted ? "assisted" : best ? "best" : "saved";
        dispatch({ type: "outcome", outcome });
      });
  }, [won, game, player, scores]);

  const choosePlayer = (p) => {
    setPlayer(p);
    try { localStorage.setItem(PLAYER_KEY, p); } catch { /* fine — just not remembered */ }
  };
  const onTap = useCallback((tile) => dispatch({ type: "tap", tile }), []);
  const start = (mode) => dispatch({ type: "start", mode, player, tiles: newGame(mode) });
  const shuffleBoard = () => dispatch({ type: "shuffle", tiles: reshuffle(tiles) });
  const backToMenu = () => {
    if (playing && game.history.length && !window.confirm("Start a new game? This one will be lost.")) return;
    dispatch({ type: "menu" });
  };

  const name = PLAYER_NAMES[game?.player ?? player] ?? "";
  const result = won ? resultMessage(game.outcome, name) : null;

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
          <ModePicker
            player={player}
            onPlayer={choosePlayer}
            onStart={start}
            scores={scores}
            scoresError={scoresError}
          />
        ) : (
          <>
            <div className="mj-topbar">
              <h1 className="mj-title">
                🀄 Mahjong <span className="mj-mode">{MODE_LABELS[game.mode]}</span>
                {name && <span className="mj-player">· {name}</span>}
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
            {result && <p className={"mj-win-result " + result.cls} role="status">{result.text}</p>}
            <div className="mj-win-actions">
              <button type="button" onClick={() => start(game.mode)} disabled={!player}>Play again</button>
              <button type="button" className="secondary" onClick={() => dispatch({ type: "menu" })}>Choose board</button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
