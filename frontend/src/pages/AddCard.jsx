import React, { useEffect, useState } from "react";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
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
    book_high: "",
    book_high_mid: "",
    book_mid: "",
    book_low_mid: "",
    book_low: ""
  });

  const [cardMakes, setCardMakes] = useState([]);
  const [cardGrades, setCardGrades] = useState([]);
  const [smartMessage, setSmartMessage] = useState("");
  const [smartFillAvailable, setSmartFillAvailable] = useState(false);

  const checkSmartFillAvailability = async () => {
    if (!card.first_name || !card.last_name) {
      setSmartFillAvailable(false);
      return;
    }

    try {
      const res = await api.get("/cards/smart-fill", {
        params: { first_name: card.first_name.trim(), last_name: card.last_name.trim() }
      });
      setSmartFillAvailable(res.data.status === "ok");
    } catch {
      setSmartFillAvailable(false);
    }
  };

  // Watch first/last name changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkSmartFillAvailability();
    }, 300); // wait for typing to pause
    return () => clearTimeout(timeout);
  }, [card.first_name, card.last_name]);


  // Fetch global settings for dropdown values
  useEffect(() => {
    api.get("/settings/")
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

  const handleSmartFill = async () => {
  try {
    if (!card.first_name || !card.last_name) {
      alert("Please enter at least First and Last name before using Smart Fill.");
      return;
    }

    const params = {
      first_name: card.first_name.trim().toLowerCase(),
      last_name: card.last_name.trim().toLowerCase(),
    };

    if (card.brand) params.brand = card.brand;
    if (card.year && !isNaN(Number(card.year))) params.year = Number(card.year);

    const res = await api.get("/cards/smart-fill", { params });

    if (res.data.status === "ok") {
      if (res.data.fields.rookie !== undefined) {
        setCard((prev) => ({ ...prev, rookie: res.data.fields.rookie ? 1 : 0 }));
      }
      if (res.data.fields.card_number) {
        setCard((prev) => ({ ...prev, card_number: res.data.fields.card_number }));
      }
    } else {
      alert("No match found in dictionary.");
    }
  } catch (err) {
    console.error("Smart Fill error:", err);
    alert("Smart Fill failed. Check console for details.");
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post("/cards/", card)
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
          book_high: "",
          book_high_mid: "",
          book_mid: "",
          book_low_mid: "",
          book_low: ""
        });
        setSmartMessage("");
      })
      .catch(err => console.error(err));
  };

  return (
    <>
      <AppHeader/>
      <div className="container">
        <h2 className="page-header">Add Card</h2>
        
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

          {/* ✅ Show Smart Fill button right after Brand */}
          {smartFillAvailable && (
            <div style={{ marginTop: "0.5rem" }}>
              <button 
                type="button" 
                onClick={handleSmartFill} 
                className="nav-btn"
              >
                ⚡ Smart Fill
              </button>
            </div>
          )}
          <label>Card Number</label>
          <input
            name="card_number"
            value={card.card_number}
            onChange={handleChange}
          />

          <div className="rookie-container">
            <input
              type="checkbox"
              name="rookie"
              checked={Number(card.rookie) === 1}
              onChange={(e) =>
                setCard({ ...card, rookie: e.target.checked ? 1 : 0 })
              }
            />
            <div className="rookie-label">Rookie</div>
          </div>


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

          <div className="button-row">
            <button type="submit">Add Card</button>
          </div>

          {smartMessage && <p className="info-text">{smartMessage}</p>}
        </form>
      </div>
    </>
  );
}
