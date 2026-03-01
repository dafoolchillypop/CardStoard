// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/api";
import { setAuthContext } from "../utils/logoutHandler";

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

  // Register logout handler so api.js interceptor can trigger logout
  useEffect(() => {
    setAuthContext({ logout });
  }, []); // eslint-disable-line

  const applyTheme = (dark) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  };

  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register", "/verify-success", "/verify-error", "/resend-verify", "/forgot-password"];
    const publicPrefixes = ["/card-view/", "/card-label/"];
    const path = window.location.pathname;
    if (publicRoutes.includes(path) || publicPrefixes.some((p) => path.startsWith(p))) {
      setIsLoggedIn(false);
      return; // ✅ Don’t trigger /auth/me on public routes
    }

    api.get("/auth/me")
      .then((res) => {
        console.log("USER:", res.data);
        setUser(res.data);
        setIsLoggedIn(true);
        // Apply dark mode preference from settings
        api.get("/settings/")
          .then((sr) => applyTheme(sr.data.dark_mode))
          .catch(() => {});
      })
      .catch(() => {
        setUser(null);
        setIsLoggedIn(false);
      });
  }, []);

  // Re-apply theme when settings are updated from any page
  useEffect(() => {
    const handler = () => {
      api.get("/settings/")
        .then((sr) => applyTheme(sr.data.dark_mode))
        .catch(() => {});
    };
    window.addEventListener("settings-changed", handler);
    return () => window.removeEventListener("settings-changed", handler);
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