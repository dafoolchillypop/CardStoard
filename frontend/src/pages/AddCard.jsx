import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddCard() {
  const [form, setForm] = useState({
    player_name: "",
    team: "",
    year: "",
    brand: "",
    rookie: false,
  });
  const navigate = useNavigate();

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Submit form to backend
  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("http://host.docker.internal:8000/cards/", form)
      .then(() => navigate("/cards")) // Redirect to list after success
      .catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Add a Card</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Player Name:</label>
          <input
            type="text"
            name="player_name"
            value={form.player_name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Team:</label>
          <input
            type="text"
            name="team"
            value={form.team}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Year:</label>
          <input
            type="number"
            name="year"
            value={form.year}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Brand:</label>
          <input
            type="text"
            name="brand"
            value={form.brand}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>
            Rookie:
            <input
              type="checkbox"
              name="rookie"
              checked={form.rookie}
              onChange={handleChange}
            />
          </label>
        </div>
        <button type="submit" style={{ marginTop: "10px" }}>
          Add Card
        </button>
      </form>
    </div>
  );
}

export default AddCard;
