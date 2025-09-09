import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function DeleteCard() {
  const [id, setId] = useState("");

  const handleDelete = () => {
    axios
      .delete(`http://host.docker.internal:8000/cards/${id}`)
      .then(() => {
        alert("Card deleted successfully!");
      })
      .catch((error) => {
        console.error("Error deleting card:", error);
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: "#990000" }}>Delete Card</h2>
      <input
        type="text"
        placeholder="Card ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <br />
      <button onClick={handleDelete} style={{ backgroundColor: "#ffcccc" }}>
        Delete
      </button>
      <br />
      <br />
      <Link to="/">⬅ Back to Home</Link>
    </div>
  );
}

export default DeleteCard;
