import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import "./MealPlan.css";

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function getUpcomingDays() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(date) {
  // YYYY-MM-DD stored in day_of_week column
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return "Tonight";
  if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";

  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${dayName} ${day}${ordinalSuffix(day)} ${month}`;
}

function labelFromKey(dateKey) {
  // parse safely at noon to avoid timezone edge cases
  return formatDayLabel(new Date(dateKey + "T12:00:00"));
}

const dayCardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

const dayListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const mealAssignedVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 22 },
  },
};

export default function MealPlan() {
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [picking, setPicking] = useState(null); // dateKey string
  const [freeText, setFreeText] = useState("");

  const upcomingDays = getUpcomingDays();

  useEffect(() => {
    const keys = upcomingDays.map(toDateKey);
    const fetchData = async () => {
      const [{ data: mealData }, { data: recipeData }] = await Promise.all([
        supabase.from("meal_plan").select("*").in("day_of_week", keys),
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

  const getMealForDay = (dateKey) => meals.find((m) => m.day_of_week === dateKey);

  const assignMeal = async (dateKey, mealName, recipeId = null) => {
    const existing = getMealForDay(dateKey);
    if (existing) {
      setMeals((prev) => prev.map((m) => m.id === existing.id ? { ...m, recipe_id: recipeId, recipe_name: mealName, cooked: false } : m));
      const { error } = await supabase.from("meal_plan").update({ recipe_id: recipeId, recipe_name: mealName, cooked: false }).eq("id", existing.id);
      if (error) {
        alert("Couldn't save meal: " + error.message);
        setMeals((prev) => prev.map((m) => m.id === existing.id ? existing : m));
      }
    } else {
      const tempId = "temp-" + dateKey;
      setMeals((prev) => [...prev, { id: tempId, day_of_week: dateKey, recipe_id: recipeId, recipe_name: mealName, cooked: false }]);
      const { data, error } = await supabase.from("meal_plan").insert({ day_of_week: dateKey, recipe_id: recipeId, recipe_name: mealName, cooked: false }).select().single();
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

  const clearMeal = async (dateKey) => {
    const existing = getMealForDay(dateKey);
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
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="meal-container">
        <h1 className="meal-title">This Week's Meals</h1>

        <motion.div className="days-list" variants={dayListVariants} initial="hidden" animate="show">
          {upcomingDays.map((date) => {
            const dateKey = toDateKey(date);
            const label = formatDayLabel(date);
            const meal = getMealForDay(dateKey);
            const isToday = dateKey === toDateKey(new Date());
            return (
              <motion.div key={dateKey} className={"day-card" + (isToday ? " today" : "")} variants={dayCardVariants} layout>
                <span className="day-name">{label}</span>

                <AnimatePresence mode="popLayout">
                  {meal ? (
                    <motion.div
                      key={meal.id}
                      className="day-meal"
                      variants={mealAssignedVariants}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                    >
                      <button
                        className={"day-cooked" + (meal.cooked ? " cooked" : "")}
                        onClick={() => toggleCooked(meal)}
                        title={meal.cooked ? "Mark as not made" : "Mark as made"}
                      >
                        🧑‍🍳
                      </button>
                      <span className={"day-meal-name" + (meal.cooked ? " cooked" : "")}>{meal.recipe_name}</span>
                      <button className="day-change" onClick={() => { setPicking(dateKey); setFreeText(""); }}>Change</button>
                      <button className="day-clear" onClick={() => clearMeal(dateKey)}>✕</button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="empty"
                      className="day-add"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => { setPicking(dateKey); setFreeText(""); }}
                    >+ Add meal</motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {picking && (
          <motion.div
            className="picker-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPicking(null)}
          >
            <motion.div
              className="picker-modal"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="picker-header">
                <span className="picker-title">Pick a meal for {labelFromKey(picking)}</span>
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
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
