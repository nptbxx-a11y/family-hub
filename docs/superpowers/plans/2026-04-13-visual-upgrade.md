# Visual Upgrade — Luxury Night Sky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Family Hub with a richer aurora-glow visual system and a full framer-motion animation layer (spring physics, page transitions, staggered lists) across all pages.

**Architecture:** CSS variable + glassmorphism overhaul in `index.css`, aurora bloom via a `.aurora` div in `App.jsx`, framer-motion `AnimatePresence` page transitions wired through a new `AnimatedRoutes` component, and per-page spring animations replacing the current CSS keyframe approach.

**Tech Stack:** React 19, framer-motion (already installed), CSS custom properties

**Spec:** `docs/superpowers/specs/2026-04-13-visual-upgrade-design.md`

---

### Task 1: CSS Variables + Aurora Layer

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update CSS variables in `src/index.css`**

Replace the existing `:root` block (lines 10–23) with:

```css
:root {
  --bg:        #060C1F;
  --surface:   rgba(12, 15, 48, 0.82);
  --card-item: rgba(255, 255, 255, 0.06);
  --input-bg:  rgba(255, 255, 255, 0.05);
  --green-dark:  #D4785A;
  --green-light: #E8A48C;
  --yellow:  #FFD166;
  --purple:  #8b5cf6;
  --cream:   #f5f0e8;
  --brown:   #F0F4FF;
  --border:  rgba(140, 90, 255, 0.2);
  --white:   #ffffff;
}
```

- [ ] **Step 2: Add aurora div styles to `src/index.css`**

Add after the `:root` block and before `body {`:

```css
.aurora {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.aurora::before {
  content: '';
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 700px;
  height: 450px;
  background: radial-gradient(ellipse, rgba(100, 50, 220, 0.15) 0%, rgba(180, 80, 160, 0.06) 40%, transparent 70%);
  filter: blur(50px);
}

.aurora::after {
  content: '';
  position: absolute;
  bottom: 5%;
  right: 0%;
  width: 450px;
  height: 350px;
  background: radial-gradient(ellipse, rgba(212, 120, 90, 0.09) 0%, transparent 70%);
  filter: blur(55px);
}
```

- [ ] **Step 3: Add `.aurora` div to `src/App.jsx`**

In the logged-in return (the `<BrowserRouter>` block), add `<div className="aurora" />` as the first child, before `<NavBar>`:

```jsx
return (
  <BrowserRouter>
    <div className="aurora" />
    <NavBar onLogout={() => supabase.auth.signOut()} />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/groceries" element={<GroceryList />} />
      <Route path="/recipes" element={<RecipeList />} />
      <Route path="/meals" element={<MealPlan />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/todos" element={<TodoList />} />
    </Routes>
  </BrowserRouter>
);
```

- [ ] **Step 4: Verify visually**

Run `npm run dev`. Open the app. You should see a soft purple glow behind the page content and a faint coral warmth in the bottom-right corner. The stars should still be visible through it.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.jsx
git commit -m "feat: add aurora bloom layer and update CSS variables"
```

---

### Task 2: Glassmorphism Card Upgrade

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the glassmorphism rule in `src/index.css`**

Find the block that starts with `/* ── Glassmorphism: frosted dark glass on all main cards ── */` and replace the entire rule:

```css
/* ── Glassmorphism: frosted dark glass on all main cards ── */
.grocery-container,
.recipe-container,
.meal-container,
.feedback-container,
.todo-container,
.home-card,
.music-bar {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  background: var(--surface) !important;
  box-shadow:
    0 8px 48px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(180, 140, 255, 0.12),
    0 0 40px rgba(100, 50, 200, 0.1) !important;
  border: 1px solid var(--border) !important;
}
```

- [ ] **Step 2: Add accent glow to coral text elements**

Add after the glassmorphism rule:

```css
/* ── Coral accent glow on key labels ── */
.music-note,
.item-priority,
.priority-btn.selected {
  text-shadow: 0 0 10px rgba(212, 120, 90, 0.5);
}

