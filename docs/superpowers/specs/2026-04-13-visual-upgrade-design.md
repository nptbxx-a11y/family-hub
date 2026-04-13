# Visual Upgrade — Luxury Night Sky
**Date:** 2026-04-13  
**Status:** Approved

## Summary

A full visual and animation upgrade for the Br Br Family Hub. Direction: Luxury Night Sky — the existing dark theme enriched with aurora depth, purple/coral glows on glassmorphism cards, and a complete framer-motion animation system adding spring physics and page transitions across all pages.

---

## Section 1 — Visual System

### Background
- Keep the existing `#060C1F` base and star animations unchanged
- Add a new fixed aurora bloom layer using a dedicated `.aurora` div rendered in `App.jsx` (cannot use `body::before`/`body::after` — those are already taken by the star layers):
  - Primary bloom: large soft radial gradient, purple → deep blue (`rgba(100,50,220,0.15)` centre), positioned behind the main content area, `filter: blur(60px)`
  - Secondary bloom: coral/terracotta (`rgba(212,120,90,0.08)`), positioned bottom-right, smaller
- The aurora layer sits between the star layer and the page content (`z-index` ordering: stars → aurora → content)

### Cards (glassmorphism upgrade)
All containers that currently have the glassmorphism rule (`.grocery-container`, `.recipe-container`, `.meal-container`, `.feedback-container`, `.home-card`, `.music-bar`) get:
- Border colour: `rgba(140,90,255,0.2)` replacing the current `rgba(255,255,255,0.1)`
- Inner top-edge glow: `inset 0 1px 0 rgba(180,140,255,0.12)`
- Outer purple glow: `0 0 40px rgba(100,50,200,0.1)` added to existing box-shadow
- Surface colour: shift from cold navy `rgba(10,20,52,0.78)` to slightly warmer `rgba(12,15,48,0.82)`

### Accent lighting
- `--green-dark` (coral) gains `text-shadow: 0 0 12px rgba(212,120,90,0.45)` on headings and key labels via a targeted rule
- `--purple` deepens slightly: `#8b5cf6` (was `#C77DFF`) for stronger contrast on the days widget
- Primary action buttons get a matching coloured `box-shadow` glow (coral for grocery/recipe CTAs, purple for the days widget)
- Star colours in `body::after` (the bright glowing stars) get a subtle purple tint on select stars: `rgba(210,190,255,0.95)` instead of pure white, to feel more atmospheric

### CSS variable updates (in `index.css` `:root`)
```css
--purple: #8b5cf6;         /* deepened from #C77DFF */
--surface: rgba(12,15,48,0.82);  /* warmer than current cold navy */
--border: rgba(140,90,255,0.2);  /* purple-tinted from white */
```

---

## Section 2 — Animation System (framer-motion)

### Dependency
`framer-motion` is already installed.

### Page transitions
- Wrap the route output in `App.jsx` with `AnimatePresence` (mode `"wait"`)
- Each page's top-level container becomes a `motion.div` with:
  ```js
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  ```
- Remove the existing CSS `pageEnter` keyframe animation from `index.css` to avoid double-animating

### List stagger
All item lists (grocery items, recipe cards, meal day cards, feedback notes) use `motion.div` with staggered children via `variants`:
```js
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } } }
```

### Spring buttons
All primary buttons (`.add-button`, `.submit-button`, `.add-recipe-button`, `.post-button`) become `motion.button` with:
```js
whileHover={{ scale: 1.03 }}
whileTap={{ scale: 0.94 }}
transition={{ type: 'spring', stiffness: 400, damping: 20 }}
```

### Layout animations
- Grocery list uses `layout` prop on each item so checked items animate smoothly into the "Got" section rather than jumping
- Priority toggle emoji uses `AnimatePresence` for a quick scale pop when it changes

---

## Section 3 — Per-page Application

All pages receive the full visual system (Section 1) and animation system (Section 2). Page-specific notes:

### Home (`Home.jsx` / `Home.css`)
- Add aurora bloom div behind `.home-card`
- Avatar ring: border colour shifts to `rgba(160,100,255,0.35)` with `box-shadow: 0 0 20px rgba(120,60,220,0.35)`
- Days widget: richer gradient `linear-gradient(135deg, #4c1d8a, #6d28d9)`, gold number gets `text-shadow`
- Music bar: coral-tinted border, play button becomes a small pill with coral background

### Grocery List (`GroceryList.jsx` / `GroceryList.css`)
- List items use stagger + spring entrance
- Priority toggle tap gets `whileTap` scale bounce
- Checked items animate out with `exit={{ opacity: 0, x: -20 }}` before moving to "Got" section
- `layout` prop on each item for smooth reorder

### Recipe List (`RecipeList.jsx` / `RecipeList.css`)
- Category tab selection animates with a sliding indicator using `layoutId`
- Recipe cards stagger in
- Expand/collapse uses `motion.div` with `height` animation (AnimatePresence)
- Ingredient rows stagger in when recipe expands

### Meals (`MealPlan.jsx` / `MealPlan.css`)
- Day cards stagger in on page load
- "+ Add meal" triggers a spring pop-in on the bottom sheet picker
- Assigning/clearing a recipe has a quick scale flash on the day card

### Feedback (`Feedback.jsx` / `Feedback.css`)
- Existing ticker ribbon stays as-is
- New feedback notes animate in from `y: 30` with spring
- Post button gets spring tap feedback
- Pillar box gets a subtle `box-shadow` glow using `--purple`

---

## What stays the same
- All routing, navigation, and UX flows are unchanged
- Supabase realtime logic is unchanged
- No layout restructuring — this is a visual and animation layer only
- The hamburger sidebar stays as-is
- Font choices (Caveat, DM Serif Display, Nunito) stay
