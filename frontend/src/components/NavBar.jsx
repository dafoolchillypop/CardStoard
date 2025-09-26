// src/components/Navbar.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="nav">
      <Link to="/">🏠 Dashboard</Link>
      <Link to="/cards">🃏 Cards</Link>
      <Link to="/settings">⚙️ Settings</Link>

      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <button className="nav-btn" onClick={logout}>Logout</button>
        ) : (
          <Link className="nav-btn" to="/login">🔑 Login</Link>
        )}
      </div>
    </nav>
  );
}
