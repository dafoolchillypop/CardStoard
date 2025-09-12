import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function AddCard() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    year: "",
    brand: "",
    card_number: "",
    rookie: false,
    grade: "",
    value_high: "",
    value_high_mid: "",
    value_mid: "",
    value_low_mid: "",
    value_low: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      year: form.year ? parseInt(form.year) : null,
      value_high: form.value_high ? parseFloat(form.value_high) : null,
      value_high_mid: form.value_high_mid ? parseFloat(form.value_high_mid) : null,
      value_mid: form.value_mid ? parseFloat(form.value_mid) : null,
      value_low_mid: form.value_low_mid ? parseFloat(form.value_low_mid) : null,
      value_low: form.value_low ? parseFloat(form.value_low) : null,
    };
    axios.post("http://host.docker.internal:8000/cards/", payload)
      .then(() => navigate("/list"))
      .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <Link className="nav-btn" to="/">Back to Home</Link>
      <h2>Add a Card</h2>
      <form onSubmit={handleSubmit}>
        <label>First Name</label>
        <input name="first_name" value={form.first_name} onChange={handleChange} required />

        <label>Last Name</label>
        <input name="last_name" value={form.last_name} onChange={handleChange} required />

        <label>Year</label>
        <input type="number" name="year" value={form.year} onChange={handleChange} />

        <label>Brand</label>
        <input name="brand" value={form.brand} onChange={handleChange} />

        <label>Card Number</label>
        <input name="card_number" value={form.card_number} onChange={handleChange} />

        <label>
          <input type="checkbox" name="rookie" checked={form.rookie} onChange={handleChange} />
          Rookie
        </label>

        <label>Grade</label>
        <input name="grade" value={form.grade} onChange={handleChange} />

        <label>Value High</label>
        <input type="number" step="0.01" name="value_high" value={form.value_high} onChange={handleChange} />

        <label>Value High-Mid</label>
        <input type="number" step="0.01" name="value_high_mid" value={form.value_high_mid} onChange={handleChange} />

        <label>Value Mid</label>
        <input type="number" step="0.01" name="value_mid" value={form.value_mid} onChange={handleChange} />

        <label>Value Low-Mid</label>
        <input type="number" step="0.01" name="value_low_mid" value={form.value_low_mid} onChange={handleChange} />

        <label>Value Low</label>
        <input type="number" step="0.01" name="value_low" value={form.value_low} onChange={handleChange} />

        <button type="submit">Add Card</button>
      </form>
    </div>
  );
}
