import React from "react";
import { useNavigate } from "react-router-dom";
import "./VerifySuccess.css";

export default function VerifyError() {
  const navigate = useNavigate();

  return (
    <div className="verify-container">
      <img src="/logo.png" alt="CardStoard Logo" className="verify-logo" />

      <div className="verify-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#cc3300"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "80px", height: "80px", filter: "drop-shadow(0 0 6px rgba(204,51,0,0.5))" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>

      <h2>Verification Failed</h2>
      <p className="verify-message">
        This verification link is invalid or has expired.<br />
        Links expire after 1 hour.
      </p>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="nav-btn" onClick={() => navigate("/resend-verify")}>
          Request a New Link
        </button>
        <button className="nav-btn" onClick={() => navigate("/login")} style={{ background: "linear-gradient(135deg, #555, #777)" }}>
          Back to Login
        </button>
      </div>
    </div>
  );
}
