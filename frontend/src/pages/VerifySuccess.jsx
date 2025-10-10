import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VerifySuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/login"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "6rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* ✅ CardStoard Logo */}
      <img
        src="/logo.png"
        alt="CardStoard Logo"
        style={{
          width: "480px",
          height: "auto",
          marginBottom: "2rem",
        }}
      />

      <h2 style={{ fontSize: "1.8rem", color: "#222", marginBottom: "1rem" }}>
        ✅ Email Verified Successfully
      </h2>
      <p style={{ fontSize: "1.1rem", color: "#444", marginBottom: "1rem" }}>
        Your CardStoard account is now active.
      </p>
      <p style={{ fontSize: "1rem", color: "#666" }}>
        Redirecting to login in <b>5 seconds...</b>
      </p>

      {/* Optional direct button */}
      <button
        onClick={() => navigate("/login")}
        style={{
          marginTop: "2rem",
          padding: "0.7rem 1.5rem",
          fontSize: "1rem",
          border: "none",
          borderRadius: "6px",
          backgroundColor: "#0078d7",
          color: "#fff",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
        }}
      >
        Go to Login Now
      </button>
    </div>
  );
}
