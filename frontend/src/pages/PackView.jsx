// src/pages/PackView.jsx — public wax pack view for QR scan / deep link
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./VerifySuccess.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

const PACK_TYPE_COLORS = {
  cello:   { bg: "#1d4ed8", text: "#fff" },
  rack:    { bg: "#d97706", text: "#fff" },
  wax:     { bg: "#16a34a", text: "#fff" },
  blister: { bg: "#7c3aed", text: "#fff" },
};

export default function PackView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/packs/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("This pack could not be found."));
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

  if (!data) {
    return (
      <div className="verify-container">
        <img src="/logo.png" alt="CardStoard" className="verify-logo" />
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  const typeColors = data.pack_type
    ? PACK_TYPE_COLORS[data.pack_type.toLowerCase()] || { bg: "#6b7280", text: "#fff" }
    : null;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem", textAlign: "center" }}>
      <img src="/logo.png" alt="CardStoard" style={{ width: 200, marginBottom: "1rem" }} />

      <h2 style={{ margin: "0 0 0.25rem" }}>{data.descriptor}</h2>

      <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
        {data.pack_type && typeColors && (
          <span style={{
            display: "inline-block",
            background: typeColors.bg,
            color: typeColors.text,
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "0.85rem",
            marginRight: "0.5rem",
            textTransform: "capitalize",
          }}>
            {data.pack_type}
          </span>
        )}
        <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{data.label_id}</span>
      </p>

      {data.quantity && data.quantity > 1 && (
        <p style={{ fontSize: "0.95rem", color: "#444", margin: "0 0 0.5rem" }}>
          Qty: {data.quantity}
        </p>
      )}

      {data.notes && (
        <p style={{ fontSize: "0.9rem", color: "#666", fontStyle: "italic", margin: "0 0 1rem" }}>
          {data.notes}
        </p>
      )}

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#999" }}>
        <Link to="/login" style={{ color: "#007bff" }}>Sign in</Link> to see full details &amp; value
      </p>
    </div>
  );
}
