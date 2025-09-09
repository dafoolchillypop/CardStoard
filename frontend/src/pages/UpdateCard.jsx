import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function UpdateCard() {
  const [id, setId] = useState("");
  const [player, setPlayer] = useState("");
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .put(`http://host.docker.internal:8000/cards/${id}`, {
        player,
        year: parseInt(year),
        brand,
      })
      .then((response) => {
        alert("Card updated successfully!");
        console.log(response.data);
      })
      .catch((error) => {
        console.error("Error updating card:", error);
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: "#003366" }}>Update Card</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Card ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        />
        <br />
        <input
          type="text"
          placeholder="Player Name"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        />
        <br />
        <input
          type="text"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <br />
        <input
          type="text"
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <br />
        <button type="submit">Update</button>
      </form>
      <br />
      <Link to="/">⬅ Back to Home</Link>
    </div>
  );
}

export default UpdateCard;
