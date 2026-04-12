/**
 * components/AppHeader.jsx
 * -------------------------
 * Sticky top navigation bar — renders only when the user is logged in.
 *
 * Layout:
 *   Left   — "CardStoard" logo link → /
 *   Center — Nav buttons controlled by settings.nav_items (null = show all):
 *              cards, balls (disabled), builds, sets_binders, wax (disabled), packs (disabled)
 *   Right  — Username (→ /account), analytics icon, admin gear, chat bubble (if chatbot enabled),
 *              about (?), logout door
 *
 * Settings integration:
 *   - fetchSettings() reads /settings/ for chatbot_enabled and nav_items.
 *   - Listens to the "settings-changed" custom event so changes in Admin propagate immediately
 *     without a page reload.
 *
 * show(key) — returns true if nav_items is null (show all) or includes the given key.
 */
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
  const [imageAiEnabled, setImageAiEnabled] = useState(false);
  const [navItems, setNavItems] = useState(null); // null = show all

  const show = (key) => navItems === null || navItems.includes(key);

  const fetchSettings = () => {
    api.get("/settings/")
      .then(res => {
        setChatbotEnabled(res.data.chatbot_enabled ?? false);
        setImageAiEnabled(res.data.enable_image_ai ?? false);
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
      {/* --- Left: App title + username --- */}
      <div className="app-header-left">
        <Link to="/" className="app-header-title">
          CardStoard
        </Link>
        <Link to="/account" className="user-info-link" title="Account details">
          <span className="user-info">{displayName}</span>
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
          <button className="header-btn" onClick={() => navigate("/balls")} title="Auto Balls">
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
          <button className="header-btn" onClick={() => navigate("/wax")} title="Wax Boxes">
            📦 Wax
          </button>
        )}
        {show("packs") && (
          <button className="header-btn" onClick={() => navigate("/packs")} title="Wax Packs">
            🧧 Packs
          </button>
        )}
        {imageAiEnabled && (
          <button className="header-btn" onClick={() => navigate("/scan")} title="Scan / Identify Card">
            📷 Scan
          </button>
        )}
        <button className="header-btn" onClick={() => navigate("/batch-capture")} title="Batch Photo Capture">
          📸 Capture
        </button>
      </div>

      {/* --- Right: admin, chat, about, logout --- */}
      <div className="app-header-right">
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
