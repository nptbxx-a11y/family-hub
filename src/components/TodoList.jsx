import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./TodoList.css";

const ASSIGNEES = ["Ozzy", "Tommy", "Both"];
const FILTERS = ["All", "Ozzy", "Tommy", "Both"];

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState("");
  const [assignedTo, setAssignedTo] = useState("Both");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchTodos = async () => {
      const { data } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setTodos(data);
    };
    fetchTodos();

    const channel = supabase
      .channel("todos")
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, fetchTodos)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const addTodo = async (e) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    await supabase.from("todos").insert({ task: trimmed, assigned_to: assignedTo, completed: false });
    setTask("");
  };

  const toggleComplete = async (todo) => {
    const next = !todo.completed;
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, completed: next } : t));
    await supabase.from("todos").update({ completed: next }).eq("id", todo.id);
  };

  const deleteTodo = async (id) => {
    await supabase.from("todos").delete().eq("id", id);
  };

  const pending = todos
    .filter((t) => !t.completed && (filter === "All" || t.assigned_to === filter));
  const done = todos
    .filter((t) => t.completed && (filter === "All" || t.assigned_to === filter));

  return (
    <div className="page-bg">
      <div className="todo-container">
        <h1 className="todo-title">To Do</h1>

        <form onSubmit={addTodo} className="todo-form">
          <input
            className="todo-input"
            placeholder="Add a task..."
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <div className="todo-form-row">
            <div className="assignee-toggle">
              {ASSIGNEES.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={"assignee-btn assignee-" + a.toLowerCase() + (assignedTo === a ? " selected" : "")}
                  onClick={() => setAssignedTo(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <button type="submit" className="todo-add-btn">Add</button>
          </div>
        </form>

        <div className="todo-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={"todo-filter-btn" + (filter === f ? " active" : "")}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <ul className="todo-list">
          {pending.length === 0 && done.length === 0 && (
            <p className="todo-empty">No tasks yet — add one above!</p>
          )}
          {pending.map((todo) => (
            <li key={todo.id} className="todo-item">
              <button
                className="todo-checkbox"
                onClick={() => toggleComplete(todo)}
                aria-label="Mark complete"
              />
              <span className="todo-task">{todo.task}</span>
              <span className={"todo-badge badge-" + todo.assigned_to.toLowerCase()}>
                {todo.assigned_to}
              </span>
              <button className="todo-delete" onClick={() => deleteTodo(todo.id)} aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <>
            <p className="todo-done-label">Done</p>
            <ul className="todo-list">
              {done.map((todo) => (
                <li key={todo.id} className="todo-item todo-item-done">
                  <button
                    className="todo-checkbox todo-checkbox-done"
                    onClick={() => toggleComplete(todo)}
                    aria-label="Mark incomplete"
                  >✓</button>
                  <span className="todo-task todo-task-done">{todo.task}</span>
                  <span className={"todo-badge badge-" + todo.assigned_to.toLowerCase()}>
                    {todo.assigned_to}
                  </span>
                  <button className="todo-delete" onClick={() => deleteTodo(todo.id)} aria-label="Delete">✕</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
