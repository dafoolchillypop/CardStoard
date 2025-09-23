// src/components/LogoutButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); // clear session
    navigate("/login"); // redirect
  };

  return (
    <button
      onClick={handleLogout}
      className="nav-btn"
      style={{ marginLeft: "0.5rem" }}
    >
      🚪 Logout
    </button>
  );
}
