import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./VerifySuccess.css";

export default function ResendVerify() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await api.post("/auth/resend-verify", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-container">
      <img src="/logo.png" alt="CardStoard Logo" className="verify-logo" />

      <h2>Resend Verification Email</h2>
      <p className="verify-message" style={{ marginBottom: "1.5rem" }}>
        Enter your email address and we'll send a new verification link.
      </p>

      {!message ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%", maxWidth: "360px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{ width: "100%", padding: "0.6rem 0.9rem", fontSize: "1rem", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "#cc3300", fontSize: "0.9rem", margin: 0 }}>{error}</p>}
          <button className="nav-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Verification Email"}
          </button>
        </form>
      ) : (
        <p style={{ color: "#167e30", fontSize: "1.1rem", fontWeight: 600, marginBottom: "1.5rem" }}>{message}</p>
      )}

      <button
        className="nav-btn"
        onClick={() => navigate("/login")}
        style={{ marginTop: "1rem", background: "linear-gradient(135deg, #555, #777)" }}
      >
        Back to Login
      </button>
    </div>
  );
}
