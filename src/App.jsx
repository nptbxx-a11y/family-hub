import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "./supabase";
import NavBar from "./components/NavBar";
import Login from "./components/Login";

const Home = lazy(() => import("./components/Home"));
const GroceryList = lazy(() => import("./components/GroceryList"));
const RecipeList = lazy(() => import("./components/RecipeList"));
const MealPlan = lazy(() => import("./components/MealPlan"));
const Feedback = lazy(() => import("./components/Feedback"));
const TodoList = lazy(() => import("./components/TodoList"));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={null}>
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
    </Suspense>
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
