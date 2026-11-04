import { memo, useState } from "react";
import { motion } from "framer-motion";
import { FLOWER_EMOJI, SEASON_EMOJI, tileName } from "../mahjong/tiles";

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WINDS = { wE: "東", wS: "南", wW: "西", wN: "北" };
const DOT_COLOURS = ["#2f6fb5", "#c0392b", "#2e8b57"];

// Dot centres within a 30×42 face, for 1–9 dots.
const DOTS = {
  1: [[15, 21]],
  2: [[15, 11], [15, 31]],
  3: [[7, 8], [15, 21], [23, 34]],
  4: [[9, 11], [21, 11], [9, 31], [21, 31]],
  5: [[8, 8], [22, 8], [15, 21], [8, 34], [22, 34]],
  6: [[9, 8], [21, 8], [9, 21], [21, 21], [9, 34], [21, 34]],
  7: [[6, 6], [15, 10], [24, 14], [9, 26], [21, 26], [9, 36], [21, 36]],
  8: [[9, 6], [21, 6], [9, 16], [21, 16], [9, 26], [21, 26], [9, 36], [21, 36]],
  9: [[6, 8], [15, 8], [24, 8], [6, 21], [15, 21], [24, 21], [6, 34], [15, 34], [24, 34]],
};

// Bamboo stick centres within a 30×42 face, for 2–9 sticks (1 is drawn specially).
const STICKS = {
  2: [[15, 11], [15, 31]],
  3: [[15, 11], [8, 31], [22, 31]],
  4: [[9, 11], [21, 11], [9, 31], [21, 31]],
  5: [[8, 11], [22, 11], [15, 21], [8, 31], [22, 31]],
  6: [[6, 11], [15, 11], [24, 11], [6, 31], [15, 31], [24, 31]],
  7: [[15, 7], [6, 21], [15, 21], [24, 21], [6, 35], [15, 35], [24, 35]],
  8: [[5, 11], [12, 11], [18, 11], [25, 11], [5, 31], [12, 31], [18, 31], [25, 31]],
  9: [[6, 7], [15, 7], [24, 7], [6, 21], [15, 21], [24, 21], [6, 35], [15, 35], [24, 35]],
};

function Dots({ n }) {
  const r = n === 1 ? 10 : n <= 4 ? 5.5 : 4.2;
  return (
    <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
      {DOTS[n].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={DOT_COLOURS[n === 1 ? 1 : i % 3]}
          stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function Bamboo({ n }) {
  if (n === 1) {
    return (
      <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
        <rect x="12" y="6" width="6" height="32" rx="3" fill="#2e8b57" />
        <circle cx="15" cy="7" r="4.5" fill="#c0392b" />
      </svg>
    );
  }
  const h = n >= 7 ? 11 : 16;
  return (
    <svg viewBox="0 0 30 42" className="mj-face-svg" aria-hidden="true">
      {STICKS[n].map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - 2} y={cy - h / 2} width="4" height={h} rx="2" fill="#2e8b57" />
          <rect x={cx - 2.5} y={cy - 0.75} width="5" height="1.5" fill="#17482c" />
        </g>
      ))}
    </svg>
  );
}

function Face({ face }) {
  const kind = face[0];
  const n = Number(face.slice(1));
  if (face === "wD") return <span className="mj-white" />;
  if (face === "rD") return <span className="mj-red">中</span>;
  if (face === "gD") return <span className="mj-green">發</span>;
  if (WINDS[face]) return <span className="mj-wind">{WINDS[face]}</span>;
  if (kind === "f") return <span className="mj-emoji">{FLOWER_EMOJI[face]}</span>;
  if (kind === "s") return <span className="mj-emoji">{SEASON_EMOJI[face]}</span>;
  if (kind === "d") return <Dots n={n} />;
  if (kind === "b") return <Bamboo n={n} />;
  return (
    <span className="mj-char">
      <span className="mj-char-num">{NUMERALS[n - 1]}</span>
      <span className="mj-char-wan">萬</span>
    </span>
  );
}

// Blocked tiles look the same as free ones; tapping one just wiggles it.
function MahjongTile({ tile, left, top, width, height, zIndex, free, selected, hinted, onTap }) {
  const [wiggling, setWiggling] = useState(false);
  const classes = ["mj-tile"];
  if (selected) classes.push("selected");
  if (hinted) classes.push("hinted");
  if (wiggling) classes.push("wiggle");
  return (
    <motion.button
      type="button"
      className={classes.join(" ")}
      style={{ left, top, width, height, zIndex }}
      aria-disabled={!free}
      aria-pressed={selected}
      aria-label={free ? tileName(tile.face) : `${tileName(tile.face)} (not free yet)`}
      onClick={() => (free ? onTap(tile) : setWiggling(true))}
      onAnimationEnd={() => setWiggling(false)}
      initial={false}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
    >
      <Face face={tile.face} />
    </motion.button>
  );
}

export default memo(MahjongTile);
