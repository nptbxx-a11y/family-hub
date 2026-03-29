import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./RecipeList.css";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snacks", "Other"];

// ── Cuisine auto-detection ──
const CUISINE_KEYWORDS = {
  Asian: [
    "fried rice", "egg fried", "pad thai", "stir fry", "stir-fry", "ramen", "pho", "dim sum",
    "dumpling", "wonton", "teriyaki", "miso", "kimchi", "sushi", "sashimi", "tempura",
    "kra pao", "pad kra", "pad see ew", "larb", "som tam", "gyoza", "baozi", "bao bun",
    "satay", "laksa", "rendang", "nasi goreng", "fried noodle",
    "soy sauce", "sesame oil", "fish sauce", "oyster sauce", "hoisin", "gochujang",
    "lemongrass", "galangal", "sriracha", "bok choy", "tofu", "edamame", "nori",
    "rice wine", "mirin", "dashi", "rice noodle", "glass noodle",
  ],
  Italian: [
    "pasta", "spaghetti", "penne", "rigatoni", "linguine", "fettuccine", "tagliatelle",
    "lasagne", "lasagna", "pizza", "risotto", "gnocchi", "arancini", "carbonara",
    "bolognese", "arrabiata", "amatriciana", "cacio e pepe", "puttanesca",
    "parmesan", "parmigiano", "mozzarella", "prosciutto", "pancetta", "ricotta",
    "pecorino", "pesto", "marinara", "focaccia", "ciabatta", "tiramisu", "cannoli",
    "biscotti", "bruschetta", "calzone", "antipasto",
  ],
  Indian: [
    "curry", "masala", "tikka", "biryani", "dal", "dhal", "lentil", "naan", "roti",
    "chapati", "ghee", "turmeric", "garam masala", "cardamom", "fenugreek", "paneer",
    "chutney", "samosa", "basmati", "tandoori", "korma", "vindaloo", "saag", "aloo",
    "chana", "rajma", "palak", "bhaji", "pakora", "dosa", "idli", "raita",
    "cumin seeds", "mustard seeds", "curry leaves", "asafoetida",
  ],
  Mexican: [
    "taco", "burrito", "enchilada", "quesadilla", "salsa", "guacamole", "jalapeño",
    "jalapeno", "chipotle", "tortilla", "fajita", "tamale", "nachos", "refried beans",
    "carne asada", "carnitas", "tomatillo", "poblano", "ancho", "mole", "churro",
    "pico de gallo", "sour cream", "cheddar",
  ],
  "Middle Eastern": [
    "hummus", "falafel", "shawarma", "kebab", "tahini", "zaatar", "za'atar", "sumac",
    "pita", "flatbread", "bulgur", "pomegranate molasses", "harissa", "baharat",
    "ras el hanout", "dukkah", "fattoush", "tabbouleh", "baba ganoush", "kofta",
    "halloumi", "labneh", "freekeh",
  ],
  Mediterranean: [
    "feta", "tzatziki", "moussaka", "spanakopita", "gyros", "calamari", "olives",
    "capers", "artichoke", "sundried tomato", "greek salad", "orzo",
  ],
  French: [
    "bechamel", "béchamel", "roux", "creme brulee", "crème brûlée", "souffle", "soufflé",
    "croissant", "brioche", "quiche", "cassoulet", "ratatouille", "bouillabaisse",
    "coq au vin", "crepe", "crêpe", "gratin", "dijon", "tarragon", "beurre blanc",
    "vichyssoise", "confit", "velouté",
  ],
  American: [
    "burger", "bbq", "barbecue", "mac and cheese", "macaroni and cheese", "pancake",
    "waffle", "pulled pork", "coleslaw", "cornbread", "buffalo", "ranch dressing",
    "cheeseburger", "hot dog", "brownie", "cheesecake",
  ],
  British: [
    "shepherd's pie", "shepherds pie", "cottage pie", "bangers", "yorkshire pudding",
    "sunday roast", "fish and chips", "scone", "crumble", "treacle", "marmite",
    "pasty", "sausage roll", "jacket potato", "toad in the hole", "spotted dick",
  ],
};

function detectCuisine(name, ingredients) {
  const text = (name + " " + ingredients).toLowerCase();
  const scores = {};
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    scores[cuisine] = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  }
  const [best, count] = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return count > 0 ? best : null;
}

const CUISINES = [
  { name: "Italian",        emoji: "🍝" },
  { name: "Asian",          emoji: "🍜" },
  { name: "Indian",         emoji: "🍛" },
  { name: "Mexican",        emoji: "🌮" },
  { name: "Middle Eastern", emoji: "🥙" },
  { name: "Mediterranean",  emoji: "🫒" },
  { name: "French",         emoji: "🥐" },
  { name: "American",       emoji: "🍔" },
  { name: "British",        emoji: "🫖" },
  { name: "Other",          emoji: "🌍" },
];
const EMPTY_FORM = { name: "", link: "", category: "Dinner", cuisine: "Other", ingredients: "", notes: "" };

