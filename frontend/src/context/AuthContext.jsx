// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/api";

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null = unknown
  const [user, setUser] = useState(null);

  const logout = async (msg = null) => {
    try {
      await api.post("/auth/logout"); // clear cookies on backend
    } catch (err) {
      console.warn("Logout API failed (may already be expired).");
    }

    setIsLoggedIn(false);
    setUser(null);

    // Just in case: remove any non-HttpOnly cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    if (msg) alert(msg);
  };

  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register", "/verify-success", "/verify-error", "/forgot-password"];
    if (publicRoutes.includes(window.location.pathname)) {
      setIsLoggedIn(false);
      return; // ✅ Don’t trigger /auth/me on public routes
    }

    api.get("/auth/me")
      .then((res) => {
        console.log("USER:", res.data);
        setUser(res.data);
        setIsLoggedIn(true);
      })
      .catch(() => {
        setUser(null);
        setIsLoggedIn(false);
      });
  }, []);

  // If we’re still checking, don’t render children yet
  if (isLoggedIn === null) {
    return <p>Loading session...</p>;
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, logout, setUser, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};