/**
 * pages/Admin.jsx
 * ----------------
 * Application settings hub — all per-user configuration in one place.
 *
 * Layout: pill tab bar (top) + accordion sections within each tab.
 *
 *   Settings   — Features, Nav Bar, General Settings, Row Colors (all open by default)
 *   Valuation  — Factor settings, Apply Global Valuation, Reset Book Value Timers (flat, short)
 *   Dictionary — Player Dictionary, Value Dictionary (both open by default)
 *   Data       — Card Sets, Card Import, Data Management (Card Sets open by default)
 *
 * Save behavior:
 *   - Most fields: debouncedSave() — 1500ms after last change → PUT /settings/
 *   - Toggles (dark_mode, chatbot, smart_fill): handleToggle() → immediate save
 *   - On save: dispatches "settings-changed" CustomEvent so AppHeader and AuthContext
 *     refresh their state without a page reload.
 */
import React, { useEffect, useRef, useState } from "react";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { Link, useNavigate } from "react-router-dom";
import ChipsInput from "../components/ChipsInput";
import "./Admin.css";

const TABS = [
  { id: "settings",   label: "Settings"   },
  { id: "valuation",  label: "Valuation"  },
  { id: "dictionary", label: "Dictionary" },
  { id: "data",       label: "Data"       },
];

// Accordion section IDs per tab (Valuation is flat — no entry)
const TAB_SECTIONS = {
  settings:   ["s-features", "s-navbar", "s-general", "s-rowcolors"],
  dictionary: ["d-player", "d-value"],
  data:       ["data-sets", "data-import", "data-mgmt"],
};

