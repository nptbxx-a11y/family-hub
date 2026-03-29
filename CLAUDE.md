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

**Auth flow:** `App.jsx` is the entry point. It checks `supabase.auth.getSession()` on mount and listens for auth state changes. If no session exists, it renders `<Login />` instead of the app. The session state drives all routing — there is no protected route wrapper, just a conditional render at the top level.

**Supabase client:** A single shared client is exported from `src/supabase.js`, using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. All components import directly from this file.

**Realtime:** Both `GroceryList` and `RecipeList` subscribe to Postgres changes via `supabase.channel()` to keep the UI in sync across multiple users in real time. Both follow the same pattern: initial fetch on mount + realtime subscription, cleaned up on unmount.

**Grocery ↔ Recipe integration:** From the `RecipeList` page, users can expand a recipe, select individual ingredients, and push them directly to the `groceries` table via `supabase.from("groceries").insert(...)`.

**Supabase tables:**
- `groceries` — columns: `id`, `name`, `checked`, `created_at`
- `recipes` — columns: `id`, `name`, `link`, `category`, `ingredients` (newline-separated text), `notes`, `created_at`

**Routing:** Two routes — `/` (GroceryList) and `/recipes` (RecipeList). The `NavBar` component handles navigation and the logout button.

## Environment Variables

Create a `.env.local` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
