import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import GroceryList from "./components/GroceryList";
import RecipeList from "./components/RecipeList";
import MealPlan from "./components/MealPlan";
import Feedback from "./components/Feedback";
import TodoList from "./components/TodoList";
import Login from "./components/Login";

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
      <div className="aurora" />
      <NavBar onLogout={() => supabase.auth.signOut()} />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
