import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatPanel from "./ChatPanel";
import api from "../api/api";
import "./AppHeader.css";

export default function AppHeader() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);

  const fetchChatbotSetting = () => {
    api.get("/settings/")
      .then(res => setChatbotEnabled(res.data.chatbot_enabled ?? false))
      .catch(() => {});
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchChatbotSetting();
    window.addEventListener("settings-changed", fetchChatbotSetting);
    return () => window.removeEventListener("settings-changed", fetchChatbotSetting);
  }, [isLoggedIn]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isLoggedIn) return null;

  // Prefer username, fallback to email prefix
  const displayName = user?.username || user?.email?.split("@")[0] || "User";

  return (
    <header className="app-header">
      {/* --- Left: App title --- */}
      <div className="app-header-left">
        <Link to="/" className="app-header-title">
          CardStoard
        </Link>
      </div>

      {/* --- Center: Primary navigation --- */}
      <div className="app-header-center">
        <Link to="/list-cards">
          <button className="header-btn" title="View your collection">
            📋 Cards
          </button>
        </Link>
        <button className="header-btn" disabled title="Coming soon">
          ⚾ Balls
        </button>
        <Link to="/sets">
          <button className="header-btn" title="My Sets">
            🗂️ Sets
          </button>
        </Link>
        <Link to="/boxes">
          <button className="header-btn" title="Boxes / Binders">
            📦 Boxes/Binders
          </button>
        </Link>
        <button className="header-btn" disabled title="Coming soon">
          🧱 Wax
        </button>
        <button className="header-btn" disabled title="Coming soon">
          📦 Packs
        </button>
      </div>

      {/* --- Right: user info, admin, chat, about, logout --- */}
      <div className="app-header-right">
        <Link to="/account" className="user-info-link" title="Account details">
          <span className="user-info">{displayName}</span>
        </Link>
        <button className="header-icon-btn" onClick={() => navigate("/analytics")} title="Analytics">
          📈
        </button>
        <button className="header-icon-btn" onClick={() => navigate("/admin")} title="Admin Settings">
          ⚙️
        </button>
        {chatbotEnabled && (
          <button
            className="header-icon-btn"
            onClick={() => setChatOpen((o) => !o)}
            title="Collection Assistant"
          >
            💬
          </button>
        )}
        <button className="header-icon-btn" onClick={() => navigate("/about")} title="About CardStoard">
          ❓
        </button>
        <button className="header-icon-btn" onClick={handleLogout} title="Logout">
          🚪
        </button>
      </div>

      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </header>
  );
}
