import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { motion } from "framer-motion";
import "./BigIdeas.css";

const AUTHORS = ["Ozzy", "Tommy"];
const EMPTY_FORM = { title: "", description: "", link: "", image_url: "", author: "Ozzy" };

export default function BigIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIdeas();
    const channel = supabase
      .channel("ideas-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ideas" }, fetchIdeas)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchIdeas() {
    const { data } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });
    if (data) setIdeas(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from("ideas").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      link: form.link.trim() || null,
      image_url: form.image_url.trim() || null,
      author: form.author,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id) {
    setIdeas(prev => prev.filter(i => i.id !== id));
    await supabase.from("ideas").delete().eq("id", id);
  }

  return (
    <motion.div
      className="ideas-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ideas-container">
        <div className="ideas-header">
          <h1 className="ideas-title">💡 Big Ideas</h1>
          <button className="ideas-add-btn" onClick={() => setShowForm(true)}>+ Add Idea</button>
        </div>

        {showForm && (
          <div className="ideas-form-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <form className="ideas-form" onSubmit={handleSubmit}>
              <h2 className="ideas-form-heading">New Idea</h2>

              <label className="ideas-label">Title *</label>
              <input
                className="ideas-input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="What's the big idea?"
                required
                autoFocus
              />

              <label className="ideas-label">Description</label>
              <textarea
                className="ideas-input ideas-textarea"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell us more..."
                rows={3}
              />

              <label className="ideas-label">Link (URL)</label>
              <input
                className="ideas-input"
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://..."
              />

              <label className="ideas-label">Image URL</label>
              <input
                className="ideas-input"
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />

              <label className="ideas-label">Whose idea?</label>
              <div className="ideas-author-toggle">
                {AUTHORS.map(a => (
                  <button
                    type="button"
                    key={a}
                    className={`ideas-author-btn${form.author === a ? " active" : ""}`}
                    onClick={() => setForm(f => ({ ...f, author: a }))}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="ideas-form-actions">
                <button
                  type="button"
                  className="ideas-cancel-btn"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                >
                  Cancel
                </button>
                <button type="submit" className="ideas-submit-btn" disabled={saving}>
                  {saving ? "Saving..." : "Add Idea"}
                </button>
              </div>
            </form>
          </div>
        )}

        {ideas.length === 0 && !showForm && (
          <div className="ideas-empty">No big ideas yet — tap + to add the first one!</div>
        )}

        <div className="ideas-list">
          {ideas.map(idea => (
            <div key={idea.id} className="idea-card">
              {idea.image_url && (
                <img
                  className="idea-image"
                  src={idea.image_url}
                  alt={idea.title}
                  onError={e => { e.target.style.display = "none"; }}
                />
              )}
              <div className="idea-body">
                <div className="idea-top-row">
                  <h2 className="idea-card-title">{idea.title}</h2>
                  <button
                    className="idea-delete"
                    onClick={() => handleDelete(idea.id)}
                    aria-label="Delete idea"
                  >
                    ✕
                  </button>
                </div>
                {idea.description && <p className="idea-description">{idea.description}</p>}
                <div className="idea-footer">
                  <span className={`idea-author idea-author--${idea.author.toLowerCase()}`}>
                    {idea.author}
                  </span>
                  <span className="idea-date">
                    {new Date(idea.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {idea.link && (
                    <a
                      className="idea-link-btn"
                      href={idea.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔗 Open link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
