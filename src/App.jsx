import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import GroceryList from "./components/GroceryList";
import RecipeList from "./components/RecipeList";

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<GroceryList />} />
        <Route path="/recipes" element={<RecipeList />} />
      </Routes>
    </BrowserRouter>
  );
}
