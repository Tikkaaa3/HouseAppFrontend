import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./features/auth/LoginPage";
import ShoppingPage from "./features/shopping/ShoppingPage";
import ChoresPage from "./features/chores/ChoresPage";
import RecipeSuggestPage from "./features/recipes/RecipeSuggestPage";
import SignupPage from "./features/auth/SignupPage";
import ProfilePage from "./features/profile/ProfilePage";
import ItemsAdminPage from "./features/items/ItemsAdminPage";
import RecipesAdminPage from "./features/recipes/RecipesAdminPage";

export default function App() {
  return (
    <>
      <NavBar />
      <div className="container py-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/recipes/admin"
            element={
              <ProtectedRoute>
                <RecipesAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/items"
            element={
              <ProtectedRoute>
                <ItemsAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shopping"
            element={
              <ProtectedRoute>
                <ShoppingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chores"
            element={
              <ProtectedRoute>
                <ChoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/suggest"
            element={
              <ProtectedRoute>
                <RecipeSuggestPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/shopping" replace />} />
        </Routes>
      </div>
    </>
  );
}
