// src/pages/Login.jsx
import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    totp: "",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
        totp: form.totp || undefined, // optional MFA field
      });

      if (res.data.mfa_required) {
        setError("MFA code required. Please enter it.");
        return;
      }

      // ✅ On success, send to home
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="login-container" style={{ margin: "2rem auto", textAlign: "center" }}>
      {/* ✅ Logo slot */}
      <div className="logo-slot" style={{ textAlign: "center", marginBottom: "1rem" }}>
        <img 
          src="/logo.png" 
          alt="CardStoard Logo" 
          style={{ width: "550px", height: "auto" }}
        />
      </div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="totp"
          placeholder="MFA Code (if enabled)"
          value={form.totp}
          onChange={handleChange}
        />
        <button type="submit" className="nav-btn" style={{ padding: "0.75rem", fontSize: "1rem" }}>LogIn</button>
      </form>
      <p>
        Don’t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
