import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
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
