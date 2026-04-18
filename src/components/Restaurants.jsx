import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import "./Restaurants.css";

// Paste Ozzy's Google Maps shared list URL here when ready
const OZZY_MAPS_URL = "";

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
};

export default function Restaurants() {
  const [places, setPlaces] = useState([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setPlaces(data);
    };
    fetchPlaces();

    const channel = supabase
      .channel("restaurants")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, fetchPlaces)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const addPlace = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const tempPlace = {
      id: tempId,
      name: trimmed,
      notes: notes.trim(),
      map_link: mapLink.trim(),
      visited: false,
      created_at: new Date().toISOString(),
    };
    setPlaces((prev) => [...prev, tempPlace]);
    setName("");
    setNotes("");
    setMapLink("");
    setShowForm(false);

    const { data } = await supabase
      .from("restaurants")
      .insert({ name: trimmed, notes: notes.trim(), map_link: mapLink.trim(), visited: false })
      .select()
      .single();
    if (data) setPlaces((prev) => prev.map((p) => p.id === tempId ? data : p));
  };

  const toggleVisited = async (place) => {
    const next = !place.visited;
    setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, visited: next } : p));
    const { error } = await supabase.from("restaurants").update({ visited: next }).eq("id", place.id);
    if (error) setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, visited: place.visited } : p));
  };

  const deletePlace = async (id) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("restaurants").delete().eq("id", id);
  };

  const toVisit = places.filter((p) => !p.visited);
  const visited = places.filter((p) => p.visited);

  const renderPlace = (place, isVisited) => (
    <motion.li
      key={place.id}
      className={"restaurant-item" + (isVisited ? " visited" : "")}
      variants={itemVariants}
      layout
      exit="exit"
    >
      <button
        className={"restaurant-checkbox" + (isVisited ? " checked" : "")}
        onClick={() => toggleVisited(place)}
        aria-label={isVisited ? "Mark as not visited" : "Mark as visited"}
      >
        {isVisited ? "✓" : ""}
      </button>

      <div className="restaurant-info">
        <span className={"restaurant-name" + (isVisited ? " visited" : "")}>{place.name}</span>
        {place.notes ? <span className="restaurant-notes">{place.notes}</span> : null}
      </div>

      <div className="restaurant-actions">
        {place.map_link && (
          <a
            className="restaurant-map-btn"
            href={place.map_link}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in Maps"
          >
            📍
          </a>
        )}
        <button
          className="restaurant-delete"
          onClick={() => deletePlace(place.id)}
          aria-label="Remove"
        >✕</button>
      </div>
    </motion.li>
  );

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="restaurant-container">
        <div className="restaurant-header">
          <h1 className="restaurant-title">Restaurants</h1>
          <button
            className="restaurant-add-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>

        {OZZY_MAPS_URL && (
          <a
            className="maps-banner"
            href={OZZY_MAPS_URL}
            target="_blank"
            rel="noreferrer"
          >
            🗺️ View Ozzy's saved places
          </a>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.form
              className="restaurant-form"
              onSubmit={addPlace}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: "hidden" }}
            >
              <input
                className="restaurant-input"
                placeholder="Restaurant name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <input
                className="restaurant-input"
                placeholder="Notes or location (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <input
                className="restaurant-input"
                placeholder="Google Maps link (optional)"
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
              />
              <button type="submit" className="restaurant-submit-btn">Add Restaurant</button>
            </motion.form>
          )}
        </AnimatePresence>

        <ul className="restaurant-list">
          <AnimatePresence mode="popLayout">
            {toVisit.length === 0 && !showForm && (
              <p className="restaurant-empty">No restaurants yet — add some above!</p>
            )}
            {toVisit.map((p) => renderPlace(p, false))}
          </AnimatePresence>
        </ul>

        {visited.length > 0 && (
          <>
            <p className="restaurant-done-label">Been! 🎉</p>
            <ul className="restaurant-list">
              <AnimatePresence mode="popLayout">
                {visited.map((p) => renderPlace(p, true))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
    </motion.div>
  );
}
