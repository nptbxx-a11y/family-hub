import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./GroceryList.css";

export default function GroceryList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [priority, setPriority] = useState("later");

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("groceries")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setItems(data);
    };
    fetchItems();

    // Listen for any changes made by you or Laura
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

  const unchecked = items
    .filter((item) => !item.checked)
    .sort((a, b) => (a.priority === "urgent" ? -1 : 1));
  const checked = items.filter((item) => item.checked);

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
        {unchecked.map((item) => (
          <li key={item.id} className="item">
            <button
              className="checkbox"
              onClick={() => toggleItem(item)}
              aria-label="Mark as got"
            />
            <span className="item-priority">{item.priority === "urgent" ? "⚡" : "💤"}</span>
            <span className="item-name">{item.name}</span>
            <button
              className="delete-button"
              onClick={() => deleteItem(item.id)}
              aria-label="Remove item"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {checked.length > 0 && (
        <>
          <p className="got-label">Got</p>
          <ul className="item-list">
            {checked.map((item) => (
              <li key={item.id} className="item checked">
                <button
                  className="checkbox checked"
                  onClick={() => toggleItem(item)}
                  aria-label="Mark as not got"
                >
                  ✓
                </button>
                <span className="item-name">{item.name}</span>
                <button
                  className="delete-button"
                  onClick={() => deleteItem(item.id)}
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    </div>
  );
}
