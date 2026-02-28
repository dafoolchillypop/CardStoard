// src/pages/BatchLabels.jsx — batch label print page
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./BatchLabels.css";

export default function BatchLabels() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode; // 'selection' | 'all'
  const ids = location.state?.ids || [];

  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mode) {
      navigate("/list-cards");
      return;
    }

    const fetch = mode === "all"
      ? api.get("/cards/labels/all")
      : api.post("/cards/labels/batch", { ids });

    fetch
      .then((res) => {
        setLabels(res.data);
        setLoading(false);
        setTimeout(() => window.print(), 400);
      })
      .catch(() => {
        setError("Failed to load label data.");
        setLoading(false);
      });
  }, []); // eslint-disable-line

  if (loading) {
    return (
      <div className="batch-screen-hint">
        <p>Generating QR codes{mode === "all" ? " for full collection" : ` for ${ids.length} card${ids.length !== 1 ? "s" : ""}`}...</p>
        <p style={{ color: "#999", fontSize: "0.85rem" }}>This may take a moment for large collections.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="batch-screen-hint">
        <p style={{ color: "#c00" }}>{error}</p>
        <button className="nav-btn" onClick={() => navigate("/list-cards")}>Back to Collection</button>
      </div>
    );
  }

  return (
    <>
      <div className="batch-screen-hint">
        <p>
          <strong>{labels.length} label{labels.length !== 1 ? "s" : ""}</strong> ready to print.
          Print dialog should open automatically. If not, press <strong>Ctrl+P</strong> / <strong>Cmd+P</strong>.
        </p>
        <button className="nav-btn" style={{ marginTop: "0.5rem" }} onClick={() => navigate("/list-cards")}>
          ← Back to Collection
        </button>
      </div>

      <div className="batch-grid">
        {labels.map((label) => (
          <div key={label.id} className="batch-label">
            <img
              className="batch-label-qr"
              src={`data:image/png;base64,${label.qr_b64}`}
              alt="QR"
            />
            <div className="batch-label-text">
              <span className="batch-label-id">{label.label_id}</span>
              <span className="batch-label-desc">{label.descriptor}</span>
              <span className="batch-label-grade">{label.grade}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
