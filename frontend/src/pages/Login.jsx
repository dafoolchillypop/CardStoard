// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setIsLoggedIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", totp: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // ⏳ new

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
        totp: form.totp || undefined,
      });

      // MFA prompt
      if (res.data.mfa_required) {
        setError("MFA code required. Please enter it.");
        setLoading(false);
        return;
      }

      // ✅ Populate user context immediately
      if (res.data.user) {
        setUser(res.data.user);
        setIsLoggedIn(true);
      } else {
        // fallback: validate cookies
        const me = await api.get("/auth/me");
        setUser(me.data);
        setIsLoggedIn(true);
      }

      setForm({ email: "", password: "", totp: "" });
      navigate("/"); // redirect home
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ margin: "2rem auto", textAlign: "center" }}>
      {/* Logo */}
      <div className="logo-slot" style={{ marginBottom: "1rem" }}>
        <img
          src="/logo.png"
          alt="CardStoard Logo"
          style={{ width: "550px", height: "auto" }}
        />
      </div>

      <h2>Login</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          alignItems: "center",
          maxWidth: "320px",
          margin: "0 auto",
        }}
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "0.5rem" }}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "0.5rem" }}
        />
        <input
          type="text"
          name="totp"
          placeholder="MFA Code (if enabled)"
          value={form.totp}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem" }}
        />

        <button
          type="submit"
          className="nav-btn"
          style={{ padding: "0.75rem", fontSize: "1rem", width: "100%" }}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Log In"}
        </button>

        {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      </form>

      <p style={{ marginTop: "1rem" }}>
        Don’t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
