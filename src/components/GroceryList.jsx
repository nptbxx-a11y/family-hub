import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import "./GroceryList.css";

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
};

export default function GroceryList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [priority, setPriority] = useState("later");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    const clearOldItems = async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await Promise.all([
        supabase.from("groceries").delete().eq("checked", true).lt("checked_at", cutoff),
        supabase.from("groceries").delete().eq("checked", true).is("checked_at", null),
      ]);
    };

    const fetchItems = async () => {
      const { data } = await supabase
        .from("groceries")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setItems(data);
    };

    // Clean up old items once on mount, then fetch
    clearOldItems().then(fetchItems);

    // Realtime: just re-fetch, no cleanup
    const channel = supabase
      .channel("groceries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groceries" },
        () => fetchItems()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;

    // Optimistic: show immediately, replace with real record when it comes back
    const tempId = `temp-${Date.now()}`;
    const tempItem = { id: tempId, name: trimmed, checked: false, priority, created_at: new Date().toISOString(), checked_at: null };
    setItems((prev) => [...prev, tempItem]);
    setNewItem("");
    setPriority("later");

    const { data } = await supabase
      .from("groceries")
      .insert({ name: trimmed, checked: false, priority })
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => i.id === tempId ? data : i));
    }
  };

  const toggleItem = async (item) => {
    const nowChecked = !item.checked;
    await supabase
      .from("groceries")
      .update({ checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null })
      .eq("id", item.id);
  };

  const deleteItem = async (id) => {
    await supabase.from("groceries").delete().eq("id", id);
  };

  const togglePriority = async (item) => {
    const next = item.priority === "urgent" ? "later" : "urgent";
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, priority: next } : i));
    await supabase.from("groceries").update({ priority: next }).eq("id", item.id);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEdit = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: trimmed } : i));
    setEditingId(null);
    await supabase.from("groceries").update({ name: trimmed }).eq("id", id);
  };

  const unchecked = items
    .filter((item) => !item.checked)
    .sort((a, b) => (a.priority === "urgent" ? -1 : 1));
  const checked = items.filter((item) => item.checked);

  const renderItem = (item, isChecked) => (
    <motion.li
      key={item.id}
      className={"item" + (isChecked ? " checked" : "")}
      variants={itemVariants}
      layout
      exit="exit"
    >
      <motion.button
        className={"checkbox" + (isChecked ? " checked" : "")}
        onClick={() => toggleItem(item)}
        aria-label={isChecked ? "Mark as not got" : "Mark as got"}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >{isChecked ? "✓" : ""}</motion.button>

      {!isChecked && (
        <motion.button
          className="item-priority"
          onClick={() => togglePriority(item)}
          title="Change priority"
          whileTap={{ scale: 0.75, rotate: 15 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          {item.priority === "urgent" ? "⚡" : "💤"}
        </motion.button>
      )}

      {editingId === item.id ? (
        <input
          className="edit-input"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={() => saveEdit(item.id)}
          onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
          autoFocus
        />
      ) : (
        <span className="item-name" onClick={() => !isChecked && startEdit(item)}>
          {item.name}
        </span>
      )}

      <button
        className="delete-button"
        onClick={() => deleteItem(item.id)}
        aria-label="Remove item"
      >✕</button>
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
      <div className="grocery-container">
        <h1 className="grocery-title">Grocery List</h1>

        <form onSubmit={addItem} className="add-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item..."
            className="add-input"
          />
          <div className="priority-toggle">
            <button
              type="button"
              className={"priority-btn" + (priority === "urgent" ? " selected" : "")}
              onClick={() => setPriority("urgent")}
              title="Urgent"
            >⚡</button>
            <button
              type="button"
              className={"priority-btn" + (priority === "later" ? " selected" : "")}
              onClick={() => setPriority("later")}
              title="Later"
            >💤</button>
          </div>
          <motion.button
            type="submit"
            className="add-button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >Add</motion.button>
        </form>

        <ul className="item-list">
          <AnimatePresence mode="popLayout">
            {unchecked.map((item) => renderItem(item, false))}
          </AnimatePresence>
        </ul>

        {checked.length > 0 && (
          <>
            <p className="got-label">Got</p>
            <ul className="item-list">
              <AnimatePresence mode="popLayout">
                {checked.map((item) => renderItem(item, true))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
    </motion.div>
  );
}
