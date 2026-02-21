import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import "./ImportCards.css";

export default function DictionaryImport() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    try {
      const res = await api.post("/dictionary/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message || "Import successful!");
      setError("");
    } catch (err) {
      console.error(err);
      setMessage("");
      const detail = err.response?.data?.detail || "Error uploading file.";
      setError(detail);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="import-container">
        <h2>Import Dictionary Entries</h2>
        <p className="import-subtitle">Upload a CSV file to bulk import player dictionary data</p>

        <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#555" }}>
          Expected columns:
        </p>
        <pre style={{ background: "#f4f4f4", padding: "0.6rem 1rem", borderRadius: "6px", textAlign: "left", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          First,Last,RookieYear,Brand,Year,CardNumber{"\n"}
          Mickey,Mantle,1951,Topps,1952,311
        </pre>

        <div className="import-box">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="import-input"
          />
          <button onClick={handleUpload} className="nav-btn">
            Upload File
          </button>
        </div>

        {message && <p className="import-success">{message}</p>}
        {error && <p className="import-error">{error}</p>}

        {message && (
          <div className="import-links">
            <Link className="nav-btn" to="/dictionary">📖 View Dictionary</Link>
            <Link className="nav-btn" to="/admin">⚙️ Back to Admin</Link>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/dictionary" style={{ color: "#0066cc", textDecoration: "underline", fontSize: "0.9rem" }}>
            ← Back to Dictionary
          </Link>
        </div>
      </div>
    </>
  );
}
