// src/pages/AddBox.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

export default function AddBox() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    brand: "",
    year: "",
    name: "",
    set_type: "factory",
    value: "",
    notes: "",
  });
  const [cardMakes, setCardMakes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings/")
      .then(res => setCardMakes(res.data.card_makes || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.brand) { setError("Brand is required."); return; }
    if (!form.year || isNaN(Number(form.year))) { setError("Year is required."); return; }

    const payload = {
      brand:    form.brand,
      year:     Number(form.year),
      name:     form.name || null,
      set_type: form.set_type,
      value:    form.value !== "" ? parseFloat(form.value) : null,
      notes:    form.notes || null,
    };

    try {
      await api.post("/boxes/", payload);
      navigate("/boxes");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : (detail || "Failed to add."));
    }
  };

  const labelStyle = { display: "block", marginBottom: "0.3rem", fontSize: "0.9rem", fontWeight: 600 };
  const inputStyle = { width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "0.95rem", boxSizing: "border-box" };

  return (
    <>
      <AppHeader />
      <div className="list-container" style={{ maxWidth: 480, margin: "0 auto", padding: "1rem 1.5rem" }}>
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 1.5rem" }}>
          Add Set / Binder
        </h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", borderRadius: 6,
              padding: "0.6rem 0.85rem", marginBottom: "1rem", color: "#dc3545", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Brand *</label>
            <select name="brand" value={form.brand} onChange={handleChange} style={inputStyle} required>
              <option value="">— Select brand —</option>
              {cardMakes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Year *</label>
            <input name="year" type="number" value={form.year} onChange={handleChange}
              style={inputStyle} placeholder="e.g. 1984" required />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Name <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
            <input name="name" type="text" value={form.name} onChange={handleChange}
              style={inputStyle} placeholder="e.g. Traded Series" />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Type</label>
            <select name="set_type" value={form.set_type} onChange={handleChange} style={inputStyle}>
              <option value="factory">Factory (sealed box)</option>
              <option value="collated">Collated (hand-built set)</option>
              <option value="binder">Binder (organized set)</option>
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Value <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
            <input name="value" type="number" step="0.01" value={form.value} onChange={handleChange}
              style={inputStyle} placeholder="$0.00" />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
            <textarea name="notes" value={form.notes} onChange={handleChange}
              style={{ ...inputStyle, height: 80, resize: "vertical" }}
              placeholder="Any additional notes…" />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="nav-btn" style={{ flex: 1 }}>
              ＋ Add Set / Binder
            </button>
            <Link to="/boxes">
              <button type="button" className="nav-btn secondary">Cancel</button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
