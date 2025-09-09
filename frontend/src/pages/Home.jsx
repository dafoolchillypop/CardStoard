import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container">
      <h1>Baseball Memorabilia Inventory</h1>
      <div className="nav-group">
        <Link className="nav-btn" to="/list">List Cards</Link>
        <Link className="nav-btn" to="/add">Add Card</Link>
        <Link className="nav-btn" to="/update">Update Card</Link>
        <Link className="nav-btn" to="/delete">Delete Card</Link>
      </div>
    </div>
  );
}
