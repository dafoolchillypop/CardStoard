// src/pages/SetBinderDetail.jsx — authenticated detail page for Sets/Binders
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";
import { useLabelLoader } from "../components/GenericItemLabel";

const TYPE_COLORS = { factory: "#1976d2", collated: "#d97706", binder: "#16a34a" };
const TYPE_LABELS = { factory: "Factory", collated: "Collated", binder: "Binder" };

const fmtDollar = (n) => `$${Math.round(Number(n || 0)).toLocaleString()}`;

export default function SetBinderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setIds = location.state?.setIds ?? null;
  const currentIndex = setIds ? setIds.indexOf(Number(id)) : -1;
  const prevId = currentIndex > 0 ? setIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < setIds.length - 1 ? setIds[currentIndex + 1] : null;

  const [record, setRecord] = useState(null);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const { labelData, setLabelData, labelLoading, handlePrintLabel } = useLabelLoader("boxes", id);

  useEffect(() => {
    api.get(`/boxes/${id}`)
      .then((res) => {
        setRecord(res.data);
        setNotes(res.data.notes || "");
      })
      .catch((err) => console.error("Error fetching set:", err));
  }, [id]);

  const saveNotes = () => {
    setNotesSaving(true);
    api.patch(`/boxes/${id}`, { notes })
      .catch((err) => console.error("Notes save error:", err))
      .finally(() => setNotesSaving(false));
  };

  if (!record) return <><AppHeader /><p style={{ textAlign: "center", marginTop: "3rem" }}>Loading...</p></>;

  const labelId = `CS-ST-${String(record.id).padStart(6, "0")}`;
  const qty = record.quantity ?? 1;
  const value = record.value ?? null;
  const total = value != null ? qty * value : null;

  const addedAt = record.created_at
    ? new Date(record.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";
  const updatedAt = record.updated_at
    ? new Date(record.updated_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <AppHeader />
      <LabelPreviewModal
        labelData={labelData}
        onPrint={() => { window.open(`/set-label/${id}`, "_blank"); setLabelData(null); }}
        onClose={() => setLabelData(null)}
      />
      <div style={{ textAlign: "center", padding: "0 1rem" }}>

        {/* Header */}
        <h2 style={{ margin: "0.75rem 0 0.25rem" }}>
          {record.brand} {record.year}
          {record.name && <span style={{ fontWeight: 400 }}> · {record.name}</span>}
        </h2>

        {/* ID + type + timestamps */}
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0.5rem" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-secondary)" }}>
            {labelId}
          </span>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          <span
            style={{
              display: "inline-block",
              background: TYPE_COLORS[record.set_type] || "#555",
              color: "#fff",
              borderRadius: 4,
              padding: "1px 7px",
              fontSize: "0.8rem",
            }}
          >
            {TYPE_LABELS[record.set_type] || record.set_type}
          </span>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          <span>Updated {updatedAt}</span>
        </div>

        {/* Stats table */}
        <div style={{ maxWidth: 360, margin: "1rem auto", textAlign: "left" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <tbody>
              {[
                ["Quantity", qty],
                ["Value",    value != null ? fmtDollar(value) : "—"],
                ["Total",    total != null ? fmtDollar(total) : "—"],
                ["Added",    addedAt],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ fontWeight: 600, padding: "5px 12px 5px 0", color: "var(--text-secondary)", width: 80 }}>
                    {label}
                  </td>
                  <td style={{ padding: "5px 0" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div style={{ maxWidth: 500, margin: "1.25rem auto 0", textAlign: "left" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color, #ccc)",
              background: "var(--input-bg, #fff)",
              color: "#111",
              fontSize: "0.95rem",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder="Add any notes about this set or binder..."
          />
          <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
            <button className="nav-btn" onClick={saveNotes} disabled={notesSaving}>
              {notesSaving ? "Saving…" : "Save Notes"}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button
            className="nav-btn"
            onClick={handlePrintLabel}
            disabled={labelLoading}
          >
            {labelLoading ? "Loading…" : "🖨️ Print Label"}
          </button>
          <Link to="/boxes" className="nav-btn secondary">⬅ Back to List</Link>
        </div>

        {/* Prev / Next navigation */}
        {setIds && (
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
            <button
              className="nav-btn secondary"
              onClick={() => prevId && navigate(`/set-detail/${prevId}`, { state: { setIds } })}
              disabled={!prevId}
              style={{ opacity: prevId ? 1 : 0.4, cursor: prevId ? "pointer" : "not-allowed" }}
            >← Previous Set</button>
            <button
              className="nav-btn secondary"
              onClick={() => nextId && navigate(`/set-detail/${nextId}`, { state: { setIds } })}
              disabled={!nextId}
              style={{ opacity: nextId ? 1 : 0.4, cursor: nextId ? "pointer" : "not-allowed" }}
            >Next Set →</button>
          </div>
        )}

      </div>
    </>
  );
}
