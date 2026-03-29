# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

There are no tests configured.

## Architecture

**Stack:** React 19 + Vite, React Router v7, Supabase (auth + database + realtime), deployed on Vercel.

**Users:** Ozzy and Tommy (two users only, private app).

**Auth flow:** `App.jsx` is the entry point. It checks `supabase.auth.getSession()` on mount and listens for auth state changes. If no session exists, it renders `<Login />`. The session state drives all routing — no protected route wrapper, just a conditional render at the top level.

**Supabase client:** Single shared client exported from `src/supabase.js`, using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.

**Realtime:** All data components subscribe to Postgres changes via `supabase.channel()`. Pattern: initial fetch on mount + realtime subscription cleaned up on unmount. UI updates are applied optimistically to local state before Supabase responds (important for toggles like priority).

**Routing:**
- `/` — Home (landing page)
- `/groceries` — Grocery List
- `/recipes` — Recipe List
- `/meals` — This Week's Meals
- `/feedback` — Feedback Box

**Navigation:** Hamburger menu (☰) opens a left-side drawer sidebar. The navbar brand is a heart (♥) that links home. No nav links in the top bar.

## Supabase Tables

All tables have RLS disabled. New tables must have RLS disabled manually after creation.

- `groceries` — `id`, `name`, `checked`, `created_at`, `priority` (text: "urgent" or "later", default "later")
- `recipes` — `id`, `name`, `link`, `category`, `ingredients` (newline-separated text), `notes`, `created_at`
- `meal_plan` — `id`, `recipe_id`, `recipe_name`, `day_of_week`, `created_at`
- `feedback` — `id`, `message`, `author`, `created_at`

## Features

**Grocery List (`GroceryList.jsx`):**
- Add items with ⚡ urgent / 💤 later priority toggle
- Urgent items sort to top
- Tap priority emoji on existing item to toggle it (optimistic update)
- Tap item name to edit inline
- Items split into unchecked / "Got" sections

**Recipe List (`RecipeList.jsx`):**
- Category tabs filter recipes
- Expand a recipe to see ingredients, notes, link
- Ingredients are selectable — push selected ones to grocery list
- Add and edit recipes via form
- **Ingredient auto-import:** paste a URL and tap "🔍 Get ingredients" — calls `/api/parse-recipe` serverless function which scrapes JSON-LD Recipe schema from the page

**This Week's Meals (`MealPlan.jsx`):**
- Mon–Sun cards, each can have one recipe assigned
- Tap "+ Add meal" to open a bottom-sheet picker of all recipes
- Change or clear meals per day
- Synced in realtime between Ozzy and Tommy

**Feedback Box (`Feedback.jsx`):**
- CSS-drawn red British pillar box letterbox design
- Select author (Ozzy / Tommy), write note, post it
- Scrolling ribbon ticker at top of page cycles through all posted notes
- Notes listed below with author, date, delete button

**Homepage (`Home.jsx`):**
- Couple illustration icon (src/assets/couple.png)
- "Br Br Family Hub" title, "Welcome back, Ozzy & Tommy"
- Days-together counter widget (since 9 July 2025), purple pill below card
- Music player: Crazy Train by Ozzy Osbourne via YouTube IFrame Player API
  - Uses `window.YT.Player` with `id="yt-player"` div
  - Tap ▶ to play, ⏸ to pause (Safari requires user gesture)

## Vercel Serverless Function

`api/parse-recipe.js` — fetches a recipe URL server-side and extracts ingredients from JSON-LD Recipe schema. Called from the recipe form as `/api/parse-recipe?url=...`.

`vercel.json` rewrite excludes `/api/` routes: `/((?!api/).*) → /index.html`

## Design System

**Font:** Nunito (Google Fonts, loaded in index.html)

**CSS variables (defined in `src/index.css`):**
- `--green-dark: #5a9e2f` — primary buttons, navbar, headings
- `--green-light: #a8d44a` — accents, category labels
- `--yellow: #d4b84a` — navbar active state, highlights
- `--purple: #7c4a7c` — "Add to Grocery List" button, days widget, feedback ribbon
- `--cream: #f5f0e8` — background base
- `--brown: #2d2417` — body text
- `--border: #b8d88a` — card borders
- `--white: #ffffff`

**Backgrounds:**
- Homepage: bold green gingham (30px squares) on white
- Grocery/Recipe/Meals/Feedback pages: `page-bg` class — tomato wallpaper (SVG pattern in index.css) on cream, with semi-transparent white containers over the top

**Component CSS files:** each component has its own `.css` file co-located in `src/components/`.

## Environment Variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
