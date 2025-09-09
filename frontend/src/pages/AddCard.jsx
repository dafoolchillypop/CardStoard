import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function AddCard() {
  const [form, setForm] = useState({
    player_name: "",
    team: "",
    year: "",
    brand: "",
    rookie: false,
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://host.docker.internal:8000/cards/", form)
      .then(() => navigate("/list"))
      .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <div style={{ marginBottom: "10px" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
      </div>
      <h2>Add a Card</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Player Name</label>
          <input name="player_name" value={form.player_name} onChange={handleChange} required />
        </div>
        <div>
          <label>Team</label>
          <input name="team" value={form.team} onChange={handleChange} />
        </div>
        <div>
          <label>Year</label>
          <input type="number" name="year" value={form.year} onChange={handleChange} />
        </div>
        <div>
          <label>Brand</label>
          <input name="brand" value={form.brand} onChange={handleChange} />
        </div>
        <div>
          <label>
            <input type="checkbox" name="rookie" checked={form.rookie} onChange={handleChange} />
            &nbsp;Rookie
          </label>
        </div>
        <button type="submit">Add Card</button>
      </form>
    </div>
  );
}
