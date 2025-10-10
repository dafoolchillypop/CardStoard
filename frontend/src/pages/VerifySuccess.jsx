import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./VerifySuccess.css";

export default function VerifySuccess() {
  const navigate = useNavigate();

  // ⏱️ Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleContinue = () => {
    navigate("/login");
  };

  return (
    <div className="verify-container">
      {/* ✅ App logo */}
      <img
        src="/logo.png"
        alt="CardStoard Logo"
        className="verify-logo"
      />

      {/* ✅ Animated checkmark icon */}
      <div className="verify-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00aaff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="icon-check"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
      </div>

      {/* ✅ Success message */}
      <h2>Email Verified 🎉</h2>
      <p className="verify-message">
        Your email address has been successfully verified.<br />
        You can now log in and start tracking your collection.
      </p>

      <button className="nav-btn" onClick={handleContinue}>
        Continue to Login
      </button>

      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#777" }}>
        You’ll be redirected automatically in 5 seconds...
      </p>
    </div>
  );
}
