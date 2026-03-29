import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./supabase";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import GroceryList from "./components/GroceryList";
import RecipeList from "./components/RecipeList";
import MealPlan from "./components/MealPlan";
import Login from "./components/Login";

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still loading
  if (session === undefined) return null;

  // Not logged in
  if (!session) return <Login />;

  // Logged in
  return (
    <BrowserRouter>
      <NavBar onLogout={() => supabase.auth.signOut()} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/groceries" element={<GroceryList />} />
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/meals" element={<MealPlan />} />
      </Routes>
    </BrowserRouter>
  );
}
