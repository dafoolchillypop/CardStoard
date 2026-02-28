// src/pages/CardLabel.jsx — standalone print page for Avery 6427 (1.75" x 0.75")
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./CardLabel.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

export default function CardLabel() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/cards/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setCard(data);
        // Trigger print dialog once loaded
        setTimeout(() => window.print(), 300);
      })
      .catch(() => setError("Card not found."));
  }, [id]);

  if (error) return <p className="card-label-error">{error}</p>;
  if (!card) return <p className="card-label-loading">Loading...</p>;

  return (
    <>
      {/* Screen message — hidden when printing */}
      <div className="card-label-screen-hint">
        <p>Print dialog should open automatically. If not, press <strong>Ctrl+P</strong> / <strong>Cmd+P</strong>.</p>
      </div>

      {/* The label — this is what prints */}
      <div className="card-label">
        <img
          className="card-label-qr"
          src={`data:image/png;base64,${card.qr_b64}`}
          alt="QR"
        />
        <div className="card-label-text">
          <span className="card-label-id">{card.label_id}</span>
          <span className="card-label-desc">{card.descriptor}</span>
          <span className="card-label-grade">{card.grade}</span>
        </div>
      </div>
    </>
  );
}
