import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function UpdateCard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [cardMakes, setCardMakes] = useState([]);
  const [cardGrades, setCardGrades] = useState([]);

  // Fetch global settings + card details
  useEffect(() => {
    axios.get("/settings/")
      .then(res => {
        setCardMakes(res.data.card_makes || []);
        setCardGrades(res.data.card_grades || []);
      })
      .catch(err => console.error("Error fetching settings:", err));

    axios.get(`/cards/${id}`)
      .then(res => setCard(res.data))
      .catch(err => console.error("Error fetching card:", err));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCard({ ...card, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.put(`/cards/${id}`, card)
      .then(() => {
        alert("Card updated successfully!");
        navigate("/list-cards");
      })
      .catch(err => console.error(err));
  };

  const handleFileUpload = async (e, type) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const url = `/cards/${card.id}/upload-${type}`;
    const res = await axios.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // ✅ Update local state with the new image path
    setCard((prev) => ({
      ...prev,
      [`${type}_image`]: res.data[`${type}_image`],
    }));
  } catch (err) {
    console.error("Error uploading file:", err);
  }
};

  if (!card) return <p>Loading...</p>;

  return (
    <div className="container">
      {/* Centered Back to Home link */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
      </div>
      
      <h2 className="page-header">Update Card</h2>

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

        {/* ✅ Brand dropdown from settings */}
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

        <label className="checkbox-label">
        <input
          type="checkbox"
          name="rookie"
          checked={Number(card.rookie) === 1}
          onChange={(e) => setCard({ ...card, rookie: e.target.checked ? 1 : 0 })}
        />
        Rookie
        </label>

        {/* ✅ Grade dropdown from settings */}
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
          name="book_high"
          value={card.book_high}
          onChange={handleChange}
        />

        <label>High-Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="book_high_mid"
          value={card.book_high_mid}
          onChange={handleChange}
        />

        <label>Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="book_mid"
          value={card.book_mid}
          onChange={handleChange}
        />

        <label>Low-Mid Value</label>
        <input
          type="number"
          step="0.01"
          name="book_low_mid"
          value={card.book_low_mid}
          onChange={handleChange}
        />

        <label>Low Value</label>
        <input
          type="number"
          step="0.01"
          name="book_low"
          value={card.book_low}
          onChange={handleChange}
        />
        
        <div>
          <label>Front Image</label>
          <input type="file" onChange={(e) => handleFileUpload(e, "front")} />
        </div>
        <div>
        <label>Back Image</label>
        <input type="file" onChange={(e) => handleFileUpload(e, "back")} />
        </div>

        <button type="submit">Update Card</button>
      </form>
    </div>
  );
}
