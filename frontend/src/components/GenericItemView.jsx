// src/components/GenericItemView.jsx — shared public view page scaffold (QR scan / deep link)
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "../pages/VerifySuccess.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

export default function GenericItemView({ endpoint, notFoundMsg, children }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/${endpoint}/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError(notFoundMsg));
  }, [id, endpoint, notFoundMsg]);

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
      {children(data)}
      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#999" }}>
        <Link to="/login" style={{ color: "#007bff" }}>Sign in</Link> to see full details &amp; value
      </p>
    </div>
  );
}
