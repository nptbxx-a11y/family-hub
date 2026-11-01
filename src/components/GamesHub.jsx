import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./GamesHub.css";

const GAMES = [
  { to: "/battleships", icon: "⚔️", name: "All Aboard", blurb: "Battleships for two", badge: "2 players" },
  { to: "/mahjong", icon: "🀄", name: "Mahjong", blurb: "Match the tiles, clear the board", badge: "Solo" },
];

export default function GamesHub() {
  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="games-page">
        <h1 className="games-title">🎮 Games</h1>
        <div className="games-grid">
          {GAMES.map((g) => (
            <Link key={g.to} to={g.to} className="games-card">
              <span className="games-icon" aria-hidden="true">{g.icon}</span>
              <span className="games-name">{g.name}</span>
              <span className="games-blurb">{g.blurb}</span>
              <span className="games-badge">{g.badge}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
