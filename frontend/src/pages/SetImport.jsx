// src/pages/SetImport.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import "./ImportCards.css";

export default function SetImport() {
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setValidation(null);
    setImportResult(null);
    setError("");
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    reset();
  };

  const handleValidate = async () => {
    if (!file) { setError("Please select a CSV file first."); return; }
    setLoading(true);
    setError("");
    reset();
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/sets/validate-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setValidation(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/sets/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      setValidation(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const canImport = validation && validation.valid;

  return (
    <>
      <AppHeader />
      <div className="import-container">
        <h2>Import Set</h2>
        <p className="import-subtitle">Upload a CSV file to bulk import a card set master list</p>

        <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Expected columns:
        </p>
        <pre style={{ background: "var(--bg-muted)", color: "var(--text-primary)", padding: "0.6rem 1rem", borderRadius: "6px", textAlign: "left", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          SetName,Brand,Year,CardNumber,First,Last,Rookie{"\n"}
          1952 Topps Baseball,Topps,1952,1,Andy,Pafko,0{"\n"}
          1952 Topps Baseball,Topps,1952,311,Mickey,Mantle,1
        </pre>

        <div className="import-box">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="import-input"
          />
          <button onClick={handleValidate} className="nav-btn" disabled={loading || !file}>
            {loading && !canImport ? "Validating..." : "Validate File"}
          </button>
          {canImport && (
            <button onClick={handleImport} className="nav-btn" disabled={loading}
              style={{ background: "#1a7a1a" }}>
              {loading ? "Importing..." : "Import"}
            </button>
          )}
        </div>

        {error && <p className="import-error">{error}</p>}

        {/* Validation results */}
        {validation && (
          <div style={{ marginTop: "1.5rem", textAlign: "left", maxWidth: "540px", margin: "1.5rem auto 0" }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Validation {validation.valid ? "✅ Passed" : "❌ Failed"} — {validation.row_count} rows, {validation.set_count} set(s)
            </p>

            {validation.errors.length > 0 && (
              <div className="import-error" style={{ marginBottom: "0.75rem" }}>
                <strong>Errors ({validation.errors.length}):</strong>
                <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div style={{ background: "#fff8e1", border: "1px solid #f9a825", borderRadius: "6px",
                padding: "0.6rem 1rem", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                <strong>Warnings ({validation.warnings.length}):</strong>
                <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                  {validation.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
                  {validation.warnings.length > 10 && <li>…and {validation.warnings.length - 10} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div>
            <p className="import-success">{importResult.message}</p>
            <div className="import-links">
              <Link className="nav-btn" to="/sets">🗂️ View Sets</Link>
              <Link className="nav-btn" to="/admin">⚙️ Back to Admin</Link>
            </div>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/sets" style={{ color: "#0066cc", textDecoration: "underline", fontSize: "0.9rem" }}>
            ← Back to Sets
          </Link>
        </div>
      </div>
    </>
  );
}
