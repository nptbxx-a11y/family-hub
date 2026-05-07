import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import signPhoto from "../assets/victoria-park-sign.jpg";
import "./WildlifeSpotter.css";

const GUYS = [
  "Mute Swan", "Grey Heron", "Cormorant", "Mallard", "Gadwall", "Shoveler",
  "Canada Goose", "Greylag Goose", "Egyptian Goose", "Mandarin Duck",
  "Little Grebe", "Kingfisher", "Coot", "Moorhen", "Black-headed Gull",
  "Red-crested Pochard", "Pochard", "Tufted Duck",
];

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}
function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function fmtMonth(date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function todayStr() {
  return toDateStr(new Date());
}

export default function WildlifeSpotter() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [signExpanded, setSignExpanded] = useState(false);
  const [sheetDate, setSheetDate] = useState(todayStr());
  const [sheetGuys, setSheetGuys] = useState(new Set());
  const [sheetHighlight, setSheetHighlight] = useState("");
  const [sheetUnexpected, setSheetUnexpected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVisits(); }, [viewMonth]);

  async function fetchVisits() {
    setLoading(true);
    const start = toDateStr(monthStart(viewMonth));
    const end = toDateStr(monthEnd(viewMonth));
    const { data } = await supabase
      .from("wildlife_visits")
      .select("id, visit_date, highlight, wildlife_sightings(id, guy_name, is_unexpected)")
      .gte("visit_date", start)
      .lte("visit_date", end)
      .order("visit_date", { ascending: false });
    setVisits(data || []);
    setLoading(false);
  }

  const now = new Date();
  const isCurrentMonth =
    viewMonth.getFullYear() === now.getFullYear() &&
    viewMonth.getMonth() === now.getMonth();

  function prevMonth() {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    if (!isCurrentMonth) setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const uniqueGuys = new Set(visits.flatMap(v => v.wildlife_sightings.map(s => s.guy_name)));

  function openSheet() {
    setSheetDate(todayStr());
    setSheetGuys(new Set());
    setSheetHighlight("");
    setSheetUnexpected("");
    setShowSheet(true);
  }

  function toggleGuy(name) {
    setSheetGuys(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function saveVisit() {
    if (saving) return;
    setSaving(true);
    const { data: visit, error } = await supabase
      .from("wildlife_visits")
      .insert({ visit_date: sheetDate, highlight: sheetHighlight.trim() || null })
      .select("id")
      .single();
    if (error || !visit) { setSaving(false); return; }

    const sightings = [
      ...[...sheetGuys].map(name => ({ visit_id: visit.id, guy_name: name, is_unexpected: false })),
      ...(sheetUnexpected.trim()
        ? [{ visit_id: visit.id, guy_name: sheetUnexpected.trim(), is_unexpected: true }]
        : []),
    ];
    if (sightings.length > 0) await supabase.from("wildlife_sightings").insert(sightings);
    setSaving(false);
    setShowSheet(false);
    fetchVisits();
  }

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="wildlife-inner">

        <div className="sign-card" onClick={() => setSignExpanded(true)}>
          <img src={signPhoto} alt="Water birds in Victoria Park" className="sign-photo" />
          <div className="sign-card-footer">Tap to view full sign ↗</div>
        </div>

        <div className="month-nav">
          <button className="month-arrow" onClick={prevMonth}>‹</button>
          <div className="month-center">
            <div className="month-label">{fmtMonth(viewMonth)}</div>
            <div className="month-sub">
              {visits.length} visit{visits.length !== 1 ? "s" : ""} · {uniqueGuys.size} guys spotted
            </div>
          </div>
          <button className="month-arrow" onClick={nextMonth} disabled={isCurrentMonth}>›</button>
        </div>

        <div className="stats-bar">
          <div className="stat-pill">
            <div className="stat-num">{uniqueGuys.size}</div>
            <div className="stat-label">Guys</div>
          </div>
          <div className="stat-pill">
            <div className="stat-num">{visits.length}</div>
            <div className="stat-label">Visits</div>
          </div>
          <div className="stat-pill">
            <div className="stat-num">18</div>
            <div className="stat-label">On sign</div>
          </div>
        </div>

        {loading ? (
          <div className="wildlife-empty">Loading…</div>
        ) : visits.length === 0 ? (
          <div className="wildlife-empty">No visits logged this month yet 🌿</div>
        ) : (
          visits.map(visit => {
            const signGuys = visit.wildlife_sightings.filter(s => !s.is_unexpected);
            const unexpected = visit.wildlife_sightings.filter(s => s.is_unexpected);
            return (
              <div key={visit.id} className="visit-card">
                <div className="visit-card-top">
                  <div className="visit-date">{fmtDate(visit.visit_date)}</div>
                  <div className="visit-badge">
                    {visit.wildlife_sightings.length} guy{visit.wildlife_sightings.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="chips">
                  {signGuys.map(s => <span key={s.id} className="chip">✓ {s.guy_name}</span>)}
                  {unexpected.map(s => <span key={s.id} className="chip chip-unexpected">✦ {s.guy_name}</span>)}
                </div>
                {visit.highlight && (
                  <div className="highlight-note">★ {visit.highlight}</div>
                )}
              </div>
            );
          })
        )}

        {isCurrentMonth && (
          <button className="add-btn" onClick={openSheet}>+ Log a Visit</button>
        )}
      </div>

      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              className="sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              className="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="sheet-handle" />
              <h2 className="sheet-title">Log a Visit 🌿</h2>

              <div className="sheet-section">Date</div>
              <input
                type="date"
                className="sheet-date-input"
                value={sheetDate}
                max={todayStr()}
                onChange={e => setSheetDate(e.target.value)}
              />

              <div className="sheet-sign-ref" onClick={() => setSignExpanded(true)}>
                <img src={signPhoto} alt="Victoria Park sign" className="sheet-sign-photo" />
                <div className="sheet-sign-tap">Tap to view full sign ↗</div>
              </div>

              <div className="sheet-section">Which guys did you see?</div>
              <div className="sheet-guys-grid">
                {GUYS.map(name => (
                  <button
                    key={name}
                    className={`guy-item${sheetGuys.has(name) ? " ticked" : ""}`}
                    onClick={() => toggleGuy(name)}
                  >
                    <span className="guy-check">{sheetGuys.has(name) ? "✓" : ""}</span>
                    {name}
                  </button>
                ))}
              </div>

              <div className="sheet-section">Highlight ★ (optional)</div>
              <input
                className="sheet-text-input sheet-highlight-input"
                placeholder="e.g. Kingfisher on the low branch!"
                value={sheetHighlight}
                onChange={e => setSheetHighlight(e.target.value)}
              />

              <div className="sheet-section">Unexpected guy (optional)</div>
              <input
                className="sheet-text-input"
                placeholder="Add a guy not on the sign…"
                value={sheetUnexpected}
                onChange={e => setSheetUnexpected(e.target.value)}
              />

              <button className="save-btn" onClick={saveVisit} disabled={saving}>
                {saving ? "Saving…" : "Save Visit ✓"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signExpanded && (
          <motion.div
            className="sign-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSignExpanded(false)}
          >
            <img src={signPhoto} alt="Water birds in Victoria Park" className="sign-lightbox-img" />
            <div className="sign-lightbox-hint">Tap to close</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
