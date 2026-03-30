// src/pages/DeleteCard.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { calcCardValue } from "../utils/cardUtils";

export default function DeleteCard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get(`/cards/${id}`)
      .then((res) => setCard(res.data))
      .catch((err) => console.error("Error fetching card:", err));

    api.get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, [id]);

  if (!card) return <p>Loading card...</p>;

  // ✅ Card value computation
  const { isRookie, gradeClass, cardValue, valueClass } = calcCardValue(card, settings);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this card?")) return;
    try {
      await api.delete(`/cards/${id}`);
      alert("Card deleted successfully!");
      navigate("/list-cards");
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Failed to delete card.");
    }
  };

  return (
    <>
    <AppHeader />
    <div style={{ textAlign: "center" }}>
      {/* Heading with Rookie Star */}
      <h2>
        {card.year} {card.brand} {card.first_name} {card.last_name} #{card.card_number}
        {isRookie && (
          <span style={{ marginLeft: "0.5rem", color: "gold", fontSize: "1.5rem" }}>⭐ (RC)</span>
        )}
      </h2>

      {/* Grade + Value badges */}
      <div style={{ margin: "0.5rem 0" }}>
        {card.grade && (
          <span className={`badge badge-grade ${gradeClass}`}>
            Grade: {card.grade}
          </span>
        )}
        {cardValue !== null && (
          <span className={`badge badge-value ${valueClass}`}>
            Value: ${cardValue}
          </span>
        )}
      </div>

      {/* Images */}
      <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "1rem" }}>
        {card.front_image && (
          <img
            src={`http://host.docker.internal:8000${card.front_image}`}
            alt="Front"
            style={{ maxWidth: "800px", height: "auto" }}
          />
        )}
        {card.back_image && (
          <img
            src={`http://host.docker.internal:8000${card.back_image}`}
            alt="Back"
            style={{ maxWidth: "800px", height: "auto" }}
          />
        )}
      </div>

      {/* Navigation + Delete button */}
      <div style={{ marginTop: "1.5rem" }}>
        <Link to="/list-cards" className="nav-btn">⬅ Back to List</Link>
        <Link to="/" className="nav-btn" style={{ marginLeft: "1rem" }}>🏠 Home</Link>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={handleDelete}
          style={{
            backgroundColor: "red",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem"
          }}
        >
          ❌ Delete This Card
        </button>
      </div>
    </div>
    </>
  );
}
