import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppHeader.css";

export default function AppHeader() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

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

      {/* --- Center: Navigation buttons (moved from Home) --- */}
      <div className="app-header-center">
        <Link to="/add-card">
          <button className="header-btn" title="Add a new card">
            ➕ Add Card
          </button>
        </Link>
        <Link to="/import-cards" className="header-btn">
        📥 Import Cards
        </Link>
        <Link to="/list-cards">
          <button className="header-btn" title="View all cards">
            📋 List Cards
          </button>
        </Link>
        <Link to="/analytics">
          <button className="header-btn" title="View analytics">
            📈 Analytics
          </button>
        </Link>
        <Link to="/admin">
          <button className="header-btn" title="Admin panel">
            ⚙️ Admin
          </button>
        </Link>
      </div>

      {/* --- Right: User info + logout --- */}
      <div className="app-header-right">
        <Link to="/account" className="user-info-link" title="Account details">
          <span className="user-info">{displayName}</span>
        </Link>
        <button className="header-btn" onClick={handleLogout} title="Logout">
          🚪 Logout
        </button>
      </div>
    </header>
  );
}
