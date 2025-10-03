// src/components/ProtectedRoute.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useContext(AuthContext);

  if (isLoggedIn === null) {
    // Still checking session — don’t redirect yet
    return <p>Loading...</p>; // (or a spinner UI)
  }

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
