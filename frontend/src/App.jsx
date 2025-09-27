import React from "react";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="home-container">
      {/* ✅ Logo slot */}
      <div className="logo-slot" style={{ textAlign: "center", marginBottom: "1rem" }}>
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
      <div style={{ margin: "1rem auto", fontSize: "1.25rem", color: "#444" }}>
        Track cards 📇 | Check inventory 📦 | Monitor value 📈
      </div>

      <nav className="home-nav">
        <Link className="nav-btn" to="/add-card">➕ Add Card</Link>
        <Link className="nav-btn" to="/list-cards">📋 List Cards</Link>
        <Link className="nav-btn" to="/admin">⚙️ Admin</Link>
      </nav>
    </div>
  );
}
