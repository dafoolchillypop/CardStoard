// src/components/AppHeader.jsx
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

  const handleHome = () => {
    navigate("/");
  };

  if (!isLoggedIn) return null;

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link to="/" className="app-header-title">
          CardStoard
        </Link>
      </div>

      <div className="app-header-center">
        <button className="header-btn" onClick={handleHome} title="Back to Home">
          🏠 Home
        </button>
      </div>
      
      <div className="app-header-right">
        {user && (
          <>
            <Link to="/account" clasName="user-info-link">
              {user.username || user.email}
            </Link>
            <button className="header-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
