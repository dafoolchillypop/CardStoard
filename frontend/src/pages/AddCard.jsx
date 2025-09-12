import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function AddCard() {
  const [card, setCard] = useState({
    first_name: "",
    last_name: "",
    year: "",
    brand: "",
    card_number: "",
    rookie: 0,
    grade: "",
    value_high: "",
    value_high_mid: "",
    value_mid: "",
    value_low_mid: "",
    value_low: ""
  });

  const [cardMakes, setCardMakes] = useState([]);
  const [cardGrades, setCardGrades] = useState([]);

  // Fetch global settings for dropdown values
  useEffect(() => {
    axios.get("http://host.docker.internal:8000/settings/")
      .then(res => {
        setCardMakes(res.data.card_makes || []);
        setCardGrades(res.data.card_grades || []);
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCard({ ...card, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://host.docker.internal:8000/cards/", card)
      .then(() => {
        alert("Card added successfully!");
        setCard({
          first_name: "",
          last_name: "",
          year: "",
          brand: "",
          card_number: "",
          rookie: 0,
          grade: "",
          value_high: "",
          value_high_mid: "",
          value_mid: "",
          value_low_mid: "",
          value_low: ""
        });
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="container">
      <Link className="nav-btn" to="/">Back to Home</Link>
      <h2>Add Card</h2>
      <form onSubmit={handleSubmit}>
        <label>First Name</label>
        <input
          name="first_name"
          value={card.first_name}
          onChange={handleChange}
          required
        />

        <label>Last Name</label>
        <input
          name="last_name"
          value={card.last_name}
          onChange={handleChange}
          required
        />

        <label>Year</label>
        <input
          type="number"
          name="year"
          value={card.year}
          onChange={handleChange}
        />

        {/* ✅ Brand dropdown from Card Makes */}
        <label>Brand</label>
        <select
          name="brand"
          value={card.brand}
          onChange={handleChange}
          required
        >
          <option value="">-- Select Brand --</option>
          {cardMakes.map((make, idx) => (
            <option key={idx} value={make}>{make}</option>
          ))}
        </select>

        <label>Card Number</label>
        <input
          name="card_number"
          value={card.card_number}
          onChange={handleChange}
        />

        <label>Rookie (0 or 1)</label>
        <input
          type="number"
          name="rookie"
          value={card.rookie}
          onChange={handleChange}
        />

        {/* ✅ Grade dropdown from Card Grades */}
        <label>Grade</label>
        <select
          name="grade"
          value={card.grade}
          onChange={handleChange}
          required
        >
          <option value="">-- Select Grade --</option>
          {cardGrades.map((grade, idx) => (
            <option key={idx} value={grade}>{grade}</option>
          ))}
        </select>

        <label>High Value</label>
        <input
          type="number"
          step="0.01"
          name="value_high"
          value={card.value_high}
          onChange={handleChange}
        />

        <label>High-Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="value_high_mid"
          value={card.value_high_mid}
          onChange={handleChange}
        />

        <label>Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="value_mid"
          value={card.value_mid}
          onChange={handleChange}
        />

        <label>Low-Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="value_low_mid"
          value={card.value_low_mid}
          onChange={handleChange}
        />

        <label>Low Value</label>
        <input
          type="number"
          step="0.01"
          name="value_low"
          value={card.value_low}
          onChange={handleChange}
        />

        <button type="submit">Add Card</button>
      </form>
    </div>
  );
}
