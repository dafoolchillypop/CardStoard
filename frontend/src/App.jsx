import React from "react";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="home-container">
      <h1 className="home-title">CardStoard</h1>
      <nav className="home-nav">
        <Link className="nav-btn" to="/add-card">Add Card</Link>
        <Link className="nav-btn" to="/list-cards">List Cards</Link>
        <Link className="nav-btn" to="/admin">Admin</Link>
      </nav>
    </div>
  );
}
