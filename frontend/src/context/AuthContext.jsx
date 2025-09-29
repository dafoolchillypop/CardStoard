// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import api from "../api/api";
import { setAuthContext } from "../utils/logoutHandler";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const logout = (msg = null) => {
    console.log("Logging out...");
    setIsLoggedIn(false);
    setUser(null);

    // Show message
    if (msg) alert(msg);

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Redirect to login
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

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
