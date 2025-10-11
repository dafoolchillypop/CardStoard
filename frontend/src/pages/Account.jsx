import React, { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import api from "../api/api";
import "./Account.css";

export default function Account() {
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", current_password: "", new_password: "" });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/account/")
      .then(res => {
        setAccount(res.data);
        setForm({ username: res.data.username, email: res.data.email });
      })
      .catch(() => setError("Unable to fetch account details."))
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
    } catch (err) {
      showMessage(err.response?.data?.detail || "Failed to update username", true);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    try {
      await api.post("/account/update-email", { email: form.email });
      showMessage("Email updated. Please verify your new address.");
    } catch (err) {
      showMessage(err.response?.data?.detail || "Failed to update email", true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post("/account/change-password", {
        current_password: form.current_password,
        new_password: form.new_password
      });
      showMessage("Password changed successfully!");
      setForm({ ...form, current_password: "", new_password: "" });
    } catch (err) {
      showMessage(err.response?.data?.detail || "Failed to change password", true);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await api.delete("/account/delete");
        alert("Account deleted successfully. Logging out...");
        window.location.href = "/login";
      } catch {
        showMessage("Account deletion failed", true);
      }
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading account...</p>;
  if (error) return <p style={{ color: "red", textAlign: "center" }}>{error}</p>;

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
        </div>

        {/* --- USERNAME FORM --- */}
        <form onSubmit={handleUpdateUsername} className="account-form">
          <label>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <button type="submit" className="nav-btn">Update Username</button>
        </form>

        {/* --- EMAIL FORM --- */}
        <form onSubmit={handleUpdateEmail} className="account-form">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <button type="submit" className="nav-btn">Update Email</button>
        </form>

        {/* --- PASSWORD FORM --- */}
        <form onSubmit={handleChangePassword} className="account-form">
          <label>Current Password</label>
          <input
            type="password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            required
          />
          <label>New Password</label>
          <input
            type="password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
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
