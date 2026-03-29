import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./GroceryList.css";

export default function GroceryList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [priority, setPriority] = useState("later");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("groceries")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setItems(data);
    };
    fetchItems();

    // Listen for any changes made by you or Tommy
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

    await supabase.from("groceries").insert({ name: trimmed, checked: false, priority });
    setNewItem("");
    setPriority("later");
  };

  const toggleItem = async (item) => {
    await supabase
      .from("groceries")
      .update({ checked: !item.checked })
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
    <li key={item.id} className={"item" + (isChecked ? " checked" : "")}>
      <button
        className={"checkbox" + (isChecked ? " checked" : "")}
        onClick={() => toggleItem(item)}
        aria-label={isChecked ? "Mark as not got" : "Mark as got"}
      >{isChecked ? "✓" : ""}</button>

      {!isChecked && (
        <button className="item-priority" onClick={() => togglePriority(item)} title="Change priority">
          {item.priority === "urgent" ? "⚡" : "💤"}
        </button>
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
    </li>
  );

  return (
    <div className="page-bg">
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
        <button type="submit" className="add-button">Add</button>
      </form>

      <ul className="item-list">
        {unchecked.map((item) => renderItem(item, false))}
      </ul>

      {checked.length > 0 && (
        <>
          <p className="got-label">Got</p>
          <ul className="item-list">
            {checked.map((item) => renderItem(item, true))}
          </ul>
        </>
      )}
    </div>
    </div>
  );
}
