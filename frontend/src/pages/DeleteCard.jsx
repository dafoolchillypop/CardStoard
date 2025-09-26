import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function DeleteCard() {
  const [id, setId] = useState("");

  const handleDelete = () => {
  if (!id) {
    alert("Please enter a Card ID first.");
    return;
  }
  if (!window.confirm(`Permanently delete card #${id}? This cannot be undone.`)) return;

  axios
    .delete(`/cards/${id}`)
    .then(() => alert("Card deleted."))
    .catch((error) => {
      console.error("Error deleting card:", error);
      alert("Failed to delete card. See console for details.");
    });
};


  return (
    <div className="container">
      <div style={{ marginBottom: "10px" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
        <Link className="nav-btn" to="/list">List Cards</Link>
      </div>
      <h2>Delete Card</h2>
      <input placeholder="Card ID" value={id} onChange={(e) => setId(e.target.value)} />
      <button onClick={handleDelete} style={{ marginTop: "10px" }}>Delete</button>
    </div>
  );
}
