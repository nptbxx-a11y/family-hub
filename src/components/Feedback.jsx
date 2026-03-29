import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./Feedback.css";

export default function Feedback() {
  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("Nick");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setNotes(data);
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

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="page-bg">
      <div className="feedback-container">
        <h1 className="feedback-title">Feedback Box</h1>
        <p className="feedback-subtitle">Post ideas and thoughts for improving the app</p>

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
              className={"author-btn" + (author === "Nick" ? " selected" : "")}
              onClick={() => setAuthor("Nick")}
            >Nick</button>
            <button
              type="button"
              className={"author-btn" + (author === "Laura" ? " selected" : "")}
              onClick={() => setAuthor("Laura")}
            >Laura</button>
          </div>
          <textarea
            className="note-input"
            placeholder="Write your note here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <button type="submit" className="post-button" disabled={posting || !message.trim()}>
            {posting ? "Posting..." : "📮 Post it!"}
          </button>
        </form>

        {/* Posted notes */}
        {notes.length > 0 && (
          <div className="notes-list">
            <h2 className="notes-heading">Posted Notes</h2>
            {notes.map((note) => (
              <div key={note.id} className="note-card">
                <div className="note-card-header">
                  <span className="note-author">{note.author}</span>
                  <span className="note-date">{formatDate(note.created_at)}</span>
                  <button className="note-delete" onClick={() => deleteNote(note.id)}>✕</button>
                </div>
                <p className="note-message">{note.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
