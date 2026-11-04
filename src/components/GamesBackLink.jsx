import { Link } from "react-router-dom";
import "./GamesBackLink.css";

// Small "← Games" bar shown above each game.
export default function GamesBackLink() {
  return (
    <div className="games-back-bar">
      <Link to="/games" className="games-back">← Games</Link>
    </div>
  );
}
