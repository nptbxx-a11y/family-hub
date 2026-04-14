import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import "./Feedback.css";

const noteVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.18 },
  },
};

const noteListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function Feedback() {
  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("Ozzy");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [dbError, setDbError] = useState("");
  const [showActioned, setShowActioned] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*");
      if (error) {
        setDbError("DB error: " + error.message);
      } else {
        setNotes(data || []);
        setDbError("");
      }
    };
    fetchNotes();

    const channel = supabase
      .channel("feedback")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, fetchNotes)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const postNote = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);

    await supabase.from("feedback").insert({ message: message.trim(), author });

    setMessage("");
    setPosting(false);
    setPosted(true);
    setTimeout(() => setPosted(false), 2000);
  };

  const deleteNote = async (id) => {
    await supabase.from("feedback").delete().eq("id", id);
  };

  const actionNote = async (id) => {
    await supabase.from("feedback").update({ actioned: true }).eq("id", id);
  };

  const unactionNote = async (id) => {
    await supabase.from("feedback").update({ actioned: false }).eq("id", id);
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const activeNotes = notes.filter(n => !n.actioned);
  const actionedNotes = notes.filter(n => n.actioned);

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >

      {activeNotes.length > 0 && (
        <div className="ribbon-wrapper">
          <div className="ribbon-track">
            {[...activeNotes, ...activeNotes].map((note, i) => (
              <span key={i} className="ribbon-item">
                <span className="ribbon-author">{note.author}:</span>
                {" "}{note.message}
                <span className="ribbon-dot">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="feedback-container">
        <h1 className="feedback-title">Feedback Box</h1>
        <p className="feedback-subtitle">Post ideas and thoughts for improving the app</p>
        {dbError && <p style={{color:"red", fontSize:"0.85rem"}}>{dbError}</p>}

        {/* Letterbox */}
        <div className="letterbox">
          <div className="letterbox-top">
            <div className="letterbox-crown" />
            <div className="letterbox-label">BR BR</div>
          </div>
          <div className="letterbox-body">
            <div className={`letterbox-slot ${posting || posted ? "posting" : ""}`}>
              <div className="slot-line" />
            </div>
            {posted && <div className="posted-message">Posted! ✉️</div>}
          </div>
          <div className="letterbox-base" />
        </div>

        {/* Write a note */}
        <form onSubmit={postNote} className="note-form">
          <div className="author-toggle">
            <button
              type="button"
              className={"author-btn" + (author === "Ozzy" ? " selected" : "")}
              onClick={() => setAuthor("Ozzy")}
            >Ozzy</button>
            <button
              type="button"
              className={"author-btn" + (author === "Tommy" ? " selected" : "")}
              onClick={() => setAuthor("Tommy")}
            >Tommy</button>
          </div>
          <textarea
            className="note-input"
            placeholder="Write your note here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <motion.button
            type="submit"
            className="post-button"
            disabled={posting || !message.trim()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {posting ? "Posting..." : "📮 Post it!"}
          </motion.button>
        </form>

        {/* Posted notes */}
        {notes.length > 0 && (
          <div className="notes-list">
            {activeNotes.length > 0 && (
              <>
                <h2 className="notes-heading">Posted Notes</h2>
                <motion.div variants={noteListVariants} initial="hidden" animate="show">
                  <AnimatePresence mode="popLayout">
                    {activeNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        className="note-card"
                        variants={noteVariants}
                        exit="exit"
                        layout
                      >
                        <div className="note-card-header">
                          <span className="note-author">{note.author}</span>
                          <span className="note-date">{formatDate(note.created_at)}</span>
                          <button className="note-action" onClick={() => actionNote(note.id)} title="Mark as actioned">✓</button>
                          <button className="note-delete" onClick={() => deleteNote(note.id)}>✕</button>
                        </div>
                        <p className="note-message">{note.message}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </>
            )}

            {actionedNotes.length > 0 && (
              <div className="actioned-section">
                <button className="actioned-toggle" onClick={() => setShowActioned(v => !v)}>
                  {showActioned ? "▲ Hide actioned items" : `▼ ${actionedNotes.length} actioned item${actionedNotes.length !== 1 ? "s" : ""}`}
                </button>
                <AnimatePresence>
                  {showActioned && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: "hidden" }}
                    >
                      <motion.div variants={noteListVariants} initial="hidden" animate="show">
                        <AnimatePresence mode="popLayout">
                          {actionedNotes.map((note) => (
                            <motion.div
                              key={note.id}
                              className="note-card actioned"
                              variants={noteVariants}
                              exit="exit"
                              layout
                            >
                              <div className="note-card-header">
                                <span className="note-author">{note.author}</span>
                                <span className="note-date">{formatDate(note.created_at)}</span>
                                <button className="note-undo" onClick={() => unactionNote(note.id)} title="Restore to active">↩</button>
                                <button className="note-delete" onClick={() => deleteNote(note.id)}>✕</button>
                              </div>
                              <p className="note-message">{note.message}</p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
