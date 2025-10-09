// src/pages/DeleteCard.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

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

  // ✅ Rookie check
  const isRookie =
    card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1 || card.rookie === true;

  // ✅ Grade badge
  const g = parseFloat(card.grade);
  let gradeClass = "grade-unknown";
  if (!Number.isNaN(g)) {
    if (g === 3) gradeClass = "grade-mt";
    else if (g === 1.5) gradeClass = "grade-ex";
    else if (g === 1) gradeClass = "grade-vg";
    else if (g === 0.8) gradeClass = "grade-gd";
    else if (g === 0.4) gradeClass = "grade-fr";
    else gradeClass = "grade-pr";
  }

  // ✅ Market factor + card value calc
  let cardValue = null;
  if (settings) {
    const books = [
      parseFloat(card.book_high) || 0,
      parseFloat(card.book_high_mid) || 0,
      parseFloat(card.book_mid) || 0,
      parseFloat(card.book_low_mid) || 0,
      parseFloat(card.book_low) || 0,
    ];
    const avgBook = books.reduce((a, b) => a + b, 0) / books.length;
    let factor = null;

    if (g === 3 && isRookie) factor = settings.auto_factor;
    else if (g === 3) factor = settings.mtgrade_factor;
    else if (isRookie) factor = settings.rookie_factor;
    else if (g === 1.5) factor = settings.exgrade_factor;
    else if (g === 1) factor = settings.vggrade_factor;
    else if (g === 0.8) factor = settings.gdgrade_factor;
    else if (g === 0.4) factor = settings.frgrade_factor;
    else if (g === 0.2) factor = settings.prgrade_factor;

    if (factor !== null) {
      cardValue = Math.round(avgBook * g * factor);
    }
  }

  let valueClass = "value-low";
  if (cardValue !== null) {
    if (cardValue >= 500) valueClass = "value-high";
    else if (cardValue >= 200) valueClass = "value-mid";
    else if (cardValue >= 50) valueClass = "value-lowmid";
  }

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