/* ── Purple glow on primary buttons ── */
.add-button,
.submit-button,
.add-recipe-button,
.post-button {
  box-shadow: 0 4px 20px rgba(212, 120, 90, 0.25) !important;
}
```

- [ ] **Step 3: Upgrade days widget in `src/components/Home.css`**

Find `.days-widget` and replace it:

```css
.days-widget {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #4c1d8a, #6d28d9);
  border: 1px solid rgba(180, 120, 255, 0.25);
  border-radius: 12px;
  padding: 10px 20px;
  box-shadow: 0 4px 20px rgba(100, 40, 180, 0.35), inset 0 1px 0 rgba(220, 180, 255, 0.15);
}

.days-number {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--yellow);
  line-height: 1;
  text-shadow: 0 0 12px rgba(255, 210, 100, 0.5);
}
```

- [ ] **Step 4: Upgrade music bar in `src/components/Home.css`**

Find `.music-bar` and replace it:

```css
.music-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid rgba(212, 120, 90, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  max-width: 420px;
  width: 100%;
  min-width: 0;
  box-shadow: 0 0 24px rgba(212, 120, 90, 0.08);
}
```

- [ ] **Step 5: Upgrade home-card avatar ring in `src/components/Home.css`**

Find `.couple-icon` and replace it:

```css
.couple-icon {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(160, 100, 255, 0.35);
  margin: 0 auto 16px;
  background: var(--card-item);
  box-shadow: 0 0 24px rgba(120, 60, 220, 0.3);
}
```

- [ ] **Step 6: Verify visually**

Run `npm run dev`. Cards should have a purple-tinted border glow. The days widget should be a rich dark purple gradient. The music bar should have a faint coral border.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/Home.css
git commit -m "feat: upgrade glassmorphism cards with aurora glow and purple borders"
```

---

### Task 3: Page Transition System

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add framer-motion imports to `src/App.jsx`**

Add to the top of the file:

```jsx
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
```

- [ ] **Step 2: Create `AnimatedRoutes` component inside `src/App.jsx`**

Add this function above the `App` export:

