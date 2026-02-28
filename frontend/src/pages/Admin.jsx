import React, { useEffect, useRef, useState } from "react";
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
  const [saveStatus, setSaveStatus] = useState("");
  const debounceRef = useRef(null);

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
  
  const debouncedSave = (updatedSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await api.put("/settings/", updatedSettings);
        setSettings(res.data);
        window.dispatchEvent(new Event("settings-changed"));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (err) {
        console.error(err);
        setSaveStatus("error");
      }
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...settings, [name]: value };
    setSettings(updated);
    debouncedSave(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");
    try {
      const res = await api.put("/settings/", settings);
      setSettings(res.data);
      window.dispatchEvent(new Event("settings-changed"));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
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

        <div className="card-section" style={{ marginBottom: "1rem" }}>
          <h3>Features</h3>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                name="smart"
                checked={settings.enable_smart_fill}
                onChange={() => handleToggle("enable_smart_fill")}
                style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }}
              />
              <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                Smart Fill
                <InfoIcon id="smartfill" text="Auto-populates card number and rookie flag when adding cards, using the Player Dictionary." />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                name="chatbot"
                checked={settings.chatbot_enabled ?? false}
                onChange={() => handleToggle("chatbot_enabled")}
                style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }}
              />
              <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                Collection Assistant (Chatbot)
                <InfoIcon id="chatbot" text="Enables the AI-powered chat assistant (💬) in the header. Requires an Anthropic API key to be configured." />
              </div>
            </div>
          </div>
        </div>

         <form className="settings-form" onSubmit={handleSubmit}>
          {/* General Settings */}
          <div className="card-section">
            <h3>General Settings <InfoIcon id="generalsettings" text="Configure the list of card brands and grades available when adding cards." /></h3>
            <ChipsInput
              label="Card Makes"
              values={settings.card_makes}
              setValues={(vals) => {
                const updated = { ...settings, card_makes: vals };
                setSettings(updated);
                debouncedSave(updated);
              }}
            />

            <div style={{ marginTop: "1rem" }}>
              <label style={{ fontWeight: 750, color: "#333", display: "block", marginBottom: "0.4rem", textAlign: "center" }}>
                Card Grades
                <InfoIcon id="cardgrades" text="Fixed by the CardStoard valuation formula — not user-configurable." />
              </label>
              <div style={{ display: "flex", flexWrap: "nowrap", gap: "0.4rem", justifyContent: "center" }}>
                {["3.0 MT", "1.5 NMMT", "1.0 EXMT", "0.8 VGEX", "0.4 GD", "0.2 PR"].map(g => (
                  <span key={g} style={{
                    background: "#f0f4f8", border: "1px solid #dce3ea",
                    borderRadius: "20px", padding: "0.25rem 0.75rem",
                    fontSize: "0.85rem", color: "#555",
                  }}>{g}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Row Colors */}
          <div className="card-section">
            <h3>Row Colors <InfoIcon id="rowcolors" text="Background colors applied to rows on the My Cards page based on card condition." /></h3>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "nowrap", margin: "0.5rem 0" }}>
              {[
                { label: "Rookie", name: "row_color_rookie" },
                { label: "Grade 3 (MT)", name: "row_color_grade3" },
                { label: "Rookie + Grade 3", name: "row_color_rookie_grade3" },
              ].map(({ label, name }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>{label}</label>
                  <input
                    type="color"
                    name={name}
                    value={settings[name] || "#ffffff"}
                    onChange={handleChange}
                    style={{ width: "52px", height: "36px", padding: "2px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="nav-btn"
                onClick={() => {
                  const defaults = {
                    ...settings,
                    row_color_rookie: "#fff3c4",
                    row_color_grade3: "#e8dcff",
                    row_color_rookie_grade3: "#b8d8f7",
                  };
                  setSettings(defaults);
                  debouncedSave(defaults);
                }}
              >
                Restore Default Colors
              </button>
            </div>
          </div>

          {/* Factor Settings */}
          <div className="card-section">
            <h3>Factor Settings <InfoIcon id="factorsettings" text="Multipliers applied to book value when calculating card value. Grade factors reflect condition; Rookie factor boosts rookie card value." /></h3>
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
            <InfoIcon id="revalue" text="Recalculates the estimated value for every card in your collection using current factor settings." />
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

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "center" }}>
            <button type="submit">Save Now</button>
            {saveStatus === "saving" && <span style={{ fontSize: "0.85rem", color: "#888" }}>Saving...</span>}
            {saveStatus === "saved"  && <span style={{ fontSize: "0.85rem", color: "#28a745" }}>✓ Saved</span>}
            {saveStatus === "error"  && <span style={{ fontSize: "0.85rem", color: "#dc3545" }}>⚠ Error saving</span>}
          </div>
        </form>

        {/* Player Dictionary */}
        <div className="card-section" style={{ marginTop: "1rem", textAlign: "center" }}>
          <h3>Player Dictionary <InfoIcon id="dictionary" text="A searchable database of players, brands, years, and card numbers used by Smart Fill and collection highlights." /></h3>
          <p>Total entries: <strong>{dictCount !== null ? dictCount : "Loading..."}</strong></p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
            <button className="nav-btn" onClick={() => navigate("/dictionary")}>📖 View / Edit</button>
            <button className="nav-btn" onClick={() => navigate("/dictionary/import")}>📥 Import CSV</button>
            <button className="nav-btn" onClick={() => navigate("/dictionary/add")}>➕ Add Entry</button>
          </div>
        </div>
        

        {/* Card Import */}
        <div className="card-section" style={{ marginTop: "1rem", textAlign: "center" }}>
          <h3 style={{ marginBottom: "1rem" }}>
            Card Import
            <InfoIcon id="cardimport" text="Bulk import cards from a CSV file. See the Import Cards page for template and formatting guide." />
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>
            Bulk import cards from a CSV file
          </p>
          <button className="nav-btn" onClick={() => navigate("/import-cards")}>📥 Import Cards</button>
        </div>

        {/* Data Management */}
        <div className="card-section" style={{ marginTop: "1rem", textAlign: "center" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>Data Management <InfoIcon id="datamanagement" text="Tools for extracting, backing up, and restoring your collection data." /></h3>

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
