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
- `/games` — Games page (a card per game)
- `/battleships` — All Aboard (Battleships, 2 players)
- `/mahjong` — Mahjong Solitaire (solo)

**Navigation:** Hamburger menu (☰) opens a left-side drawer sidebar. The navbar brand is a heart (♥) that links home. No nav links in the top bar.

## Supabase Tables

**RLS is ENABLED on every table (family-only access).** Each table has one policy, "Family members only", for the `authenticated` role, gated by `public.is_family()` — which allow-lists the shared login's `auth.users` id. Anonymous requests (the public anon key) and any other account see nothing.

**New tables must follow the same pattern**, or anyone holding the public anon key can read and write them:

```sql
alter table public.<name> enable row level security;
create policy "Family members only" on public.<name> for all to authenticated
  using ((select public.is_family())) with check ((select public.is_family()));
```

Realtime-backed tables also need `alter publication supabase_realtime add table public.<name>;`. To give another login access, add its user id to the array in `public.is_family()`.

- `groceries` — `id`, `name`, `checked`, `created_at`, `priority` (text: "urgent" or "later", default "later")
- `recipes` — `id`, `name`, `link`, `category`, `ingredients` (newline-separated text), `notes`, `created_at`
- `meal_plan` — `id`, `recipe_id`, `recipe_name`, `day_of_week`, `created_at`
- `feedback` — `id`, `message`, `author`, `created_at`
- `mahjong_scores` — `id`, `player` ("ozzy" | "tommy"), `mode` ("quick" | "classic"), `seconds`, `assisted` (true if Hint/Shuffle used), `created_at`. One row per cleared board.

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

**Games (`GamesHub.jsx`):** the sidebar's single "🎮 Games" link opens a page of game cards. Each game shows a "← Games" bar (`GamesBackLink.jsx`, added in the route).

**Mahjong Solitaire (`Mahjong.jsx`):**
- Quick (72 tiles) or Classic (144); tap two matching free tiles to remove them
- 5 layouts per size, picked at random each game and never repeating the last one (`LAYOUTS` in `src/mahjong/layouts.js`; tests enforce tile count, phone fit, no overlaps/floating tiles and solvable dealing for every layout — add new shapes there)
- Rules live in `src/mahjong/` (tiles, layouts, engine) and are unit-tested; deals are guaranteed solvable
- Hint, Shuffle (re-deals remaining tiles, still solvable), Undo, New
- Blocked tiles are not shaded; tapping one just wiggles it
- "Who's playing?" Ozzy/Tommy toggle (remembered via the `battleships_player` localStorage key, shared with All Aboard)
- Cleared boards are saved to `mahjong_scores`; the 🏆 leaderboard (Quick/Classic tabs) shows each player's best time from **clean games only** (no Hint/Shuffle; Undo is fine) plus boards cleared. Logic in `src/mahjong/leaderboard.js` (unit-tested)
- Game in progress saved to `localStorage` (`mahjong:v1`)

**Homepage (`Home.jsx`):**
- Couple illustration icon (src/assets/couple.png)
- "Br Br Family Hub" title, "Welcome back, Ozzy & Tommy"
- Days-together counter widget (since 9 July 2025), purple pill below card
- Music player: Crazy Train by Ozzy Osbourne via YouTube IFrame Player API
  - Uses `window.YT.Player` with `id="yt-player"` div
  - Tap ▶ to play, ⏸ to pause (Safari requires user gesture)

## Vercel Serverless Function

`api/parse-recipe.js` — fetches a recipe URL server-side and extracts ingredients from JSON-LD Recipe schema. Called from the recipe form as `/api/parse-recipe?url=...`.

`api/keepalive.js` — run daily at 09:00 UTC by a Vercel Cron job (`crons` in `vercel.json`). Calls the `public.keepalive()` RPC so the free-tier Supabase project never auto-pauses after 7 days of inactivity. If the site ever stops loading data, first check the project isn't paused in the Supabase dashboard.

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
