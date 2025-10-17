// src/components/LogoutButton.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function LogoutButton() {
  const { logout } = useContext(AuthContext);

  return (
    <button className="nav-btn" onClick={() => logout()}>
      🚪 Logout
    </button>
  );
}
