import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ChipsInput from "../components/ChipsInput";

export default function Admin() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get("http://host.docker.internal:8000/settings/")
      .then(res => setSettings(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.put("http://host.docker.internal:8000/settings/", settings)
      .then(res => {
        setSettings(res.data);
        alert("Settings updated!");
      })
      .catch(err => console.error(err));
  };

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="container">
      {/* Centered Back to Home link */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
      </div>
      
      <h2 className="page-header">Admin Settings</h2>

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
            type="number"
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

        {/* Era Settings */}
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

        <Link className="nav-btn" to="/import-cards">📂 Import Cards</Link>

        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
}
