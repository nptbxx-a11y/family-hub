import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import "./RecipeList.css";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snacks", "Other"];

// ── Protein auto-detection ──
const PROTEIN_KEYWORDS = {
  Chicken: [
    "chicken", "poultry", "hen", "drumstick", "thigh", "breast fillet", "wing",
  ],
  Beef: [
    "beef", "steak", "mince", "ground beef", "brisket", "ribeye", "sirloin", "rump",
    "chuck", "short rib", "oxtail", "veal",
  ],
  Pork: [
    "pork", "bacon", "ham", "sausage", "chorizo", "pancetta", "prosciutto", "lardons",
    "pulled pork", "gammon", "belly pork", "pork mince",
  ],
  Fish: [
    "salmon", "tuna", "cod", "haddock", "sea bass", "trout", "tilapia", "mackerel",
    "halibut", "snapper", "bream", "sardine", "anchovy", "fish fillet", "fish",
  ],
  Lamb: [
    "lamb", "mutton", "rack of lamb", "lamb mince", "lamb chop", "lamb shank",
  ],
  Seafood: [
    "prawn", "shrimp", "crab", "lobster", "scallop", "mussel", "clam", "squid",
    "octopus", "langoustine", "oyster", "seafood",
  ],
  Veggie: [
    "tofu", "tempeh", "lentil", "dal", "dhal", "chickpea", "black bean", "kidney bean",
    "butter bean", "cannellini", "paneer", "halloumi", "quorn", "seitan",
    "vegetarian", "vegan", "veggie",
  ],
};

function detectProtein(name, ingredients) {
  const text = (name + " " + ingredients).toLowerCase();
  const scores = {};
  for (const [protein, keywords] of Object.entries(PROTEIN_KEYWORDS)) {
    scores[protein] = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  }
  const [best, count] = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return count > 0 ? best : null;
}

const PROTEINS = [
  { name: "Chicken", emoji: "🍗" },
  { name: "Beef",    emoji: "🥩" },
  { name: "Pork",    emoji: "🥓" },
  { name: "Fish",    emoji: "🐟" },
  { name: "Lamb",    emoji: "🫕" },
  { name: "Seafood", emoji: "🦐" },
  { name: "Veggie",  emoji: "🥦" },
  { name: "Other",   emoji: "🍽️" },
];
const EMPTY_FORM = { name: "", link: "", category: "Dinner", cuisine: "Other", ingredients: "", notes: "" };

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

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
      if (!data) return;

      // Auto-categorise any recipes that don't already have a protein value
      const PROTEIN_NAMES = PROTEINS.map((p) => p.name);
      const needsUpdate = data.filter((r) => !PROTEIN_NAMES.includes(r.cuisine));
      if (needsUpdate.length > 0) {
        await Promise.all(
          needsUpdate.map((r) => {
            const detected = detectProtein(r.name, r.ingredients || "") || "Other";
            return supabase.from("recipes").update({ cuisine: detected }).eq("id", r.id);
          })
        );
        // Re-fetch after updating
        const { data: updated } = await supabase
          .from("recipes")
          .select("*")
          .order("created_at", { ascending: false });
        if (updated) setRecipes(updated);
      } else {
        setRecipes(data);
      }
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
        const detected = detectProtein(form.name, data.ingredients);
        setForm((f) => ({
          ...f,
          ingredients: data.ingredients,
          ...(detected && f.cuisine === "Other" ? { cuisine: detected } : {}),
        }));
        const cuisineNote = detected && form.cuisine === "Other" ? ` Category set to ${detected}.` : "";
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
      ? (detectProtein(form.name.trim(), form.ingredients.trim()) || "Other")
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
      // Optimistic: update local state immediately, close form, then persist
      setRecipes((prev) => prev.map((r) => r.id === editingId ? { ...r, ...payload } : r));
      closeForm();
      await supabase.from("recipes").update(payload).eq("id", editingId);
    } else {
      // Optimistic: insert then prepend real record
      closeForm();
      const { data } = await supabase.from("recipes").insert(payload).select().single();
      if (data) setRecipes((prev) => [data, ...prev]);
    }
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

  // Normalise old cuisine values to "Other" if not a known protein
  const PROTEIN_NAMES = PROTEINS.map((p) => p.name);
  const toProtein = (cuisine) => PROTEIN_NAMES.includes(cuisine) ? cuisine : "Other";

  // Count recipes per protein
  const countFor = (protein) => recipes.filter((r) => toProtein(r.cuisine) === protein).length;

  // Filtered recipes when inside a protein
  const inProtein = activeCuisine
    ? recipes.filter((r) => toProtein(r.cuisine) === activeCuisine)
    : [];
  const filtered = activeCategory === "All"
    ? inProtein
    : inProtein.filter((r) => r.category === activeCategory);

  // ── Protein grid view ──
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
            {PROTEINS.map((c) => (
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

  // ── Recipe list view (inside a protein) ──
  const cuisineObj = PROTEINS.find((c) => c.name === activeCuisine);
  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="recipe-container">
        <div className="recipe-header">
          <div className="cuisine-back-header">
            <button className="back-button" onClick={() => { setActiveCuisine(null); setExpanded(null); setShowForm(false); }}>
              ← Recipes
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
            <motion.button key={c} className={"category-tab " + (activeCategory === c ? "active" : "")} onClick={() => setActiveCategory(c)} whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              {c}
            </motion.button>
          ))}
        </div>

        <motion.ul className="recipe-list" variants={listVariants} initial="hidden" animate="show">
          {filtered.length === 0 && <p className="empty-message">No {activeCategory !== "All" ? activeCategory.toLowerCase() + " " : ""}recipes here yet!</p>}
          {filtered.map((recipe) => (
            <motion.li key={recipe.id} className="recipe-item" variants={cardVariants} layout>
              <div className="recipe-row" onClick={() => handleExpand(recipe)}>
                <div>
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-category">{recipe.category}</span>
                </div>
                <span className="recipe-chevron">{expanded === recipe.id ? "▲" : "▼"}</span>
              </div>
              <AnimatePresence>
                {expanded === recipe.id && (
                  <motion.div
                    variants={expandVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ overflow: "hidden" }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
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
            {PROTEINS.map((c) => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
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
