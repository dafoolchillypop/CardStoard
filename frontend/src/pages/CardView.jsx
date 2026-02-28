// src/pages/CardView.jsx — public card view for QR scan / deep link
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./VerifySuccess.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

const GRADE_LABELS = {
  3.0: "MT",
  1.5: "NM-MT",
  1.0: "EX-MT",
  0.8: "VG-EX",
  0.4: "GD",
  0.2: "PR",
};

export default function CardView() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/cards/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("Card not found");
        return r.json();
      })
      .then(setCard)
      .catch(() => setError("This card could not be found."));
  }, [id]);

  if (error) {
    return (
      <div className="verify-container">
        <img src="/logo.png" alt="CardStoard" className="verify-logo" />
        <p style={{ color: "#888", marginTop: "1rem" }}>{error}</p>
        <Link to="/login" className="nav-btn" style={{ marginTop: "1rem" }}>
          Sign In
        </Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="verify-container">
        <img src="/logo.png" alt="CardStoard" className="verify-logo" />
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  const gradeLabel = GRADE_LABELS[parseFloat(card.grade)] || card.grade;
  const imageBase = window.location.hostname === "localhost"
    ? "http://host.docker.internal:8000"
    : "";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem", textAlign: "center" }}>
      <img src="/logo.png" alt="CardStoard" style={{ width: 200, marginBottom: "1rem" }} />

      <h2 style={{ margin: "0 0 0.25rem" }}>
        {card.year} {card.brand}
      </h2>
      <h3 style={{ margin: "0 0 0.5rem", fontWeight: 400 }}>
        {card.first_name} {card.last_name} #{card.card_number}
      </h3>

      <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
        Grade: <strong>{gradeLabel}</strong>
        &nbsp;&middot;&nbsp;
        <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{card.label_id}</span>
      </p>

      {card.front_image && (
        <img
          src={`${imageBase}${card.front_image}`}
          alt="Card front"
          style={{ maxWidth: "100%", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
        />
      )}

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#999" }}>
        <Link to="/login" style={{ color: "#007bff" }}>Sign in</Link> to see full details &amp; value
      </p>
    </div>
  );
}
