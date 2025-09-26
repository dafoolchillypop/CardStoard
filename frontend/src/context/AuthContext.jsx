import React, { createContext, useState, useEffect } from "react";
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if session exists on startup
  useEffect(() => {
  const checkAuth = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.status === 200) {
        setIsLoggedIn(true);
      }
    } catch {
      setIsLoggedIn(false);
    }
  };
  checkAuth();
}, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};
