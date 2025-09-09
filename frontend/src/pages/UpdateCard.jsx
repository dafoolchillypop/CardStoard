import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function UpdateCard() {
  const [id, setId] = useState("");
  const [player_name, setPlayerName] = useState("");
  const [team, setTeam] = useState("");
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");
  const [rookie, setRookie] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.put(`http://host.docker.internal:8000/cards/${id}`, {
      player_name,
      team,
      year,
      brand,
      rookie
    })
    .then(() => alert("Card updated successfully!"))
    .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <div style={{ marginBottom: "10px" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
        <Link className="nav-btn" to="/list">List Cards</Link>
      </div>
      <h2>Update Card</h2>
      <form onSubmit={handleSubmit}>
        <label>Card ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} required />
        <label>Player Name</label>
        <input value={player_name} onChange={(e) => setPlayerName(e.target.value)} />
        <label>Team</label>
        <input value={team} onChange={(e) => setTeam(e.target.value)} />
        <label>Year</label>
        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        <label>Brand</label>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        <label>
          <input type="checkbox" checked={rookie} onChange={(e) => setRookie(e.target.checked)} />
          &nbsp;Rookie
        </label>
        <button type="submit">Update</button>
      </form>
    </div>
  );
}
