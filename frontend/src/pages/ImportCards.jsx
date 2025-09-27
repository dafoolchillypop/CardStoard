import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

export default function ImportCards() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/cards/import-csv", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage(res.data.message || "Import successful!");
    } catch (err) {
      console.error(err);
      setMessage("Error uploading file.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>Import Cards</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>
        Upload
      </button>

      {message && (
        <div style={{ marginTop: "1rem" }}>
          <p>{message}</p>

          {/* Navigation buttons after success */}
          {message.startsWith("Successfully") && (
            <div style={{ marginTop: "1rem" }}>
              <Link className="nav-btn" to="/">Back to Home</Link>
              <Link className="nav-btn" to="/list-cards">List Cards</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
