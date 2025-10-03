import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function NavBar() {
  const { user, house, logout } = useAuth();
  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/shopping">
          HouseApp
        </Link>
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <NavLink className="nav-link" to="/shopping">
              Shopping
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/chores">
              Chores
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/recipes/suggest">
              Recipe Suggest
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/items">
              Items
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/recipes/admin">
              Recipes
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/profile">
              Profile
            </NavLink>
          </li>
        </ul>
        <div className="d-flex align-items-center gap-3 text-light">
          <small>
            {user?.displayName || user?.email}{" "}
            {house ? `· ${house.name}` : "(no house)"}
          </small>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
