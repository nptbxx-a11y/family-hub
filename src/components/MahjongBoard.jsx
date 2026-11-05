import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import MahjongTile from "./MahjongTile";
import { isFree } from "../mahjong/engine";
import { layoutBounds } from "../mahjong/layouts";

const ASPECT = 1.33; // tile height ÷ width
const DEPTH = 0.115; // per-layer up-left offset, as a fraction of tile width
const MIN_TILE = 14; // px
const MAX_TILE = 64; // px — keeps tiles sensible on big screens

// Fits the board to the available width. Higher layers sit slightly up and to
// the left so the stack reads as 3D; the board's height scrolls with the page.
export default function MahjongBoard({ layout, tiles, selectedId, hintIds, onTap }) {
  const wrapRef = useRef(null);
  const [tw, setTw] = useState(40);
  const { w, h, layers } = layoutBounds(layout);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const perTile = el.clientWidth / (w / 2 + layers * DEPTH);
      setTw(Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(perTile))));
    };
    // ResizeObserver fires once as soon as it starts observing, so this also
    // sets the initial size (no synchronous setState in the effect body).
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, layers]);

  const freeIds = useMemo(
    () => new Set(tiles.filter((t) => isFree(t, tiles)).map((t) => t.id)),
    [tiles]
  );

  const th = tw * ASPECT;
  const off = tw * DEPTH;
  const lift = (z) => (layers - 1 - z) * off;

  return (
    <div className="mj-board-wrap" ref={wrapRef}>
      <MotionConfig reducedMotion="user">
        <div
          className="mj-board"
          style={{ width: (w / 2) * tw + layers * off, height: (h / 2) * th + layers * off, "--tw": `${tw}px` }}
        >
          <AnimatePresence>
            {tiles.map((t) => (
              <MahjongTile
                key={t.id}
                tile={t}
                left={(t.x / 2) * tw + lift(t.z)}
                top={(t.y / 2) * th + lift(t.z)}
                width={tw}
                height={th}
                zIndex={t.z * 2000 + t.y * 40 + t.x}
                free={freeIds.has(t.id)}
                selected={t.id === selectedId}
                hinted={hintIds ? hintIds.includes(t.id) : false}
                onTap={onTap}
              />
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </div>
  );
}
