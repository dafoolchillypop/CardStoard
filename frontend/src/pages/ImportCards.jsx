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

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setError("");
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
      setError("Error uploading file.");
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

        {/* ⭐ NEW: Link to Import Help */}
        <p style={{ marginBottom: "1.5rem", fontSize: "1rem" }}>
          <p style={{ marginBottom: "1.5rem", fontSize: "1rem" }}>
          Need{" "}
            <Link
              to="/import-help"
              style={{ color: "#0066cc", textDecoration: "underline" }}
            >
              help
            </Link>
            ?
          </p>
        </p>

        <div className="import-box">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="import-input"
          />
          <button
            onClick={handleUpload}
            className="nav-btn"
            disabled={!file || loading}
            style={{ opacity: (!file || loading) ? 0.65 : 1 }}
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>
        </div>

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
