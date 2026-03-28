import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import "./Account.css";

export default function Account() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({ username: "", current_password: "", new_password: "", confirm_password: "" });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/account/")
      .then(res => {
        setAccount(res.data);
        setForm({ username: res.data.username });
      })
      .catch(() => setLoadError("Unable to fetch account details."))
      .finally(() => setLoading(false));
  }, []);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setError(null);
      setMessage(null);
    }, 4000);
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      await api.post("/account/update-username", { username: form.username });
      showMessage("Username updated successfully!");
      setAccount({ ...account, username: form.username });
      setUser({ ...user, username: form.username });
    } catch (err) {
      showMessage(err.response?.data?.detail || "Failed to update username", true);
    }
  };

  const validatePassword = (pw) => {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain a number.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain a special character.";
    return null;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const pwError = validatePassword(form.new_password);
    if (pwError) { showMessage(pwError, true); return; }
    if (form.new_password !== form.confirm_password) {
      showMessage("Passwords do not match.", true);
      return;
    }
    try {
      await api.post("/account/change-password", {
        current_password: form.current_password,
        new_password: form.new_password
      });
      showMessage("Password changed successfully!");
      setForm({ ...form, current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      showMessage(err.response?.data?.detail || "Failed to change password", true);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await api.delete("/account/delete");
        alert("Account deleted successfully. Logging out...");
        navigate("/login");
      } catch {
        showMessage("Account deletion failed", true);
      }
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading account...</p>;
  if (loadError) return <p style={{ color: "red", textAlign: "center" }}>{loadError}</p>;

  return (
    <>
      <AppHeader />
      <div className="account-container">
        <h2>Account Management</h2>
        <p className="account-subtitle">Manage your CardStoard profile settings</p>

        {message && <p className="account-success">{message}</p>}
        {error && <p className="account-error">{error}</p>}

        {/* --- USER INFO --- */}
        <div className="account-info">
          <p><b>Account ID:</b> {account.id}</p>
          <p><b>Verified:</b> {account.is_verified ? "✅ Yes" : "❌ No"}</p>
          <p><b>Created:</b> {new Date(account.created_at).toLocaleDateString()}</p>
          <p><b>Last Login:</b> {account.last_login ? new Date(account.last_login).toLocaleString() : "—"}</p>
        </div>

        {/* --- USERNAME FORM --- */}
        <form onSubmit={handleUpdateUsername} className="account-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <button type="submit" className="nav-btn">Update Username</button>
        </form>

        {/* --- PASSWORD FORM --- */}
        <form onSubmit={handleChangePassword} className="account-form">
          <label htmlFor="current_password">Current Password</label>
          <input
            id="current_password"
            type="password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            required
          />
          <label htmlFor="new_password">New Password</label>
          <input
            id="new_password"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            required
          />
          <label htmlFor="confirm_password">Confirm New Password</label>
          <input
            id="confirm_password"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            required
          />
          <button type="submit" className="nav-btn">Change Password</button>
        </form>

        {/* --- DELETE ACCOUNT --- */}
        <div className="delete-section">
          <button className="delete-btn" onClick={handleDelete}>
            🗑️ Delete Account
          </button>
        </div>
      </div>
    </>
  );
}
