import React from "react";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="home-container">
      {/* ✅ Logo slot */}
      <div className="logo-slot">
        <img src="/logo.png" alt="CardStoard Logo" />
      </div>

      <h1 className="home-title">CardStoard</h1>
      <p className="home-subtitle">Inventory and Valuation System</p>

      <nav className="home-nav">
        <Link className="nav-btn" to="/add-card">➕ Add Card</Link>
        <Link className="nav-btn" to="/list-cards">📋 List Cards</Link>
        <Link className="nav-btn" to="/admin">⚙️ Admin</Link>
      </nav>
    </div>
  );
}
