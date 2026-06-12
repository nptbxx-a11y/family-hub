import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const hamburgerRef = useRef(null);

  // When the drawer is open: close on Escape, keep keyboard focus trapped
  // inside it, and restore focus to the hamburger when it closes.
  useEffect(() => {
    if (!open) return;

    // Capture the trigger node now so the cleanup restores focus to the
    // same element (and satisfies the exhaustive-deps ref-in-cleanup rule).
    const trigger = hamburgerRef.current;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !sidebarRef.current) return;

      const focusable = sidebarRef.current.querySelectorAll(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Move focus into the drawer when it opens.
    sidebarRef.current?.querySelector("a, button")?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Return focus to the control that opened the drawer.
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">&#10084;</NavLink>
        <button ref={hamburgerRef} className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
      </nav>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div
        ref={sidebarRef}
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!open}
      >
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
            🤌 Mangia Mangia
          </NavLink>
          <NavLink to="/wildlife" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🦆 Wildlife Spotter
          </NavLink>
          <NavLink
            to="/battleships"
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            onClick={() => setOpen(false)}
          >
            ⚔️ All Aboard
          </NavLink>
          <NavLink to="/ideas" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            💡 Big Ideas
          </NavLink>
          <NavLink to="/worldcup" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")} onClick={() => setOpen(false)}>
            🏆 World Cup
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
