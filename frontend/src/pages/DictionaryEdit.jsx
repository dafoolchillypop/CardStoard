import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

export default function DictionaryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [playerNames, setPlayerNames] = useState({ firstNames: [], lastNames: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/dictionary/entries/${id}`)
      .then(res => setEntry(res.data))
      .catch(err => console.error("Error fetching entry:", err));

    api.get("/cards/players")
      .then(res => {
        const players = res.data.players || [];
        setPlayerNames({
          firstNames: [...new Set(players.map(p => p.first_name))].sort(),
          lastNames: [...new Set(players.map(p => p.last_name))].sort(),
        });
      })
      .catch(err => console.error("Error fetching player names:", err));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleNameKeyDown = (e, field, names) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    const typed = (entry[field] || "").trim().toLowerCase();
    if (!typed) return;
    const match = names.find(n => n.toLowerCase().startsWith(typed));
    if (match && match.toLowerCase() !== typed) {
      if (e.key === "Enter") e.preventDefault();
      setEntry(prev => ({ ...prev, [field]: match }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.put(`/dictionary/entries/${id}`, {
        ...entry,
        rookie_year: parseInt(entry.rookie_year, 10),
        year: parseInt(entry.year, 10),
      });
      navigate("/dictionary");
    } catch (err) {
      console.error(err);
      setError("Error updating entry. Please check all fields.");
    }
  };

  if (!entry) return <p>Loading...</p>;

  return (
    <>
      <AppHeader />
      <div className="container">
        <h2 className="page-header">Edit Dictionary Entry</h2>

        <form onSubmit={handleSubmit}>
          <label>First Name</label>
          <input
            name="first_name"
            value={entry.first_name ?? ""}
            onChange={handleChange}
            onKeyDown={e => handleNameKeyDown(e, "first_name", playerNames.firstNames)}
            required
          />

          <label>Last Name</label>
          <input
            name="last_name"
            value={entry.last_name ?? ""}
            onChange={handleChange}
            onKeyDown={e => handleNameKeyDown(e, "last_name", playerNames.lastNames)}
            required
          />

          <label>Rookie Year</label>
          <input
            type="number"
            name="rookie_year"
            value={entry.rookie_year ?? ""}
            onChange={handleChange}
            required
          />

          <label>Brand</label>
          <input
            name="brand"
            value={entry.brand ?? ""}
            onChange={handleChange}
            required
          />

          <label>Year</label>
          <input
            type="number"
            name="year"
            value={entry.year ?? ""}
            onChange={handleChange}
            required
          />

          <label>Card Number</label>
          <input
            name="card_number"
            value={entry.card_number ?? ""}
            onChange={handleChange}
            required
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <div className="button-row">
            <button type="button" onClick={() => navigate("/dictionary")}>Cancel</button>
            <button type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </>
  );
}
