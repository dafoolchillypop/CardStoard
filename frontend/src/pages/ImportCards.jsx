import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import "./ImportCards.css";

export default function ImportCards() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setError("");
    setValidation(null);
  };

  const handleValidate = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setValidating(true);
    setValidation(null);
    try {
      const res = await api.post("/cards/validate-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setValidation(res.data);
    } catch (err) {
      setValidation({ valid: false, row_count: 0, errors: ["Validation request failed."], warnings: [] });
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/cards/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message || "Import successful!");
      setError("");
    } catch (err) {
      console.error(err);
      setMessage("");
      setError(err?.response?.data?.detail || "Error uploading file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="import-container">
        <h2>Import Cards</h2>
        <p className="import-subtitle">Upload your CSV file to bulk import card data</p>

        <p style={{ marginBottom: "1.5rem", fontSize: "1rem" }}>
          Need{" "}
          <Link to="/import-help" style={{ color: "#0066cc", textDecoration: "underline" }}>
            help
          </Link>
          ?
        </p>

        <div className="import-box">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="import-input"
          />
          <button
            onClick={handleValidate}
            className="nav-btn"
            disabled={!file || validating || loading}
            style={{ opacity: (!file || validating || loading) ? 0.65 : 1 }}
          >
            {validating ? "Validating..." : "Validate File"}
          </button>
          <button
            onClick={handleUpload}
            className="nav-btn"
            disabled={!file || loading || validating}
            style={{ opacity: (!file || loading || validating) ? 0.65 : 1 }}
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>
        </div>

        {validation && (
          <div style={{ marginTop: "1rem" }}>
            {validation.valid ? (
              <p className="import-success">
                ✅ {validation.row_count} row{validation.row_count !== 1 ? "s" : ""} ready to import — no errors found
              </p>
            ) : (
              <div>
                {validation.errors.map((e, i) => (
                  <p key={i} className="import-error">❌ {e}</p>
                ))}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                {validation.warnings.map((w, i) => (
                  <p
                    key={i}
                    style={{
                      color: "#856404",
                      background: "#fff3cd",
                      border: "1px solid #ffc107",
                      borderRadius: "6px",
                      padding: "0.4rem 0.75rem",
                      marginTop: "0.4rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {message && <p className="import-success">{message}</p>}
        {error && <p className="import-error">{error}</p>}

        {message && (
          <div className="import-links">
            <Link className="nav-btn" to="/">🏠 Back to Home</Link>
            <Link className="nav-btn" to="/list-cards">📋 View Card List</Link>
          </div>
        )}
      </div>
    </>
  );
}
