import React, { useEffect, useState } from "react";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { Link } from "react-router-dom";
import ChipsInput from "../components/ChipsInput";
import "./Admin.css";

export default function Admin() {
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

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

  const handleToggle = async () => {
    try {
      const updated = { ...settings, enable_smart_fill: !settings.enable_smart_fill };
      const res = await api.put("/settings/", updated);
      setSettings(res.data);
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

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
              onChange={handleToggle}
            />
            <div className="smartfill-label">Smart Fill</div>
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
