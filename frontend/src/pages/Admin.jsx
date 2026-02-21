import React, { useEffect, useState } from "react";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { Link, useNavigate } from "react-router-dom";
import ChipsInput from "../components/ChipsInput";
import "./Admin.css";

export default function Admin() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [dictCount, setDictCount] = useState(null);
  const [exportFormat, setExportFormat] = useState("csv");
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [dmTooltip, setDmTooltip] = useState(null);
  const [dmLoading, setDmLoading] = useState(null);

  useEffect(() => {
    api.get("/settings/")
      .then(res => {
        setSettings({
          ...res.data,
          card_makes: res.data.card_makes || [],
          card_grades: res.data.card_grades || []
        });
      })
      .catch(err => console.error(err));

    api.get("/dictionary/count")
      .then(res => setDictCount(res.data.count))
      .catch(err => console.error("Error fetching dictionary count:", err));
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    api.put("/settings/", settings)
      .then(res => {
        setSettings(res.data);
        alert("Settings updated!");
      })
      .catch(err => console.error(err));
  };

  const handleToggle = async (field) => {
    try {
      const updated = { ...settings, [field]: !settings[field] };
      const res = await api.put("/settings/", updated);
      setSettings(res.data);
      window.dispatchEvent(new Event("settings-changed"));
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  const handleExport = async () => {
    setDmLoading("export");
    try {
      const ext = exportFormat;
      const res = await api.get("/cards/export", {
        params: { format: exportFormat },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `cards.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDmLoading(null);
    }
  };

  const handleBackup = async () => {
    setDmLoading("backup");
    try {
      const res = await api.get("/cards/backup", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "cardstoard_backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup failed:", err);
    } finally {
      setDmLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    if (!window.confirm("This will REPLACE all your current cards with the backup. Continue?")) return;
    setDmLoading("restore");
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);
      const res = await api.post("/cards/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRestoreMsg(res.data.message || `Restored ${res.data.restored} cards.`);
      setRestoreError("");
      setRestoreFile(null);
    } catch (err) {
      setRestoreError(err.response?.data?.detail || "Restore failed.");
      setRestoreMsg("");
    } finally {
      setDmLoading(null);
    }
  };

  const InfoIcon = ({ id, text }) => (
    <span style={{ position: "relative", display: "inline-block", marginLeft: "0.4rem" }}>
      <span
        onMouseEnter={() => setDmTooltip(id)}
        onMouseLeave={() => setDmTooltip(null)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "16px", height: "16px", borderRadius: "50%",
          background: "#aaa", color: "#fff", fontSize: "0.7rem",
          fontWeight: 700, cursor: "default", userSelect: "none",
        }}
      >i</span>
      {dmTooltip === id && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#333", color: "#fff", fontSize: "0.78rem",
          padding: "0.4rem 0.65rem", borderRadius: "6px",
          whiteSpace: "nowrap", zIndex: 100,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}>
          {text}
        </span>
      )}
    </span>
  );

  // ✅ Loading check should be here
  if (!settings) return <p>Loading...</p>;

  return (
    <>
      <AppHeader />
      <div className="container">
        <h2 className="page-header">Admin Settings</h2>

        <div className="smartfill-container">
            <input
              type="checkbox"
              name="smart"
              checked={settings.enable_smart_fill}
              onChange={() => handleToggle("enable_smart_fill")}
            />
            <div className="smartfill-label">Smart Fill</div>
          </div>

        <div className="smartfill-container">
            <input
              type="checkbox"
              name="chatbot"
              checked={settings.chatbot_enabled ?? false}
              onChange={() => handleToggle("chatbot_enabled")}
            />
            <div className="smartfill-label">Collection Assistant (Chatbot)</div>
          </div>

         <form className="settings-form" onSubmit={handleSubmit}>
          {/* General Settings */}
          <div className="card-section">
            <h3>General Settings</h3>
            <label>App Name</label>
            <input
              name="app_name"
              value={settings.app_name}
              onChange={handleChange}
            />

            <ChipsInput
              label="Card Makes"
              values={settings.card_makes}
              setValues={(vals) => setSettings({ ...settings, card_makes: vals })}
            />

            <ChipsInput
              label="Card Grades"
              values={settings.card_grades}
              setValues={(vals) => setSettings({ ...settings, card_grades: vals })}
              type="text"
            />
          </div>

          {/* Factor Settings */}
          <div className="card-section">
            <h3>Factor Settings</h3>
            <div className="factor-group">
              <div>
                <label>Rookie Factor</label>
                <input type="number" step="0.01" name="rookie_factor" value={settings.rookie_factor} onChange={handleChange} />
              </div>
              <div>
                <label>Auto Factor</label>
                <input type="number" step="0.01" name="auto_factor" value={settings.auto_factor} onChange={handleChange} />
              </div>
              <div>
                <label>MTGrade Factor</label>
                <input type="number" step="0.01" name="mtgrade_factor" value={settings.mtgrade_factor} onChange={handleChange} />
              </div>
              <div>
                <label>EXGrade Factor</label>
                <input type="number" step="0.01" name="exgrade_factor" value={settings.exgrade_factor} onChange={handleChange} />
              </div>
              <div>
                <label>VGGrade Factor</label>
                <input type="number" step="0.01" name="vggrade_factor" value={settings.vggrade_factor} onChange={handleChange} />
              </div>
              <div>
                <label>GDGrade Factor</label>
                <input type="number" step="0.01" name="gdgrade_factor" value={settings.gdgrade_factor} onChange={handleChange} />
              </div>
              <div>
                <label>FRGrade Factor</label>
                <input type="number" step="0.01" name="frgrade_factor" value={settings.frgrade_factor} onChange={handleChange} />
              </div>
              <div>
                <label>PRGrade Factor</label>
                <input type="number" step="0.01" name="prgrade_factor" value={settings.prgrade_factor} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* 💰 Apply Valuation Button */}
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              onClick={async () => {
                if (!window.confirm("Recalculate valuation for ALL cards now?")) return;
                try {
                  const res = await api.post("/cards/revalue-all");
                  setModalMessage(res.data.message || `💰 Revalued ${res.data.updated} cards.`);
                  setShowModal(true);
                } catch (err) {
                  console.error(err);
                  setModalMessage("❌ Error applying valuation. See console for details.");
                  setShowModal(true);
                }
              }}
              className="val-btn">
              💰 Apply Global Valuation 💰
            </button>
          </div>

          {/* Era Settings
          <div className="card-section">
            <h3>Era Settings</h3>
            <label>Vintage Era Year</label>
            <input type="number" name="vintage_era_year" value={settings.vintage_era_year} onChange={handleChange} />

            <label>Modern Era Year</label>
            <input type="number" name="modern_era_year" value={settings.modern_era_year} onChange={handleChange} />

            <label>Vintage Era Factor</label>
            <input type="number" step="0.01" name="vintage_era_factor" value={settings.vintage_era_factor} onChange={handleChange} />

            <label>Modern Era Factor</label>
            <input type="number" step="0.01" name="modern_era_factor" value={settings.modern_era_factor} onChange={handleChange} />
          </div>
          */}

          <button type="submit">Save Settings</button>
        </form>

        {/* Player Dictionary */}
        <div className="card-section" style={{ marginTop: "1.5rem" }}>
          <h3>Player Dictionary</h3>
          <p>Total entries: <strong>{dictCount !== null ? dictCount : "Loading..."}</strong></p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="nav-btn" onClick={() => navigate("/dictionary")}>📖 View / Edit</button>
            <button className="nav-btn" onClick={() => navigate("/dictionary/import")}>📥 Import CSV</button>
            <button className="nav-btn" onClick={() => navigate("/dictionary/add")}>➕ Add Entry</button>
          </div>
        </div>
        

        {/* Data Management */}
        <div className="card-section" style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>Data Management</h3>

          {/* Extract */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
              Extract Card Data
              <InfoIcon id="extract" text="Download your card data in CSV, TSV, or JSON format for use in other tools" />
            </div>
            <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>
              Card data only — open in Excel, Google Sheets, or any tool
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "0.75rem" }}>
              {["csv", "tsv", "json"].map(fmt => (
                <label key={fmt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={e => setExportFormat(e.target.value)}
                  />
                  {fmt.toUpperCase()}
                </label>
              ))}
            </div>
            <button
              className="nav-btn"
              onClick={handleExport}
              disabled={dmLoading !== null}
              style={{ opacity: dmLoading !== null ? 0.65 : 1 }}
            >
              {dmLoading === "export" ? "Downloading..." : "Download"}
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 1.5rem 0" }} />

          {/* Backup */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
              Full Backup
              <InfoIcon id="backup" text="Download cards + settings as a JSON file you can restore from later" />
            </div>
            <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>
              Cards + settings — use this to restore your collection later
            </p>
            <button
              className="nav-btn"
              onClick={handleBackup}
              disabled={dmLoading !== null}
              style={{ opacity: dmLoading !== null ? 0.65 : 1 }}
            >
              {dmLoading === "backup" ? "Downloading..." : "Download Backup"}
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 1.5rem 0" }} />

          {/* Restore */}
          <div>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
              Restore from Backup
              <InfoIcon id="restore" text="Upload a backup file to replace your current collection" />
            </div>
            <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>
              Replaces all current cards with data from a backup file
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <input
                type="file"
                accept=".json"
                onChange={e => { setRestoreFile(e.target.files[0]); setRestoreMsg(""); setRestoreError(""); }}
              />
              <button
                className="nav-btn"
                onClick={handleRestore}
                disabled={!restoreFile || dmLoading !== null}
                style={{ background: "#dc3545", opacity: (!restoreFile || dmLoading !== null) ? 0.65 : 1 }}
              >
                {dmLoading === "restore" ? "Restoring..." : "Restore"}
              </button>
            </div>
            {restoreMsg && <p style={{ color: "green", marginTop: "0.75rem" }}>{restoreMsg}</p>}
            {restoreError && <p style={{ color: "red", marginTop: "0.75rem" }}>{restoreError}</p>}
          </div>
        </div>

        {showModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#f9f9f9",
                borderRadius: "12px",
                padding: "1.5rem 2rem",
                width: "320px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                textAlign: "center",
              }}
            >
              <h3 style={{ marginBottom: "0.75rem", color: "#333" }}>Valuation Complete</h3>
              <p style={{ color: "#444", marginBottom: "1.5rem" }}>{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.4rem 1rem",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
