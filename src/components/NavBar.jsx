import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar({ onLogout }) {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">Br Br Family Hub</NavLink>
      <div className="navbar-links">
        <NavLink to="/groceries" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Groceries
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Recipes
        </NavLink>
        <button className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
