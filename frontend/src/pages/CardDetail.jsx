// src/pages/CardDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";

export default function CardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [labelData, setLabelData] = useState(null);
  const [labelLoading, setLabelLoading] = useState(false);

  useEffect(() => {
    // Fetch card
    api.get(`/cards/${id}`)
      .then((res) => setCard(res.data))
      .catch((err) => console.error("Error fetching card:", err));

    // Fetch settings (for market factor/value calc)
    api.get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, [id]);

  const handlePrintLabel = () => {
    setLabelLoading(true);
    api.get(`/cards/${id}/public`)
      .then((res) => setLabelData(res.data))
      .catch((err) => console.error("Label fetch error:", err))
      .finally(() => setLabelLoading(false));
  };

  if (!card) return <p>Loading card...</p>;

  // Label ID — matches what's printed on the label
  const labelId = `CS-CD-${String(card.id).padStart(6, "0")}`;

  // Last updated — formatted
  const updatedAt = card.updated_at
    ? new Date(card.updated_at).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

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

  return (
    <>
    <AppHeader />
    <LabelPreviewModal
      labelData={labelData}
      onPrint={() => window.open(`/card-label/${id}`, "_blank")}
      onClose={() => setLabelData(null)}
    />
    <div style={{ textAlign: "center" }}>
      {/* Heading with Rookie Star */}
      <h2>
        {card.year} {card.brand} {card.first_name} {card.last_name} #{card.card_number}
        {isRookie && (
          <span style={{ marginLeft: "0.5rem", color: "gold", fontSize: "1.5rem" }}>⭐ (RC)</span>
        )}
      </h2>

      {/* Card ID + meta row */}
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0.5rem" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-secondary)" }}>{labelId}</span>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <span>Updated {updatedAt}</span>
      </div>

      {/* Grade Badge */}
      <div style={{ margin: "0.5rem 0" }}>
        {card.grade && (
          <span className={`badge badge-grade ${gradeClass}`}>
            Grade: {card.grade}
          </span>
        )}

      {/* Card Value Badge */}
        {cardValue !== null && (
          <span className={`badge badge-value ${valueClass}`}>
            Value: ${cardValue}
          </span>
        )}
      </div>

      {/* Images */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginTop: "1rem",
        }}
      >
      {card.front_image && (
        <img
          src={`http://host.docker.internal:8000${card.front_image}`}
          alt="Front"
          style={{
            maxWidth: "800px",
            height: "auto",
          }}
        />
      )}
      {card.back_image && (
        <img
          src={`http://host.docker.internal:8000${card.back_image}`}
          alt="Back"
          style={{
            maxWidth: "800px",
            height: "auto",
          }}
        />
      )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
        <button
          className="nav-btn"
          onClick={handlePrintLabel}
          disabled={labelLoading}
        >
          {labelLoading ? "Loading…" : "🖨️ Print Label"}
        </button>
        <Link to="/list-cards" className="nav-btn secondary">⬅ Back to List</Link>
      </div>
    </div>
    </>
  );
}
