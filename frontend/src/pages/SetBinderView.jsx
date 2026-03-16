// src/pages/SetBinderView.jsx — public set/binder view for QR scan / deep link
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./VerifySuccess.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

const TYPE_COLORS = { Factory: "#1976d2", Collated: "#d97706", Binder: "#16a34a" };

export default function SetBinderView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/boxes/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("This set could not be found."));
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

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem", textAlign: "center" }}>
      <img src="/logo.png" alt="CardStoard" style={{ width: 200, marginBottom: "1rem" }} />

      <h2 style={{ margin: "0 0 0.25rem" }}>
        {data.brand} {data.year}
      </h2>
      {data.name && (
        <h3 style={{ margin: "0 0 0.5rem", fontWeight: 400 }}>{data.name}</h3>
      )}

      <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
        <span
          style={{
            display: "inline-block",
            background: TYPE_COLORS[data.set_type] || "#555",
            color: "#fff",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "0.85rem",
            marginRight: "0.5rem",
          }}
        >
          {data.set_type}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{data.label_id}</span>
      </p>

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
