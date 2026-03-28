import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">brbrtr</span>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Groceries
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Recipes
        </NavLink>
      </div>
    </nav>
  );
}
