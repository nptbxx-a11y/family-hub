import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./RecipeList.css";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snacks", "Other"];

export default function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    link: "",
    category: "Dinner",
    ingredients: "",
    notes: "",
  });

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setRecipes(data);
    };
    fetchRecipes();

    const channel = supabase
      .channel("recipes")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, fetchRecipes)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    await supabase.from("recipes").insert({
      name: form.name.trim(),
      link: form.link.trim(),
      category: form.category,
      ingredients: form.ingredients.trim(),
      notes: form.notes.trim(),
    });

    setForm({ name: "", link: "", category: "Dinner", ingredients: "", notes: "" });
    setShowForm(false);
  };

  const deleteRecipe = async (id) => {
    await supabase.from("recipes").delete().eq("id", id);
    if (expanded === id) setExpanded(null);
  };

  const addToGroceries = async (ingredients) => {
    if (!ingredients.trim()) return;
    setAdding(true);

    const lines = ingredients
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    await Promise.all(
      lines.map((name) =>
        supabase.from("groceries").insert({ name, checked: false })
      )
    );

    setAdding(false);
    alert("Ingredients added to your grocery list!");
  };

  const filtered =
    activeCategory === "All"
      ? recipes
      : recipes.filter((r) => r.category === activeCategory);

  return (
    <div className="recipe-container">
      <div className="recipe-header">
        <h1 className="recipe-title">Recipes</h1>
        <button className="add-recipe-button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Recipe"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="recipe-form">
          <input
            className="form-input"
            placeholder="Recipe name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="form-input"
            placeholder="Link to recipe (optional)"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
          <select
            className="form-input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <textarea
            className="form-input"
            placeholder={"Ingredients (one per line)\ne.g.\n2 eggs\n1 cup flour"}
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            rows={5}
          />
          <textarea
            className="form-input"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
          <button type="submit" className="submit-button">Save Recipe</button>
        </form>
      )}

      <div className="category-tabs">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={`category-tab ${activeCategory === c ? "active" : ""}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="recipe-list">
        {filtered.length === 0 && (
          <p className="empty-message">No recipes yet — add one above!</p>
        )}
        {filtered.map((recipe) => (
          <li key={recipe.id} className="recipe-item">
            <div className="recipe-row" onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}>
              <div>
                <span className="recipe-name">{recipe.name}</span>
                <span className="recipe-category">{recipe.category}</span>
              </div>
              <span className="recipe-chevron">{expanded === recipe.id ? "▲" : "▼"}</span>
            </div>

            {expanded === recipe.id && (
              <div className="recipe-detail">
                {recipe.link && (
                  <a href={recipe.link} target="_blank" rel="noreferrer" className="recipe-link">
                    View full recipe →
                  </a>
                )}
                {recipe.ingredients && (
                  <div className="detail-section">
                    <p className="detail-label">Ingredients</p>
                    <pre className="detail-text">{recipe.ingredients}</pre>
                    <button
                      className="grocery-button"
                      onClick={() => addToGroceries(recipe.ingredients)}
                      disabled={adding}
                    >
                      {adding ? "Adding..." : "Add to Grocery List"}
                    </button>
                  </div>
                )}
                {recipe.notes && (
                  <div className="detail-section">
                    <p className="detail-label">Notes</p>
                    <pre className="detail-text">{recipe.notes}</pre>
                  </div>
                )}
                <button className="delete-recipe-button" onClick={() => deleteRecipe(recipe.id)}>
                  Delete recipe
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
