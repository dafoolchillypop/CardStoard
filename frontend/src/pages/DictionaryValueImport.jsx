import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import "./ImportCards.css";

export default function DictionaryValueImport() {
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);

  const reset = () => {
    setValidation(null);
    setImportResult(null);
    setError("");
    setShowNotFound(false);
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
      const res = await api.post("/dictionary/validate-values-csv", formData, {
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
      const res = await api.post("/dictionary/import-values-csv", formData, {
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

  const canImport = validation && validation.valid && validation.match_count > 0;

  return (
    <>
      <AppHeader />
      <div className="import-container">
        <h2>Import Book Values</h2>
        <p className="import-subtitle">Upload a CSV file to bulk-update book values in the Player Dictionary</p>

        <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Expected columns:
        </p>
        <pre style={{ background: "var(--bg-muted)", color: "var(--text-primary)", padding: "0.6rem 1rem", borderRadius: "6px", textAlign: "left", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Brand,Year,CardNumber,BookHigh,BookHighMid,BookMid,BookLowMid,BookLow{"\n"}
          Topps,1952,311,500.00,350.00,200.00,100.00,50.00
        </pre>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Lookup key: <strong>Brand + Year + CardNumber</strong> (case-insensitive).
          Rows with no matching dictionary entry are skipped and reported below.
        </p>

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
              Validation {validation.valid ? "✅ Passed" : "❌ Failed"} — {validation.row_count} rows,{" "}
              <span style={{ color: "#1a7a1a" }}>{validation.match_count} matched</span>
              {validation.not_found_count > 0 && (
                <span style={{ color: "#dc3545" }}>, {validation.not_found_count} not found</span>
              )}
            </p>

            {validation.errors.length > 0 && (
              <div className="import-error" style={{ marginBottom: "0.75rem" }}>
                <strong>Errors ({validation.errors.length}):</strong>
                <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {validation.not_found_count > 0 && (
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                <button onClick={() => setShowNotFound(v => !v)}
                  style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                  {showNotFound ? "Hide" : "Show"} not-found preview ({Math.min(validation.not_found.length, 20)})
                </button>
                {showNotFound && (
                  <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
                    {validation.not_found.map((d, i) => (
                      <li key={i}>{d.brand} {d.year} #{d.card_number}</li>
                    ))}
                    {validation.not_found_count > 20 && <li>…and {validation.not_found_count - 20} more</li>}
                  </ul>
                )}
              </div>
            )}

            {validation.valid && validation.match_count === 0 && (
              <p style={{ color: "#dc3545", fontSize: "0.9rem" }}>
                No rows matched existing dictionary entries. Check that Brand/Year/CardNumber match your dictionary exactly.
              </p>
            )}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div>
            <p className="import-success">{importResult.message}</p>
            <div className="import-links">
              <Link className="nav-btn" to="/dictionary">📖 View Dictionary</Link>
              <Link className="nav-btn" to="/admin">⚙️ Back to Admin</Link>
            </div>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/admin" style={{ color: "#0066cc", textDecoration: "underline", fontSize: "0.9rem" }}>
            ← Back to Admin
          </Link>
        </div>
      </div>
    </>
  );
}
