import { Link } from "react-router-dom";
import "./Home.css";

const MET_DATE = new Date("2025-07-09");

function getDaysTogether() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today - MET_DATE;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const days = getDaysTogether();

  return (
    <div className="home-container">
      <div className="days-widget">
        <span className="days-number">{days}</span>
        <span className="days-label">days together</span>
        <span className="days-since">since 9 July 2025</span>
      </div>

      <div className="home-card">
        <h1 className="home-title">Br Br Family Hub</h1>
        <p className="home-subtitle">Welcome back, Nick & Laura</p>

        <div className="home-links">
          <Link to="/groceries" className="home-link">
            <span className="home-link-icon">🛒</span>
            <span className="home-link-label">Grocery List</span>
          </Link>
          <Link to="/recipes" className="home-link">
            <span className="home-link-icon">🍳</span>
            <span className="home-link-label">Recipes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
