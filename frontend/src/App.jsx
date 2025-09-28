import React, { useContext } from "react";   // <-- add useContext here
import { Link } from "react-router-dom";
import LogoutButton from "./components/LogoutButton";
import { AuthContext } from "./context/AuthContext";

export default function App() {
  const { isLoggedIn } = useContext(AuthContext);

  return (
    <div className="home-container">
      {/* ✅ Logo slot */}
      <div
        className="logo-slot"
        style={{ textAlign: "center", marginBottom: "1rem" }}
      >
        <img
          src="/logo.png"
          alt="CardStoard Logo"
          style={{ width: "550px", height: "auto" }}
        />
      </div>

      <p className="home-subtitle">
        Collection Inventory and Valuation System
      </p>

      {/* Optional tagline */}
      <div
        style={{ margin: "1rem auto", fontSize: "1.25rem", color: "#444" }}
      >
        Track cards 📇 | Check inventory 📦 | Monitor value 📈
      </div>

      <nav className="home-nav"
           style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1.5rem"
          }}>
          <Link className="nav-btn" to="/add-card">
            ➕ Add Card
          </Link>
          <Link className="nav-btn" to="/list-cards">
            📋 List Cards
          </Link>
          <Link className="nav-btn" to="/analytics">
            📈 Analytics
          </Link>
          <Link className="nav-btn" to="/admin">
            ⚙️ Admin
          </Link>

        {/* ✅ Conditionally show Logout if logged in, else Login */}
        {isLoggedIn ? (
          <LogoutButton />
        ) : (
          <Link className="nav-btn" to="/login">
            🔑 Login
          </Link>
        )}
      </nav>
    </div>
  );
}
