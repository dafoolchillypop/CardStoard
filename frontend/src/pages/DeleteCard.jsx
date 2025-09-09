import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function DeleteCard() {
  const [id, setId] = useState("");

  const handleDelete = () => {
    axios.delete(`http://host.docker.internal:8000/cards/${id}`)
      .then(() => alert("Card deleted successfully!"))
      .catch((err) => console.error(err));
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
