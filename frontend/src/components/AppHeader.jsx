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
  const [navItems, setNavItems] = useState(null); // null = show all

  const show = (key) => navItems === null || navItems.includes(key);

  const fetchSettings = () => {
    api.get("/settings/")
      .then(res => {
        setChatbotEnabled(res.data.chatbot_enabled ?? false);
        setNavItems(res.data.nav_items ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchSettings();
    window.addEventListener("settings-changed", fetchSettings);
    return () => window.removeEventListener("settings-changed", fetchSettings);
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
        {show("cards") && (
          <Link to="/list-cards">
            <button className="header-btn" title="View your collection">
              📇 Cards
            </button>
          </Link>
        )}
        {show("balls") && (
          <button className="header-btn" disabled title="Coming soon">
            ⚾ Balls
          </button>
        )}
        {show("builds") && (
          <Link to="/sets">
            <button className="header-btn" title="Builds">
              🏗️ Builds
            </button>
          </Link>
        )}
        {show("sets_binders") && (
          <Link to="/boxes">
            <button className="header-btn" title="Sets / Binders">
              📓 Sets/Binders
            </button>
          </Link>
        )}
        {show("wax") && (
          <button className="header-btn" disabled title="Coming soon">
            📦 Wax
          </button>
        )}
        {show("packs") && (
          <button className="header-btn" disabled title="Coming soon">
            🧧 Packs
          </button>
        )}
      </div>

      {/* --- Right: user info, admin, chat, about, logout --- */}
      <div className="app-header-right">
        <Link to="/account" className="user-info-link" title="Account details">
          <span className="user-info">{displayName}</span>
        </Link>
        {show("analytics") && (
          <button className="header-icon-btn" onClick={() => navigate("/analytics")} title="Analytics">
            📊
          </button>
        )}
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