export default function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [activeCuisine, setActiveCuisine] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [fetchingIngredients, setFetchingIngredients] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");

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

  const handleExpand = (recipe) => {
    const isOpening = expanded !== recipe.id;
    setExpanded(isOpening ? recipe.id : null);
    if (isOpening && recipe.ingredients) {
      const lines = recipe.ingredients.split("\n").map((l) => l.trim()).filter(Boolean);
      const allSelected = {};
      lines.forEach((line) => (allSelected[line] = true));
      setSelectedIngredients(allSelected);
    }
  };

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients((prev) => ({ ...prev, [ingredient]: !prev[ingredient] }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, cuisine: activeCuisine || "Other" });
    setShowForm(true);
  };

  const openEditForm = (recipe) => {
    setEditingId(recipe.id);
    setForm({
      name: recipe.name,
      link: recipe.link || "",
      category: recipe.category,
      cuisine: recipe.cuisine || "Other",
      ingredients: recipe.ingredients || "",
      notes: recipe.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFetchMessage("");
  };

  const fetchIngredients = async () => {
    if (!form.link.trim()) return;
    setFetchingIngredients(true);
    setFetchMessage("");
    const isInstagram = form.link.includes("instagram.com");
    try {
      const res = await fetch(`/api/parse-recipe?url=${encodeURIComponent(form.link.trim())}`);
      const data = await res.json();
      if (data.ingredients) {
        const detected = detectCuisine(form.name, data.ingredients);
        setForm((f) => ({
          ...f,
          ingredients: data.ingredients,
          ...(detected && f.cuisine === "Other" ? { cuisine: detected } : {}),
        }));
        const cuisineNote = detected && form.cuisine === "Other" ? ` Cuisine set to ${detected}.` : "";
        setFetchMessage(data.source === "instagram_caption"
          ? `✓ Ingredients found in the caption — check and edit if needed!${cuisineNote}`
          : `✓ Ingredients imported!${cuisineNote}`);
      } else if (data.message === "instagram_no_caption") {
        setFetchMessage("Instagram blocked access to this reel. Make sure the post is public, or add ingredients manually.");
      } else if (data.message === "instagram_no_ingredients") {
        setFetchMessage("Caption found but no ingredient list detected — this reel may be voiceover only. Add ingredients manually.");
      } else {
        setFetchMessage(isInstagram
          ? "No ingredient list found in the caption — this reel may be voiceover only. Add ingredients manually."
          : "Couldn't find ingredients on that page — try adding them manually.");
      }
    } catch {
      setFetchMessage("Something went wrong — try adding ingredients manually.");
    }
    setFetchingIngredients(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const detectedCuisine = form.cuisine === "Other"
      ? (detectCuisine(form.name.trim(), form.ingredients.trim()) || "Other")
      : form.cuisine;
    const payload = {
      name: form.name.trim(),
      link: form.link.trim(),
      category: form.category,
      cuisine: detectedCuisine,
      ingredients: form.ingredients.trim(),
      notes: form.notes.trim(),
    };
    if (editingId) {
      await supabase.from("recipes").update(payload).eq("id", editingId);
    } else {
      await supabase.from("recipes").insert(payload);
    }
    closeForm();
  };

  const deleteRecipe = async (id) => {
    await supabase.from("recipes").delete().eq("id", id);
    if (expanded === id) setExpanded(null);
  };

  const addSelectedToGroceries = async () => {
    const toAdd = Object.entries(selectedIngredients).filter(([, v]) => v).map(([k]) => k);
    if (!toAdd.length) return;
    setAdding(true);
    await Promise.all(toAdd.map((name) => supabase.from("groceries").insert({ name, checked: false })));
    setAdding(false);
    alert(toAdd.length + " ingredient" + (toAdd.length > 1 ? "s" : "") + " added to your grocery list!");
  };

  // Count recipes per cuisine
  const countFor = (cuisine) => recipes.filter((r) => (r.cuisine || "Other") === cuisine).length;

  // Filtered recipes when inside a cuisine
  const inCuisine = activeCuisine
    ? recipes.filter((r) => (r.cuisine || "Other") === activeCuisine)
    : [];
  const filtered = activeCategory === "All"
    ? inCuisine
    : inCuisine.filter((r) => r.category === activeCategory);

  // ── Cuisine grid view ──
  if (!activeCuisine) {
    return (
      <div className="page-bg">
        <div className="recipe-container">
          <div className="recipe-header">
            <h1 className="recipe-title">Recipes</h1>
            <button className="add-recipe-button" onClick={showForm ? closeForm : openAddForm}>
              {showForm ? "Cancel" : "+ Add Recipe"}
            </button>
          </div>

          {showForm && renderForm()}

          <div className="cuisine-grid">
            {CUISINES.map((c) => (
              <button
                key={c.name}
                className="cuisine-tile"
                onClick={() => { setActiveCuisine(c.name); setActiveCategory("All"); setExpanded(null); }}
                disabled={countFor(c.name) === 0}
              >
                <span className="cuisine-emoji">{c.emoji}</span>
                <span className="cuisine-name">{c.name}</span>
                <span className="cuisine-count">{countFor(c.name)} recipe{countFor(c.name) !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Recipe list view (inside a cuisine) ──
  const cuisineObj = CUISINES.find((c) => c.name === activeCuisine);
  return (
    <div className="page-bg">
      <div className="recipe-container">
        <div className="recipe-header">
          <div className="cuisine-back-header">
            <button className="back-button" onClick={() => { setActiveCuisine(null); setExpanded(null); setShowForm(false); }}>
              ← Cuisines
            </button>
            <h1 className="recipe-title">{cuisineObj?.emoji} {activeCuisine}</h1>
          </div>
          <button className="add-recipe-button" onClick={showForm ? closeForm : openAddForm}>
            {showForm ? "Cancel" : "+ Add Recipe"}
          </button>
        </div>

        {showForm && renderForm()}

        <div className="category-tabs">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} className={"category-tab " + (activeCategory === c ? "active" : "")} onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        <ul className="recipe-list">
          {filtered.length === 0 && <p className="empty-message">No {activeCategory !== "All" ? activeCategory.toLowerCase() + " " : ""}recipes in {activeCuisine} yet!</p>}
          {filtered.map((recipe) => (
            <li key={recipe.id} className="recipe-item">
              <div className="recipe-row" onClick={() => handleExpand(recipe)}>
                <div>
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-category">{recipe.category}</span>
                </div>
                <span className="recipe-chevron">{expanded === recipe.id ? "▲" : "▼"}</span>
              </div>
              {expanded === recipe.id && (
                <div className="recipe-detail">
                  {recipe.link && <a href={recipe.link} target="_blank" rel="noreferrer" className="recipe-link">View full recipe</a>}
                  {recipe.ingredients && (
                    <div className="detail-section">
                      <p className="detail-label">Ingredients - tick what you need</p>
                      <ul className="ingredient-list">
                        {recipe.ingredients.split("\n").map((l) => l.trim()).filter(Boolean).map((ingredient) => (
                          <li key={ingredient} className="ingredient-item" onClick={() => toggleIngredient(ingredient)}>
                            <span className={"ingredient-checkbox " + (selectedIngredients[ingredient] ? "checked" : "")}>
                              {selectedIngredients[ingredient] ? "✓" : ""}
                            </span>
                            <span className={"ingredient-name " + (selectedIngredients[ingredient] ? "" : "deselected")}>
                              {ingredient}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button className="grocery-button" onClick={addSelectedToGroceries} disabled={adding || Object.values(selectedIngredients).every((v) => !v)}>
                        {adding ? "Adding..." : "Add selected to Grocery List"}
                      </button>
                    </div>
                  )}
                  {recipe.notes && (
                    <div className="detail-section">
                      <p className="detail-label">Notes</p>
                      <pre className="detail-text">{recipe.notes}</pre>
                    </div>
                  )}
                  <div className="recipe-actions">
                    <button className="edit-recipe-button" onClick={() => openEditForm(recipe)}>Edit recipe</button>
                    <button className="delete-recipe-button" onClick={() => deleteRecipe(recipe.id)}>Delete recipe</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="recipe-form">
        <p className="form-title">{editingId ? "Edit Recipe" : "New Recipe"}</p>
        <input className="form-input" placeholder="Recipe name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="link-row">
          <input className="form-input link-input" placeholder="Link to recipe (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          {form.link.trim() && (
            <button type="button" className="fetch-btn" onClick={fetchIngredients} disabled={fetchingIngredients}>
              {fetchingIngredients ? "..." : form.link.includes("instagram.com") ? "📸 Scan reel" : "🔍 Get ingredients"}
            </button>
          )}
        </div>
        {fetchMessage && <p className="fetch-message">{fetchMessage}</p>}
        <div className="form-row">
          <select className="form-input" value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })}>
            {CUISINES.map((c) => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
          <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea className="form-input" placeholder="Ingredients (one per line)" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} rows={5} />
        <textarea className="form-input" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        <button type="submit" className="submit-button">{editingId ? "Save Changes" : "Save Recipe"}</button>
      </form>
    );
  }
}