```jsx
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/groceries" element={<GroceryList />} />
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/meals" element={<MealPlan />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/todos" element={<TodoList />} />
      </Routes>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Replace `<Routes>` in `App` return with `<AnimatedRoutes />`**

The logged-in return should now be:

```jsx
return (
  <BrowserRouter>
    <div className="aurora" />
    <NavBar onLogout={() => supabase.auth.signOut()} />
    <AnimatedRoutes />
  </BrowserRouter>
);
```

- [ ] **Step 4: Remove CSS pageEnter from `src/index.css`**

Delete this entire block (the CSS animation that page transitions will now replace):

```css
/* ── Page entrance animation ── */
.page-bg > * {
  animation: pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-container > * {
  animation: pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.home-container > *:nth-child(2) { animation-delay: 0.05s; }
.home-container > *:nth-child(3) { animation-delay: 0.1s; }
.home-container > *:nth-child(4) { animation-delay: 0.15s; }

@keyframes pageEnter {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 5: Verify**

Run `npm run dev`. Navigate between pages using the sidebar — each page should fade + slide up in, and fade + slide up out. No double animation should occur.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/index.css
git commit -m "feat: add framer-motion page transitions with AnimatePresence"
```

---

### Task 4: Home Page Animation

**Files:**
- Modify: `src/components/Home.jsx`
- Modify: `src/components/Home.css`

- [ ] **Step 1: Add framer-motion import to `src/components/Home.jsx`**

```jsx
import { motion } from "framer-motion";
```

- [ ] **Step 2: Add animation variants above the `Home` function**

```jsx
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};
```

- [ ] **Step 3: Replace the Home return with motion elements**

```jsx
return (
  <motion.div
    className="home-container"
    variants={containerVariants}
    initial="hidden"
    animate="show"
    exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
  >
    <motion.div className="home-card" variants={itemVariants}>
      <div className="couple-icon">
        <img src={coupleImg} alt="Ozzy and Tommy" className="couple-img" />
      </div>
      <h1 className="home-title">Br Br Family Hub</h1>
      <p className="home-subtitle">Welcome back, Ozzy & Tommy</p>
    </motion.div>

    <motion.div className="days-widget" variants={itemVariants}>
      <span className="days-number">{days}</span>
      <span className="days-label">days together ✨</span>
    </motion.div>

    <motion.div className="music-bar" variants={itemVariants}>
      <span className="music-note" style={{ opacity: playing ? 1 : 0.4 }}>♪</span>
      <span className="music-title">Crazy Train — Ozzy Osbourne</span>
      <motion.button
        className="music-toggle"
        onClick={togglePlay}
        disabled={!ready}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {playing ? "⏸" : "▶"}
      </motion.button>
    </motion.div>

    <div id="yt-player" className="youtube-hidden" />
  </motion.div>
);
```

- [ ] **Step 4: Remove CSS animations from `src/components/Home.css`**

Delete these blocks (framer-motion now handles them):

```css
@keyframes fadeUp { ... }

.home-container > * {
  opacity: 0;
  animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.home-card { animation-delay: 0.3s !important; }
.days-widget { animation-delay: 0.85s !important; }
.music-bar { animation-delay: 1.3s !important; }
```

- [ ] **Step 5: Verify**

Run `npm run dev`. Home page elements should stagger in one by one with a springy feel. The music toggle button should feel physically springy when tapped.

- [ ] **Step 6: Commit**

```bash
git add src/components/Home.jsx src/components/Home.css
git commit -m "feat: animate home page with framer-motion spring stagger"
```

---

### Task 5: Grocery List Animations

**Files:**
- Modify: `src/components/GroceryList.jsx`
- Modify: `src/components/GroceryList.css`

- [ ] **Step 1: Add framer-motion imports**

```jsx
import { motion, AnimatePresence } from "framer-motion";
```

- [ ] **Step 2: Add animation variants above the `GroceryList` function**

```jsx
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
};
```

- [ ] **Step 3: Replace `renderItem` with a motion version**

Replace the entire `renderItem` function:

```jsx
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
```

- [ ] **Step 4: Replace the list JSX in the return**

Replace the list sections in the return (starting after the `<form>`) with:

```jsx
<AnimatePresence mode="popLayout">
  <motion.ul
    className="item-list"
    variants={listVariants}
    initial="hidden"
    animate="show"
  >
    {unchecked.map((item) => renderItem(item, false))}
  </motion.ul>
</AnimatePresence>

{checked.length > 0 && (
  <>
    <p className="got-label">Got</p>
    <AnimatePresence mode="popLayout">
      <motion.ul
        className="item-list"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {checked.map((item) => renderItem(item, true))}
      </motion.ul>
    </AnimatePresence>
  </>
)}
```

- [ ] **Step 5: Make the Add button springy**

In the form, replace the submit button:

```jsx
<motion.button
  type="submit"
  className="add-button"
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.93 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>Add</motion.button>
```

- [ ] **Step 6: Wrap the page in a motion exit container**

Replace the outermost return div:

```jsx
return (
  <motion.div
    className="page-bg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    <div className="grocery-container">
      {/* ... rest of content unchanged ... */}
    </div>
  </motion.div>
);
```

- [ ] **Step 7: Verify**

Run `npm run dev`. Go to Groceries. Add an item — it should spring in. Check an item — it should slide left and disappear before appearing in Got. Tap the ⚡/💤 button — it should bounce.

- [ ] **Step 8: Commit**

```bash
git add src/components/GroceryList.jsx src/components/GroceryList.css
git commit -m "feat: add spring animations to grocery list items and buttons"
```

---

### Task 6: Recipe List Animations

**Files:**
- Modify: `src/components/RecipeList.jsx`
- Modify: `src/components/RecipeList.css`

- [ ] **Step 1: Add framer-motion imports**

```jsx
import { motion, AnimatePresence } from "framer-motion";
```

- [ ] **Step 2: Add variants above the `RecipeList` function**

```jsx
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
```

- [ ] **Step 3: Wrap the page in a motion exit container**

Find the top-level return and wrap it:

```jsx
return (
  <motion.div
    className="page-bg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* existing content */}
  </motion.div>
);
```

- [ ] **Step 4: Wrap the recipe cards list**

Find where the filtered recipes are rendered (the list of recipe cards) and wrap the container with `listVariants` and each card with `cardVariants`. The recipe card's outer div becomes:

```jsx
<motion.div
  key={recipe.id}
  className="recipe-card"
  variants={cardVariants}
  layout
>
  {/* existing recipe card content */}
</motion.div>
```

And the container wrapping all recipe cards:

```jsx
<motion.div
  className="recipe-list"
  variants={listVariants}
  initial="hidden"
  animate="show"
>
  {filteredRecipes.map(recipe => (
    <motion.div key={recipe.id} className="recipe-card" variants={cardVariants} layout>
      {/* existing content */}
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 5: Animate recipe expand/collapse**

The expand state variable is `expanded` (line 64: `const [expanded, setExpanded] = useState(null)`). The conditional at line 313 is `{expanded === recipe.id && (`. Wrap that block in AnimatePresence:

```jsx
<AnimatePresence>
  {expanded === recipe.id && (
    <motion.div
      variants={expandVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      style={{ overflow: "hidden" }}
    >
      {/* existing expanded content — unchanged */}
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 6: Make category tabs springy**

Find the category tab buttons and add spring feedback:

```jsx
<motion.button
  key={cat}
  className={"category-tab" + (activeCategory === cat ? " active" : "")}
  onClick={() => setActiveCategory(cat)}
  whileTap={{ scale: 0.92 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  {cat}
</motion.button>
```

- [ ] **Step 7: Verify**

Run `npm run dev`. Go to Recipes. Recipe cards should stagger in. Tap a category tab — springy feel. Expand a recipe — smooth height animation. Collapse — smooth exit.

- [ ] **Step 8: Commit**

```bash
git add src/components/RecipeList.jsx src/components/RecipeList.css
git commit -m "feat: add spring animations and expand transitions to recipe list"
```

---

### Task 7: Meal Plan Animations

**Files:**
- Modify: `src/components/MealPlan.jsx`
- Modify: `src/components/MealPlan.css`

- [ ] **Step 1: Add framer-motion imports**

```jsx
import { motion, AnimatePresence } from "framer-motion";
```

- [ ] **Step 2: Add variants above the `MealPlan` function**

```jsx
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
```

- [ ] **Step 3: Wrap the page in a motion exit container**

```jsx
return (
  <motion.div
    className="page-bg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* existing content */}
  </motion.div>
);
```

- [ ] **Step 4: Stagger day cards**

The container is `className="days-list"` (line 128) and each card is `className={"day-card" + (isToday ? " today" : "")}` (line 135). Replace the `<div className="days-list">` and its mapped children:

```jsx
<motion.div
  className="days-list"
  variants={dayListVariants}
  initial="hidden"
  animate="show"
>
  {upcomingDays.map((date) => {
    const dateKey = toDateKey(date);
    const label = formatDayLabel(date);
    const today = new Date(); today.setHours(0,0,0,0);
    const isToday = date.getTime() === today.getTime();
    const meal = meals.find((m) => m.day_of_week === dateKey);
    return (
      <motion.div key={dateKey} className={"day-card" + (isToday ? " today" : "")} variants={dayCardVariants} layout>
        {/* existing day card content unchanged */}
      </motion.div>
    );
  })}
</motion.div>
```

Keep all inner content of each day card exactly as it is — only the outer `div` tags change to `motion.div`.

- [ ] **Step 5: Animate the assigned meal name**

Inside each day card, the meal name is rendered as `<span className="day-meal-name">{meal.recipe_name}</span>` and the empty state is `<button className="day-add">+ Add meal</button>`. Wrap the conditional in AnimatePresence:

```jsx
<AnimatePresence mode="wait">
  {meal ? (
    <motion.div
      key={meal.recipe_name}
      className="day-meal"
      variants={mealAssignedVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
    >
      {/* existing day-meal content unchanged: cooked button, day-meal-name span, Change/✕ buttons */}
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
```

- [ ] **Step 6: Verify**

Run `npm run dev`. Go to Meals. Day cards stagger in. Assign a recipe to a day — the name pops in with a scale spring. Clear it — it exits smoothly.

- [ ] **Step 7: Commit**

```bash
git add src/components/MealPlan.jsx src/components/MealPlan.css
git commit -m "feat: stagger day cards and animate meal assignments in meal plan"
```

---

### Task 8: Feedback Animations

**Files:**
- Modify: `src/components/Feedback.jsx`
- Modify: `src/components/Feedback.css`

- [ ] **Step 1: Add framer-motion imports**

```jsx
import { motion, AnimatePresence } from "framer-motion";
```

- [ ] **Step 2: Add variants above the `Feedback` function**

```jsx
const noteVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.18 },
  },
};

const noteListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
```

- [ ] **Step 3: Wrap the page in a motion exit container**

```jsx
return (
  <motion.div
    className="page-bg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* existing content */}
  </motion.div>
);
```

- [ ] **Step 4: Make the Post button springy**

The post button is a `type="submit"` inside `<form onSubmit={postNote}>` at line 115. Replace it:

```jsx
<motion.button
  type="submit"
  className="post-button"
  disabled={posting || !message.trim()}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.92 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  {posting ? "Posting..." : "📮 Post it!"}
</motion.button>
```

- [ ] **Step 5: Animate feedback notes list**

The notes array is `notes`, container is `className="notes-list"`, each card is `className="note-card"` (line 125). Replace the notes rendering block:

```jsx
{notes.length > 0 && (
  <div className="notes-list">
    <h2 className="notes-heading">Posted Notes</h2>
    <motion.div variants={noteListVariants} initial="hidden" animate="show">
      <AnimatePresence>
        {notes.map((note) => (
          <motion.div
            key={note.id}
            className="note-card"
            variants={noteVariants}
            exit="exit"
            layout
          >
            <div className="note-card-header">
              <span className="note-author">{note.author}</span>
              <span className="note-date">{formatDate(note.created_at)}</span>
              <button className="note-delete" onClick={() => deleteNote(note.id)}>✕</button>
            </div>
            <p className="note-message">{note.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  </div>
)}

- [ ] **Step 6: Add letterbox glow to `src/components/Feedback.css`**

The letterbox class is `.letterbox`. Find it and add a glow:

```css
.letterbox {
  /* existing styles preserved — add: */
  filter: drop-shadow(0 0 18px rgba(139, 92, 246, 0.25));
}
```

- [ ] **Step 7: Verify**

Run `npm run dev`. Go to Feedback. Notes stagger in. Post a note — it springs in from below. Delete a note — it exits with a scale-down. The pillar box has a subtle purple glow.

- [ ] **Step 8: Commit**

```bash
git add src/components/Feedback.jsx src/components/Feedback.css
git commit -m "feat: animate feedback notes with spring entrance and exit"
```

---

### Task 9: Final Polish Pass

**Files:**
- Modify: `src/components/NavBar.css`

- [ ] **Step 1: Tint navbar border to purple**

In `src/components/NavBar.css`, find `.navbar` and update the `border-bottom`:

```css
.navbar {
  /* existing styles */
  border-bottom: 1px solid rgba(120, 80, 255, 0.15);
  box-shadow: 0 1px 24px rgba(80, 40, 180, 0.12);
}
```

And update `.sidebar`:

```css
.sidebar {
  /* existing styles */
  border-right: 1px solid rgba(120, 80, 255, 0.12);
}
```

- [ ] **Step 2: Verify the whole app**

Run `npm run dev`. Walk through every page:
- Home: staggered spring entrance, springy music button
- Groceries: items spring in, checked items slide out, priority emoji bounces
- Recipes: cards stagger, tabs spring, expand animates
- Meals: day cards stagger, meal name pops in
- Feedback: notes stagger, post button springy, pillar box glows
- All page transitions: fade + slide between routes
- Aurora bloom visible on all pages
- Cards have purple-tinted borders with inner glow

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.css
git commit -m "feat: complete luxury night sky visual upgrade with full animation system"
```
