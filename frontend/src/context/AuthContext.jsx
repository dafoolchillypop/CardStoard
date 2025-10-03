// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null = unknown
  const [user, setUser] = useState(null);

  const logout = (msg = null) => {
    console.log("Logging out...");
    setIsLoggedIn(false);
    setUser(null);

    if (msg) alert(msg);

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    window.location.href = "/login";
  };

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => {
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
    <AuthContext.Provider value={{ isLoggedIn, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
