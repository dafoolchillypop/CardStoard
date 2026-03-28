// src/pages/SetsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

export default function SetsPage() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/sets/"),
      api.get("/settings/"),
    ])
      .then(([setsRes, settingsRes]) => {
        setSets(setsRes.data);
        setSettings(settingsRes.data);
      })
      .catch(err => console.error("Error fetching sets:", err))
      .finally(() => setLoading(false));
  }, []);

  const visibleSets = settings?.visible_set_ids
    ? sets.filter(s => settings.visible_set_ids.includes(s.id))
    : sets;

  return (
    <>
      <AppHeader />
      <div className="list-container">
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 1rem" }}>
          Builds
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <div className="cs-spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.95rem" }}>Loading sets…</p>
          </div>
        ) : sets.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No sets available yet.</p>
            <button className="nav-btn" onClick={() => navigate("/sets/import")}>
              📥 Import Set CSV
            </button>
          </div>
        ) : visibleSets.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>No sets selected.</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Configure visible sets in <Link to="/admin" style={{ color: "var(--accent-blue)" }}>Admin</Link>.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", padding: "0 1rem" }}>
            {visibleSets.map(s => (
              <div key={s.id} className="card-section" style={{ padding: "1rem 1.25rem", cursor: "pointer" }}
                role="button" tabIndex={0}
                onClick={() => navigate(`/sets/${s.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/sets/${s.id}`); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{s.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <span className="badge badge-brand" style={{ marginRight: "0.4rem" }}>{s.brand}</span>
                      {s.year}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: s.in_collection_count > 0 ? "#2e7d32" : "var(--text-muted)" }}>
                      {s.in_collection_count}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>of {s.entry_count}</div>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ background: "var(--bg-muted)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      background: "#2e7d32",
                      width: s.entry_count > 0 ? `${(s.in_collection_count / s.entry_count) * 100}%` : "0%",
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                    {s.entry_count > 0
                      ? `${Math.round((s.in_collection_count / s.entry_count) * 100)}% complete`
                      : "No entries"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
