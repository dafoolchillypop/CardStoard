import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

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

  const handleListChange = (name, value) => {
    setSettings({ ...settings, [name]: value.split(",").map(v => v.trim()) });
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
      <Link className="nav-btn" to="/">Back to Home</Link>
      <h2>Admin Settings</h2>
      <form onSubmit={handleSubmit}>
        <label>App Name</label>
        <input name="app_name" value={settings.app_name} onChange={handleChange} />

        <label>Card Makes (comma-separated)</label>
        <input
          name="card_makes"
          value={settings.card_makes.join(", ")}
          onChange={(e) => handleListChange("card_makes", e.target.value)}
        />

        <label>Card Grades (comma-separated numbers)</label>
        <input
          name="card_grades"
          value={settings.card_grades.join(", ")}
          onChange={(e) => handleListChange("card_grades", e.target.value)}
        />

        <label>Rookie Factor</label>
        <input type="number" step="0.01" name="rookie_factor" value={settings.rookie_factor} onChange={handleChange} />

        <label>Auto Factor</label>
        <input type="number" step="0.01" name="auto_factor" value={settings.auto_factor} onChange={handleChange} />

        <label>MTGrade Factor</label>
        <input type="number" step="0.01" name="mtgrade_factor" value={settings.mtgrade_factor} onChange={handleChange} />

        <label>EXGrade Factor</label>
        <input type="number" step="0.01" name="exgrade_factor" value={settings.exgrade_factor} onChange={handleChange} />

        <label>VGGrade Factor</label>
        <input type="number" step="0.01" name="vggrade_factor" value={settings.vggrade_factor} onChange={handleChange} />

        <label>GDGrade Factor</label>
        <input type="number" step="0.01" name="gdgrade_factor" value={settings.gdgrade_factor} onChange={handleChange} />

        <label>FRGrade Factor</label>
        <input type="number" step="0.01" name="frgrade_factor" value={settings.frgrade_factor} onChange={handleChange} />

        <label>PRGrade Factor</label>
        <input type="number" step="0.01" name="prgrade_factor" value={settings.prgrade_factor} onChange={handleChange} />

        <label>Vintage Era Year</label>
        <input type="number" name="vintage_era_year" value={settings.vintage_era_year} onChange={handleChange} />

        <label>Modern Era Year</label>
        <input type="number" name="modern_era_year" value={settings.modern_era_year} onChange={handleChange} />

        <label>Vintage Era Factor</label>
        <input type="number" step="0.01" name="vintage_era_factor" value={settings.vintage_era_factor} onChange={handleChange} />

        <label>Modern Era Factor</label>
        <input type="number" step="0.01" name="modern_era_factor" value={settings.modern_era_factor} onChange={handleChange} />

        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
}
