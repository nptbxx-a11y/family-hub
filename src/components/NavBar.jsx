import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar({ onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">&#10084;</NavLink>
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
      </nav>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Br Br Family Hub</span>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🏠 Home
          </NavLink>
          <NavLink to="/groceries" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🛒 Groceries
          </NavLink>
          <NavLink to="/recipes" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🍳 Recipes
          </NavLink>
          <NavLink to="/meals" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🗓️ This Week's Meals
          </NavLink>
          <NavLink to="/todos" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            ✅ To Do
          </NavLink>
          <NavLink to="/restaurants" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🍴 Restaurants
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            📮 Feedback Box
          </NavLink>
        </nav>
        <button className="sidebar-logout" onClick={onLogout}>Log out</button>
      </div>
    </>
  );
}
