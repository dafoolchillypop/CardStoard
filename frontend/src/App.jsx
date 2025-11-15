import React, { useContext } from "react";
import AppHeader from "./components/AppHeader";
import { AuthContext } from "./context/AuthContext";
import { Link } from "react-router-dom";

export default function Home() {
  const { isLoggedIn, user } = useContext(AuthContext);

  return (
    <>
      <AppHeader />
      <div className="home-container" style={{ textAlign: "center", marginTop: "2rem" }}>
        
        {/* ✅ Logo and title */}
        <div className="logo-slot" style={{ marginBottom: "1rem" }}>
          <img
            src="/logo.png"
            alt="CardStoard Logo"
            style={{ width: "550px", height: "auto" }}
          />
        </div>

        <h2 style={{ color: "#003366", fontWeight: "700", marginBottom: "0.5rem" }}>
          CardStoard
        </h2>

        <p
          className="home-subtitle"
          style={{ fontSize: "1.25rem", color: "#444", marginBottom: "1rem" }}
        >
          Collection Inventory and Valuation System
        </p>

        {/* ✅ Tagline */}
        <div
          style={{
            margin: "1rem auto 0.5rem",
            fontSize: "1.15rem",
            color: "#555",
          }}
        >
          Track cards 📇 | Manage inventory 📦 | Monitor value 📈
        </div>

        {/* ⭐ NEW — About link */}
        <div style={{ marginTop: "0.5rem", marginBottom: "2rem" }}>
          <Link
            to="/about"
            style={{
              color: "#167e30",
              fontWeight: "bold",
              textDecoration: "underline",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            About CardStoard
          </Link>
        </div>

        {/* ✅ Quick user summary (if logged in) */}
        {isLoggedIn && (
          <div
            style={{
              display: "inline-block",
              background: "#f8f9fc",
              border: "1px solid #ddd",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              borderRadius: "10px",
              padding: "1rem 2rem",
              marginTop: "1rem",
              fontSize: "1rem",
              color: "#333",
            }}
          >
            <p>
              Welcome back,{" "}
              <strong>{user?.username || user?.email?.split("@")[0]}</strong>!
            </p>
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              Use the navigation bar above to view your cards, analytics, or settings.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
