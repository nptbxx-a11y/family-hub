import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./MealPlan.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MealPlan() {
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [picking, setPicking] = useState(null);
  const [freeText, setFreeText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: mealData }, { data: recipeData }] = await Promise.all([
        supabase.from("meal_plan").select("*"),
        supabase.from("recipes").select("id, name, category").order("name"),
      ]);
      if (mealData) setMeals(mealData);
      if (recipeData) setRecipes(recipeData);
    };
    fetchData();

    const channel = supabase
      .channel("meal_plan")
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_plan" }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const getMealForDay = (day) => meals.find((m) => m.day_of_week === day);

  const assignMeal = async (day, mealName, recipeId = null) => {
    const existing = getMealForDay(day);
    if (existing) {
      setMeals((prev) => prev.map((m) => m.id === existing.id ? { ...m, recipe_id: recipeId, recipe_name: mealName, cooked: false } : m));
      const { error } = await supabase.from("meal_plan").update({ recipe_id: recipeId, recipe_name: mealName, cooked: false }).eq("id", existing.id);
      if (error) {
        alert("Couldn't save meal: " + error.message);
        setMeals((prev) => prev.map((m) => m.id === existing.id ? existing : m));
      }
    } else {
      const tempId = "temp-" + day;
      setMeals((prev) => [...prev, { id: tempId, day_of_week: day, recipe_id: recipeId, recipe_name: mealName, cooked: false }]);
      const { data, error } = await supabase.from("meal_plan").insert({ day_of_week: day, recipe_id: recipeId, recipe_name: mealName, cooked: false }).select().single();
      if (error) {
        alert("Couldn't save meal: " + error.message);
        setMeals((prev) => prev.filter((m) => m.id !== tempId));
      } else if (data) {
        setMeals((prev) => prev.map((m) => m.id === tempId ? data : m));
      }
    }
    setPicking(null);
    setFreeText("");
  };

  const clearMeal = async (day) => {
    const existing = getMealForDay(day);
    if (!existing) return;
    setMeals((prev) => prev.filter((m) => m.id !== existing.id));
    const { error } = await supabase.from("meal_plan").delete().eq("id", existing.id);
    if (error) {
      setMeals((prev) => [...prev, existing]);
    }
  };

  const toggleCooked = async (meal) => {
    const newCooked = !meal.cooked;
    setMeals((prev) => prev.map((m) => m.id === meal.id ? { ...m, cooked: newCooked } : m));
    const { error } = await supabase.from("meal_plan").update({ cooked: newCooked }).eq("id", meal.id);
    if (error) {
      setMeals((prev) => prev.map((m) => m.id === meal.id ? meal : m));
    }
  };

  return (
    <div className="page-bg">
      <div className="meal-container">
        <h1 className="meal-title">This Week's Meals</h1>

        <div className="days-list">
          {DAYS.map((day) => {
            const meal = getMealForDay(day);
            return (
              <div key={day} className="day-card">
                <span className="day-name">{day}</span>

                {meal ? (
                  <div className="day-meal">
                    <button
                      className={"day-cooked" + (meal.cooked ? " cooked" : "")}
                      onClick={() => toggleCooked(meal)}
                      title={meal.cooked ? "Mark as not made" : "Mark as made"}
                    >
                      {meal.cooked ? "✓" : "○"}
                    </button>
                    <span className={"day-meal-name" + (meal.cooked ? " cooked" : "")}>{meal.recipe_name}</span>
                    <button className="day-change" onClick={() => { setPicking(day); setFreeText(""); }}>Change</button>
                    <button className="day-clear" onClick={() => clearMeal(day)}>✕</button>
                  </div>
                ) : (
                  <button className="day-add" onClick={() => { setPicking(day); setFreeText(""); }}>+ Add meal</button>
                )}
              </div>
            );
          })}
        </div>

        {picking && (
          <div className="picker-overlay" onClick={() => setPicking(null)}>
            <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                <span className="picker-title">Pick a meal for {picking}</span>
                <button className="picker-close" onClick={() => setPicking(null)}>✕</button>
              </div>
              <div className="picker-extras">
                <button className="picker-eating-out" onClick={() => assignMeal(picking, "🍽️ Eating out")}>
                  🍽️ Eating out
                </button>
                <div className="picker-freetext-row">
                  <input
                    className="picker-freetext-input"
                    placeholder="Type a meal name..."
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && freeText.trim() && assignMeal(picking, freeText.trim())}
                  />
                  <button
                    className="picker-freetext-btn"
                    onClick={() => freeText.trim() && assignMeal(picking, freeText.trim())}
                    disabled={!freeText.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
              <ul className="picker-list">
                {recipes.map((r) => (
                  <li key={r.id} className="picker-item" onClick={() => assignMeal(picking, r.name, r.id)}>
                    <span className="picker-recipe-name">{r.name}</span>
                    <span className="picker-recipe-category">{r.category}</span>
                  </li>
                ))}
                {recipes.length === 0 && (
                  <p className="picker-empty">No recipes yet — add some in the Recipes section first!</p>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