// All sections collapsed by default
const DEFAULT_OPEN = new Set();

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("settings");
  const [openSections, setOpenSections] = useState(new Set(DEFAULT_OPEN));
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
  const debounceRef = useRef(null);
  const [allSets, setAllSets] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [valuesStats, setValuesStats] = useState(null);
  const [seedMsg, setSeedMsg] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [dedupStats, setDedupStats] = useState(null);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupMsg, setDedupMsg] = useState("");
  const [dedupConfirming, setDedupConfirming] = useState(false);
  const [invalidStats, setInvalidStats] = useState(null);
  const [invalidLoading, setInvalidLoading] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState("");
  const [invalidConfirming, setInvalidConfirming] = useState(false);

  const toggleSection = (id) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandCurrentTab = () => {
    const sections = TAB_SECTIONS[activeTab] || [];
    setOpenSections(prev => new Set([...prev, ...sections]));
  };

  const collapseCurrentTab = () => {
    const sections = new Set(TAB_SECTIONS[activeTab] || []);
    setOpenSections(prev => new Set([...prev].filter(s => !sections.has(s))));
  };

  const fetchValuesStats = () => {
    api.get("/dictionary/values-stats")
      .then(res => setValuesStats(res.data))
      .catch(err => console.error("Error fetching values stats:", err));
  };

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

    api.get("/sets/")
      .then(res => setAllSets(res.data))
      .catch(err => console.error("Error fetching sets:", err));

    fetchValuesStats();
  }, []);

  const handleSeedFromCards = async () => {
    setSeedLoading(true);
    setSeedMsg("");
    try {
      const res = await api.post("/dictionary/seed-values-from-cards");
      setSeedMsg(res.data.message);
      fetchValuesStats();
    } catch (err) {
      setSeedMsg("Seed failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCheckDuplicates = async () => {
    setDedupLoading(true);
    setDedupMsg("");
    setDedupStats(null);
    setDedupConfirming(false);
    try {
      const res = await api.get("/dictionary/duplicate-stats");
      setDedupStats(res.data);
    } catch (err) {
      setDedupMsg("Check failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setDedupLoading(false);
    }
  };

  const handleDeduplicate = async () => {
    setDedupLoading(true);
    setDedupMsg("");
    try {
      const res = await api.post("/dictionary/deduplicate");
      setDedupMsg(res.data.message);
      setDedupStats(null);
      setDedupConfirming(false);
      api.get("/dictionary/count").then(r => setDictCount(r.data.count)).catch(() => {});
    } catch (err) {
      setDedupMsg("Dedup failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setDedupLoading(false);
    }
  };

  const handleCheckInvalid = async () => {
    setInvalidLoading(true);
    setInvalidMsg("");
    setInvalidStats(null);
    setInvalidConfirming(false);
    try {
      const res = await api.get("/dictionary/invalid-stats");
      setInvalidStats(res.data);
    } catch (err) {
      setInvalidMsg("Check failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setInvalidLoading(false);
    }
  };

  const handlePurgeInvalid = async () => {
    setInvalidLoading(true);
    setInvalidMsg("");
    try {
      const res = await api.post("/dictionary/purge-invalid");
      setInvalidMsg(res.data.message);
      setInvalidStats(null);
      setInvalidConfirming(false);
      api.get("/dictionary/count").then(r => setDictCount(r.data.count)).catch(() => {});
    } catch (err) {
      setInvalidMsg("Purge failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setInvalidLoading(false);
    }
  };

  const debouncedSave = (updatedSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.put("/settings/", updatedSettings);
        setSettings(res.data);
        window.dispatchEvent(new Event("settings-changed"));
      } catch (err) {
        console.error(err);
      }
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...settings, [name]: value };
    setSettings(updated);
    debouncedSave(updated);
  };

  const handleToggle = async (field) => {
    try {
      const updated = { ...settings, [field]: !settings[field] };
      const res = await api.put("/settings/", updated);
      setSettings(res.data);
      if (field === "dark_mode") {
        document.documentElement.setAttribute("data-theme", res.data.dark_mode ? "dark" : "light");
      }
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
    <span style={{ position: "relative", display: "inline-block", marginLeft: "0.4rem" }} onClick={e => e.stopPropagation()}>
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

  // Accordion section header — clickable h3 with animated chevron
  const SectionHeader = ({ id, children }) => (
    <h3
      onClick={() => toggleSection(id)}
      style={{
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 0,
        userSelect: "none",
      }}
    >
      <span>{children}</span>
      <span style={{
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        display: "inline-block",
        transform: openSections.has(id) ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
        marginLeft: "0.5rem",
      }}>▼</span>
    </h3>
  );

  // --- Set visibility helpers ---
  const setsByBrand = allSets.reduce((acc, s) => {
    (acc[s.brand] = acc[s.brand] || []).push(s);
    return acc;
  }, {});
  const brands = Object.keys(setsByBrand).sort((a, b) => a.localeCompare(b));

  const isSetVisible = (id) =>
    !settings || settings.visible_set_ids === null || (settings.visible_set_ids || []).includes(id);

  const visibleCountForBrand = (brand) => {
    if (!settings || settings.visible_set_ids === null) return setsByBrand[brand]?.length ?? 0;
    return (setsByBrand[brand] ?? []).filter(s => (settings.visible_set_ids || []).includes(s.id)).length;
  };

  const toggleYear = (setId) => {
    const allIds = allSets.map(s => s.id);
    const currentIds = settings.visible_set_ids ?? allIds;
    const next = currentIds.includes(setId)
      ? currentIds.filter(x => x !== setId)
      : [...currentIds, setId];
    const value = next.length === allIds.length ? null : next;
    setSettings(prev => ({ ...prev, visible_set_ids: value }));
    debouncedSave({ visible_set_ids: value });
  };

  const selectAllForBrand = (brand) => {
    const brandIds = setsByBrand[brand].map(s => s.id);
    const allIds = allSets.map(s => s.id);
    const currentIds = settings.visible_set_ids ?? allIds;
    const next = [...new Set([...currentIds, ...brandIds])];
    const value = next.length === allIds.length ? null : next;
    setSettings(prev => ({ ...prev, visible_set_ids: value }));
    debouncedSave({ visible_set_ids: value });
  };

  const clearAllForBrand = (brand) => {
    const brandIds = new Set(setsByBrand[brand].map(s => s.id));
    const allIds = allSets.map(s => s.id);
    const currentIds = settings.visible_set_ids ?? allIds;
    const next = currentIds.filter(id => !brandIds.has(id));
    setSettings(prev => ({ ...prev, visible_set_ids: next }));
    debouncedSave({ visible_set_ids: next });
  };

  if (!settings) return (
    <>
      <AppHeader />
      <div className="container" style={{ textAlign: "center", marginTop: "3rem" }}>
        <div className="cs-spinner" />
        <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.95rem" }}>Loading settings…</p>
      </div>
    </>
  );

  return (
    <>
      <AppHeader />
      <div className="container">
        <h2 className="page-header">Admin Settings</h2>

        {/* ── Tab bar ── */}
        <div className="admin-tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-tab-btn${activeTab === tab.id ? " active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expand / Collapse All (only for tabs with accordion sections) */}
        {TAB_SECTIONS[activeTab] && (
          <div style={{ textAlign: "right", marginBottom: "0.5rem" }}>
            <button type="button" onClick={expandCurrentTab}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", padding: "0 0.4rem" }}>
              Expand All
            </button>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>|</span>
            <button type="button" onClick={collapseCurrentTab}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", padding: "0 0.4rem" }}>
              Collapse All
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: Settings  (4 accordion sections)
        ══════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <>
            {/* Features */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="s-features">Features <InfoIcon id="features" text="Toggle optional app features on or off. Changes take effect immediately." /></SectionHeader>
              {openSections.has("s-features") && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={settings.enable_smart_fill} onChange={() => handleToggle("enable_smart_fill")}
                      style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                      Smart Fill
                      <InfoIcon id="smartfill" text="Auto-populates card number and rookie flag when adding cards, using the Player Dictionary." />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={settings.chatbot_enabled ?? false} onChange={() => handleToggle("chatbot_enabled")}
                      style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                      Collection Assistant (Chatbot)
                      <InfoIcon id="chatbot" text="Enables the AI-powered chat assistant (💬) in the header. Requires an Anthropic API key to be configured." />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={settings.enable_image_ai ?? false} onChange={() => handleToggle("enable_image_ai")}
                      style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                      Image AI (Scan)
                      <InfoIcon id="imageai" text="Enable AI-powered card identification from photos and QR code scanning. Uses Claude Vision API — requires ANTHROPIC_API_KEY." />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "0.5rem" }}>
                    <input type="checkbox" checked={settings.dark_mode ?? false} onChange={() => handleToggle("dark_mode")}
                      style={{ width: "16px", height: "16px", margin: 0, flexShrink: 0, cursor: "pointer" }} />
                    <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
                      Dark Mode
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nav Bar */}
            {(() => {
              const ALL_NAV = [
                { key: "cards",        label: "📇 Cards" },
                { key: "balls",        label: "⚾ Balls" },
                { key: "builds",       label: "🏗️ Builds" },
                { key: "sets_binders", label: "📓 Sets/Binders" },
                { key: "wax",          label: "📦 Wax" },
                { key: "packs",        label: "🧧 Packs" },
                { key: "analytics",    label: "📊 Analytics" },
              ];
              const current = settings.nav_items ?? ALL_NAV.map(n => n.key);
              const toggle = (key) => {
                const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
                const value = next.length === ALL_NAV.length ? null : next;
                setSettings(prev => ({ ...prev, nav_items: value }));
                debouncedSave({ nav_items: value });
              };
              return (
                <div className="card-section" style={{ marginBottom: "1rem" }}>
                  <SectionHeader id="s-navbar">
                    Nav Bar <InfoIcon id="navbar" text="Choose which buttons appear in the navigation bar. Changes take effect immediately." />
                  </SectionHeader>
                  {openSections.has("s-navbar") && (
                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "center" }}>
                      {[ALL_NAV.slice(0, 4), ALL_NAV.slice(4)].map((row, ri) => (
                        <div key={ri} style={{ display: "flex", gap: "1.5rem" }}>
                          {row.map(({ key, label }) => (
                            <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: "bold", cursor: "pointer" }}>
                              <input type="checkbox" checked={current.includes(key)} onChange={() => toggle(key)}
                                style={{ width: "16px", height: "16px", margin: 0, cursor: "pointer" }} />
                              {label}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* General Settings */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="s-general">
                General Settings <InfoIcon id="generalsettings" text="Configure the list of card brands and grades available when adding cards." />
              </SectionHeader>
              {openSections.has("s-general") && (
                <div style={{ marginTop: "0.75rem" }}>
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
                    <label style={{ fontWeight: 750, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem", textAlign: "center" }}>
                      Card Grades
                      <InfoIcon id="cardgrades" text="Fixed by the CardStoard valuation formula — not user-configurable." />
                    </label>
                    <div style={{ display: "flex", flexWrap: "nowrap", gap: "0.4rem", justifyContent: "center" }}>
                      {["3.0 MT", "1.5 NMMT", "1.0 EXMT", "0.8 VGEX", "0.4 GD", "0.2 PR"].map(g => (
                        <span key={g} style={{
                          background: "var(--bg-muted)", border: "1px solid var(--border)",
                          borderRadius: "20px", padding: "0.25rem 0.75rem",
                          fontSize: "0.85rem", color: "var(--text-muted)",
                        }}>{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row Colors */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="s-rowcolors">
                Row Colors <InfoIcon id="rowcolors" text="Background colors applied to rows on the My Cards page based on card condition." />
              </SectionHeader>
              {openSections.has("s-rowcolors") && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "nowrap", margin: "0.5rem 0" }}>
                    {[
                      { label: "Rookie", name: "row_color_rookie" },
                      { label: "Grade 3 (MT)", name: "row_color_grade3" },
                      { label: "Rookie + Grade 3", name: "row_color_rookie_grade3" },
                    ].map(({ label, name }) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>{label}</label>
                        <input type="color" name={name} value={settings[name] || "#ffffff"} onChange={handleChange}
                          style={{ width: "52px", height: "36px", padding: "2px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                    <button type="button" className="nav-btn" onClick={() => {
                      const defaults = { ...settings, row_color_rookie: "#fff3c4", row_color_grade3: "#e8dcff", row_color_rookie_grade3: "#b8d8f7" };
                      setSettings(defaults);
                      debouncedSave(defaults);
                    }}>
                      Restore Default Colors
                    </button>
                  </div>
                </div>
              )}
            </div>

          </>
        )}

        {/* ══════════════════════════════════════════
            TAB: Valuation  (flat — short enough)
        ══════════════════════════════════════════ */}
        {activeTab === "valuation" && (
          <>
            <div className="card-section">
              <h3>Factor Settings <InfoIcon id="factorsettings" text="Multipliers applied to book value when calculating card value. Grade factors reflect condition; Rookie factor boosts rookie card value." /></h3>
              <div className="factor-group">
                <div><label>Rookie Factor</label><input type="number" step="0.01" name="rookie_factor" value={settings.rookie_factor} onChange={handleChange} /></div>
                <div><label>Auto Factor</label><input type="number" step="0.01" name="auto_factor" value={settings.auto_factor} onChange={handleChange} /></div>
                <div><label>MTGrade Factor</label><input type="number" step="0.01" name="mtgrade_factor" value={settings.mtgrade_factor} onChange={handleChange} /></div>
                <div><label>EXGrade Factor</label><input type="number" step="0.01" name="exgrade_factor" value={settings.exgrade_factor} onChange={handleChange} /></div>
                <div><label>VGGrade Factor</label><input type="number" step="0.01" name="vggrade_factor" value={settings.vggrade_factor} onChange={handleChange} /></div>
                <div><label>GDGrade Factor</label><input type="number" step="0.01" name="gdgrade_factor" value={settings.gdgrade_factor} onChange={handleChange} /></div>
                <div><label>FRGrade Factor</label><input type="number" step="0.01" name="frgrade_factor" value={settings.frgrade_factor} onChange={handleChange} /></div>
                <div><label>PRGrade Factor</label><input type="number" step="0.01" name="prgrade_factor" value={settings.prgrade_factor} onChange={handleChange} /></div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <button onClick={async () => {
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
              }} className="val-btn">
                💰 Apply Global Valuation 💰
              </button>
              <InfoIcon id="revalue" text="Recalculates the estimated value for every card in your collection using current factor settings." />
            </div>

            <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
              <button type="button" onClick={async () => {
                if (!window.confirm("Reset the book freshness timer to today for all cards that have book values entered?")) return;
                try {
                  const res = await api.post("/cards/refresh-all-book-values");
                  setModalMessage(res.data.message || `↻ Reset freshness for ${res.data.updated} cards.`);
                  setShowModal(true);
                } catch (err) {
                  console.error(err);
                  setModalMessage("❌ Error resetting freshness timers. See console for details.");
                  setShowModal(true);
                }
              }} className="val-btn" style={{ background: "#0891b2" }}>
                ⏱️ Reset Book Value Timers ⏱️
              </button>
              <InfoIcon id="refreshbook" text="Marks today as the book-value update date for every card that has book values entered. Use this to establish a baseline after a bulk review." />
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════
            TAB: Dictionary  (2 accordion sections)
        ══════════════════════════════════════════ */}
        {activeTab === "dictionary" && (
          <>
            {/* Player Dictionary */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="d-player">
                Player Dictionary <InfoIcon id="dictionary" text="A searchable database of players, brands, years, and card numbers used by Smart Fill and collection highlights." />
              </SectionHeader>
              {openSections.has("d-player") && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <p>Total entries: <strong>{dictCount !== null ? dictCount : "Loading..."}</strong></p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="nav-btn" onClick={() => navigate("/dictionary")}>📖 View / Edit</button>
                    <button className="nav-btn" onClick={() => navigate("/dictionary/import")}>📥 Import CSV</button>
                    <button className="nav-btn" onClick={() => navigate("/dictionary/add")}>➕ Add Entry</button>
                    <button className="nav-btn secondary" onClick={handleCheckDuplicates} disabled={dedupLoading}>
                      {dedupLoading ? "Checking…" : "🔍 Check Duplicates"}
                    </button>
                  </div>
                  {dedupStats !== null && (
                    <div style={{ marginTop: "0.75rem" }}>
                      {dedupStats.entries_to_remove === 0 ? (
                        <p style={{ color: "#1a7a1a", fontSize: "0.9rem", margin: 0 }}>No duplicates found — dictionary is clean.</p>
                      ) : (
                        <>
                          <p style={{ color: "#856404", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
                            Found <strong>{dedupStats.duplicate_groups}</strong> duplicate {dedupStats.duplicate_groups === 1 ? "group" : "groups"} —{" "}
                            <strong>{dedupStats.entries_to_remove}</strong> {dedupStats.entries_to_remove === 1 ? "entry" : "entries"} to remove.
                            The record with the most recent book values will be kept.
                          </p>
                          {!dedupConfirming ? (
                            <button className="nav-btn" style={{ background: "#dc3545", borderColor: "#dc3545" }} onClick={() => setDedupConfirming(true)}>
                              🗑️ Remove Duplicates
                            </button>
                          ) : (
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Are you sure?</span>
                              <button className="nav-btn" style={{ background: "#dc3545", borderColor: "#dc3545" }} onClick={handleDeduplicate} disabled={dedupLoading}>
                                {dedupLoading ? "Removing…" : "Yes, Remove"}
                              </button>
                              <button className="nav-btn secondary" onClick={() => setDedupConfirming(false)}>Cancel</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {dedupMsg && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: dedupMsg.startsWith("Dedup failed") || dedupMsg.startsWith("Check failed") ? "#dc3545" : "#1a7a1a" }}>
                      {dedupMsg}
                    </p>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "1rem", paddingTop: "0.75rem" }}>
                    <button className="nav-btn secondary" onClick={handleCheckInvalid} disabled={invalidLoading}>
                      {invalidLoading ? "Checking…" : "🚫 Check Invalid Entries"}
                    </button>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                      Finds entries with brand/year combos that couldn't exist (e.g. Score 1952, Upper Deck 1975).
                    </p>
                  </div>
                  {invalidStats !== null && (
                    <div style={{ marginTop: "0.75rem" }}>
                      {invalidStats.total === 0 ? (
                        <p style={{ color: "#1a7a1a", fontSize: "0.9rem", margin: 0 }}>No invalid entries found — dictionary is clean.</p>
                      ) : (
                        <>
                          <p style={{ color: "#856404", fontSize: "0.9rem", margin: "0 0 0.25rem" }}>
                            Found <strong>{invalidStats.total}</strong> invalid {invalidStats.total === 1 ? "entry" : "entries"}:
                            {Object.entries(invalidStats.by_brand).map(([b, n]) => ` ${b} (${n})`).join(",")}
                          </p>
                          {!invalidConfirming ? (
                            <button className="nav-btn" style={{ background: "#dc3545", borderColor: "#dc3545" }} onClick={() => setInvalidConfirming(true)}>
                              🗑️ Purge Invalid Entries
                            </button>
                          ) : (
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Are you sure?</span>
                              <button className="nav-btn" style={{ background: "#dc3545", borderColor: "#dc3545" }} onClick={handlePurgeInvalid} disabled={invalidLoading}>
                                {invalidLoading ? "Purging…" : "Yes, Purge"}
                              </button>
                              <button className="nav-btn secondary" onClick={() => setInvalidConfirming(false)}>Cancel</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {invalidMsg && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: invalidMsg.startsWith("Purge failed") || invalidMsg.startsWith("Check failed") ? "#dc3545" : "#1a7a1a" }}>
                      {invalidMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Value Dictionary */}
            <div className="card-section">
              <SectionHeader id="d-value">
                Value Dictionary <InfoIcon id="valuedictionary" text="Admin-maintained book values (High → Low) keyed on brand + year + card number. Smart Fill auto-populates these when adding cards." />
              </SectionHeader>
              {openSections.has("d-value") && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <p>
                    Entries with values: <strong>{valuesStats ? valuesStats.values_count : "Loading..."}</strong>
                    {valuesStats?.last_imported_at && (
                      <span style={{ marginLeft: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Last import: {new Date(valuesStats.last_imported_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="nav-btn" onClick={() => navigate("/dictionary/import-values")}>📥 Import Values CSV</button>
                    <button className="nav-btn" onClick={handleSeedFromCards} disabled={seedLoading}>
                      {seedLoading ? "Seeding..." : "🌱 Seed from My Cards"}
                    </button>
                  </div>
                  {seedMsg && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: seedMsg.startsWith("Seed failed") ? "#dc3545" : "#1a7a1a" }}>
                      {seedMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════
            TAB: Data  (3 accordion sections)
        ══════════════════════════════════════════ */}
        {activeTab === "data" && (
          <>
            {/* Card Sets */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="data-sets">Card Sets <InfoIcon id="cardsets" text="Control which set checklists appear in the Builds page. Import new sets or toggle visibility by brand and year." /></SectionHeader>
              {openSections.has("data-sets") && (
                <div style={{ marginTop: "0.75rem" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem", textAlign: "center" }}>
                    Import global set master lists. Users can then track completion card-by-card.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", justifyContent: "center" }}>
                    <button className="nav-btn" onClick={() => navigate("/sets")}>🏗️ View Builds</button>
                    <button className="nav-btn" onClick={() => navigate("/sets/import")}>📥 Import Set CSV</button>
                  </div>

                  {allSets.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-secondary)" }}>Visible Sets</span>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button type="button"
                            onClick={() => { setSettings(prev => ({ ...prev, visible_set_ids: null })); debouncedSave({ visible_set_ids: null }); }}
                            style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", color: "var(--text-secondary)" }}>
                            Select All</button>
                          <button type="button"
                            onClick={() => { setSettings(prev => ({ ...prev, visible_set_ids: [] })); debouncedSave({ visible_set_ids: [] }); }}
                            style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", color: "var(--text-secondary)" }}>
                            Deselect All</button>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Brand</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                        {brands.map(brand => {
                          const total = setsByBrand[brand].length;
                          const nVis = visibleCountForBrand(brand);
                          const isActive = activeBrand === brand;
                          const isDark = document.documentElement.getAttribute("data-theme") === "dark";
                          const countColor = nVis === 0 ? "#dc2626" : nVis === total ? "#16a34a" : "#f59e0b";
                          const bgColor = nVis === total ? (isDark ? "#052e16" : "#f0fdf4") : nVis === 0 ? "var(--bg-muted)" : "var(--bg-input)";
                          return (
                            <button key={brand} type="button" onClick={() => setActiveBrand(isActive ? null : brand)}
                              style={{
                                border: `2px solid ${isActive ? "#1976d2" : "var(--border)"}`,
                                borderRadius: 20, padding: "0.35rem 0.9rem",
                                background: bgColor, color: nVis === 0 ? "var(--text-muted)" : "var(--text-primary)",
                                cursor: "pointer", fontSize: "0.85rem", fontWeight: isActive ? 700 : 500, transition: "border-color 0.15s",
                              }}>
                              {brand}{" "}<span style={{ color: countColor, fontSize: "0.78rem" }}>{nVis}/{total}</span>
                            </button>
                          );
                        })}
                      </div>
                      {activeBrand && setsByBrand[activeBrand] && (
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Years — {activeBrand}</span>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button type="button" onClick={() => selectAllForBrand(activeBrand)}
                                style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", color: "var(--text-secondary)" }}>All</button>
                              <button type="button" onClick={() => clearAllForBrand(activeBrand)}
                                style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", color: "var(--text-secondary)" }}>None</button>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {setsByBrand[activeBrand].map(s => {
                              const vis = isSetVisible(s.id);
                              const isDark = document.documentElement.getAttribute("data-theme") === "dark";
                              return (
                                <button key={s.id} type="button" onClick={() => toggleYear(s.id)}
                                  style={{
                                    border: `2px solid ${vis ? "#16a34a" : "var(--border)"}`,
                                    borderRadius: 20, padding: "0.25rem 0.65rem",
                                    background: vis ? (isDark ? "#052e16" : "#f0fdf4") : "var(--bg-muted)",
                                    color: vis ? "#16a34a" : "var(--text-muted)",
                                    cursor: "pointer", fontSize: "0.85rem", fontWeight: vis ? 600 : 400, transition: "all 0.1s",
                                  }}>
                                  {s.year}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Import */}
            <div className="card-section" style={{ marginBottom: "1rem" }}>
              <SectionHeader id="data-import">
                Card Import <InfoIcon id="cardimport" text="Bulk import cards from a CSV file. See the Import Cards page for template and formatting guide." />
              </SectionHeader>
              {openSections.has("data-import") && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>Bulk import cards from a CSV file</p>
                  <button className="nav-btn" onClick={() => navigate("/import-cards")}>📥 Import Cards</button>
                </div>
              )}
            </div>

            {/* Data Management */}
            <div className="card-section">
              <SectionHeader id="data-mgmt">
                Data Management <InfoIcon id="datamanagement" text="Tools for extracting, backing up, and restoring your collection data." />
              </SectionHeader>
              {openSections.has("data-mgmt") && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  {/* Extract */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
                      Extract Card Data <InfoIcon id="extract" text="Download your card data in CSV, TSV, or JSON format for use in other tools" />
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>Card data only — open in Excel, Google Sheets, or any tool</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "0.75rem" }}>
                      {["csv", "tsv", "json"].map(fmt => (
                        <label key={fmt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                          <input type="radio" name="exportFormat" value={fmt} checked={exportFormat === fmt} onChange={e => setExportFormat(e.target.value)} />
                          {fmt.toUpperCase()}
                        </label>
                      ))}
                    </div>
                    <button className="nav-btn" onClick={handleExport} disabled={dmLoading !== null} style={{ opacity: dmLoading !== null ? 0.65 : 1 }}>
                      {dmLoading === "export" ? "Downloading..." : "Download"}
                    </button>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 1.5rem 0" }} />

                  {/* Backup */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
                      Full Backup <InfoIcon id="backup" text="Download cards + settings as a JSON file you can restore from later" />
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>Cards + settings — use this to restore your collection later</p>
                    <button className="nav-btn" onClick={handleBackup} disabled={dmLoading !== null} style={{ opacity: dmLoading !== null ? 0.65 : 1 }}>
                      {dmLoading === "backup" ? "Downloading..." : "Download Backup"}
                    </button>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 1.5rem 0" }} />

                  {/* Restore */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
                      Restore from Backup <InfoIcon id="restore" text="Upload a backup file to replace your current collection" />
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#777", marginBottom: "0.75rem" }}>Replaces all current cards with data from a backup file</p>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <input type="file" accept=".json" onChange={e => { setRestoreFile(e.target.files[0]); setRestoreMsg(""); setRestoreError(""); }} />
                      <button className="nav-btn" onClick={handleRestore} disabled={!restoreFile || dmLoading !== null}
                        style={{ background: "#dc3545", opacity: (!restoreFile || dmLoading !== null) ? 0.65 : 1 }}>
                        {dmLoading === "restore" ? "Restoring..." : "Restore"}
                      </button>
                    </div>
                    {restoreMsg && <p style={{ color: "green", marginTop: "0.75rem" }}>{restoreMsg}</p>}
                    {restoreError && <p style={{ color: "red", marginTop: "0.75rem" }}>{restoreError}</p>}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {showModal && (
          <div className="modal-overlay" role="button" tabIndex={0}
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
            onClick={() => setShowModal(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setShowModal(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
              style={{ background: "#f9f9f9", borderRadius: "12px", padding: "1.5rem 2rem", width: "320px", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", textAlign: "center" }}>
              <h3 style={{ marginBottom: "0.75rem", color: "#333" }}>Valuation Complete</h3>
              <p style={{ color: "#444", marginBottom: "1.5rem" }}>{modalMessage}</p>
              <button onClick={() => setShowModal(false)}
                style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer" }}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
