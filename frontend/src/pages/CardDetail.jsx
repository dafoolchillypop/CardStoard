// src/pages/CardDetail.jsx
/**
 * pages/CardDetail.jsx
 * ---------------------
 * Full detail view for a single card — auth required.
 *
 * Data loaded on mount (parallel):
 *   GET /cards/:id            — card fields + value + book values
 *   GET /settings/            — market factor display context
 *   GET /cards/:id/duplicate-count — shows how many duplicates exist
 *
 * Features:
 *   - Displays all card fields, computed value, market factor, book values
 *   - Value change indicator: if previous_value differs from current value,
 *     shows directional arrow and percent change (value_changed_at timestamp)
 *   - Book freshness: if book_values_updated_at is old (>90 days), shows warning
 *     with a "Mark current" button → POST /cards/:id/refresh-book-values
 *   - Editable notes: textarea → PUT /cards/:id on save
 *   - Label print: handlePrintLabel → GET /cards/:id/public → LabelPreviewModal
 *     → opens /card-label/:id in new tab for printing
 *   - Prev / Next navigation: reads cardIds array from router location.state
 *     (passed by ListCards), navigates to adjacent card in the sorted list
 *   - labelId: CS-CD-XXXXXX format (zero-padded card.id)
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";
import { useLabelLoader } from "../components/GenericItemLabel";
import { calcCardValue } from "../utils/cardUtils";

export default function CardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cardIds = location.state?.cardIds ?? null;
  const currentIndex = cardIds ? cardIds.indexOf(Number(id)) : -1;
  const prevId = currentIndex > 0 ? cardIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < cardIds.length - 1 ? cardIds[currentIndex + 1] : null;
  const [card, setCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const { labelData, setLabelData, labelLoading, handlePrintLabel } = useLabelLoader("cards", id);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(null);

  useEffect(() => {
    // Fetch card
    api.get(`/cards/${id}`)
      .then((res) => {
        setCard(res.data);
        setNotes(res.data.notes || "");
      })
      .catch((err) => console.error("Error fetching card:", err));

    // Fetch settings (for market factor/value calc)
    api.get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));

    // Fetch duplicate count
    api.get(`/cards/${id}/duplicate-count`)
      .then((res) => setDuplicateCount(res.data.duplicate_count))
      .catch((err) => console.error("Error fetching duplicate count:", err));
  }, [id]);

  const saveNotes = () => {
    setNotesSaving(true);
    api.put(`/cards/${id}`, { notes })
      .catch((err) => console.error("Notes save error:", err))
      .finally(() => setNotesSaving(false));
  };

  const handleRefreshBook = async () => {
    try {
      const res = await api.post(`/cards/${id}/refresh-book-values`);
      setCard(res.data);
    } catch (err) {
      console.error("Book refresh failed:", err);
    }
  };

  if (!card) return <p>Loading card...</p>;

  // Label ID — matches what's printed on the label
  const labelId = `CS-CD-${String(card.id).padStart(6, "0")}`;

  // Last updated — formatted
  const updatedAt = card.updated_at
    ? new Date(card.updated_at).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // Book freshness
  const bookFreshness = (() => {
    if (!card.book_values_updated_at) return { color: "#dc2626", label: "Book: never updated" };
    const d = (Date.now() - new Date(card.book_values_updated_at)) / (1000 * 60 * 60 * 24);
    if (d < 30) return { color: null, label: null };
    if (d < 90) return { color: "#f59e0b", label: "Book: aging" };
    return { color: "#dc2626", label: "Book: stale" };
  })();

  // ✅ Card value computation
  const { isRookie, gradeClass, cardValue, valueClass } = calcCardValue(card, settings);

  // ✅ Value change indicator — green ↑ or red ↓ if value changed in past 90 days
  const valueChangedDaysAgo = card.value_changed_at
    ? (Date.now() - new Date(card.value_changed_at)) / (1000 * 60 * 60 * 24)
    : null;
  const recentValueChange = valueChangedDaysAgo !== null && valueChangedDaysAgo <= 90;
  const valueUp   = recentValueChange && card.value > card.previous_value;
  const valueDown = recentValueChange && card.value < card.previous_value;

  return (
    <>
    <AppHeader />
    <LabelPreviewModal
      labelData={labelData}
      onPrint={() => window.open(`/card-label/${id}`, "_blank")}
      onClose={() => setLabelData(null)}
    />
    <div style={{ textAlign: "center" }}>
      {/* Heading with Rookie Star */}
      <h2>
        {card.year} {card.brand} {card.first_name} {card.last_name} #{card.card_number}
        {isRookie && (
          <span style={{ marginLeft: "0.5rem", color: "gold", fontSize: "1.5rem" }}>⭐ (RC)</span>
        )}
      </h2>

      {/* Card ID + meta row */}
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0.5rem" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-secondary)" }}>{labelId}</span>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <span>Updated {updatedAt}</span>
        {duplicateCount !== null && duplicateCount > 0 && (
          <>
            <span style={{ margin: "0 0.5rem" }}>·</span>
            <Link
              to="/list-cards"
              state={{ lastNameFilter: card.last_name, yearFilter: String(card.year), brandFilter: card.brand }}
              style={{ color: "var(--text-secondary)", fontWeight: 500, textDecoration: "underline", cursor: "pointer" }}
            >
              {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} in collection
            </Link>
          </>
        )}
      </div>

      {/* Grade Badge */}
      <div style={{ margin: "0.5rem 0" }}>
        {card.grade && (
          <span className={`badge badge-grade ${gradeClass}`}>
            Grade: {card.grade}
          </span>
        )}

      {/* Card Value Badge + change indicator */}
        {cardValue !== null && (
          <>
            <span className={`badge badge-value ${valueClass}`}>
              Value: ${cardValue}
            </span>
            {!card.book_values_updated_at ? (
              <span
                title="Book values never entered"
                style={{ color: "#dc2626", fontWeight: 700, fontSize: "1.2rem", marginLeft: "0.25rem", verticalAlign: "middle" }}
              >!</span>
            ) : (
              <>
                {valueUp && (
                  <span
                    title={`Was $${card.previous_value} → $${card.value}`}
                    style={{ color: "#28a745", fontSize: "1.2rem", marginLeft: "0.25rem", verticalAlign: "middle" }}
                  >↑</span>
                )}
                {valueDown && (
                  <span
                    title={`Was $${card.previous_value} → $${card.value}`}
                    style={{ color: "#dc3545", fontSize: "1.2rem", marginLeft: "0.25rem", verticalAlign: "middle" }}
                  >↓</span>
                )}
              </>
            )}
            {bookFreshness.label && (
              bookFreshness.label === "Book: never updated"
                ? <span
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate("/list-cards", { state: { editCardId: card.id, scrollToCardId: card.id } })}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate("/list-cards", { state: { editCardId: card.id, scrollToCardId: card.id } }); }}
                    style={{ color: bookFreshness.color, fontWeight: 600, fontSize: "0.85rem",
                             marginLeft: "0.4rem", verticalAlign: "middle",
                             cursor: "pointer", textDecoration: "underline" }}
                  >· {bookFreshness.label}</span>
                : <span style={{ color: bookFreshness.color, fontWeight: 600, fontSize: "0.85rem",
                                 marginLeft: "0.4rem", verticalAlign: "middle" }}>
                    · {bookFreshness.label}
                  </span>
            )}
            {(card.book_high || card.book_mid || card.book_low) && (
              <button
                onClick={handleRefreshBook}
                title="Confirm book values are current (resets freshness timer)"
                style={{ background: "none", border: "none", cursor: "pointer",
                         fontSize: "1.1rem", color: "#0891b2", marginLeft: "0.3rem",
                         verticalAlign: "middle" }}
              >↻</button>
            )}
          </>
        )}
      </div>

      {/* Images */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginTop: "1rem",
        }}
      >
      {card.front_image && (
        <img
          src={card.front_image}
          alt="Front"
          style={{
            maxWidth: "800px",
            height: "auto",
          }}
        />
      )}
      {card.back_image && (
        <img
          src={card.back_image}
          alt="Back"
          style={{
            maxWidth: "800px",
            height: "auto",
          }}
        />
      )}
      </div>

      {/* Notes */}
      <div style={{ maxWidth: "600px", margin: "1.5rem auto 0", textAlign: "left" }}>
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
          placeholder="Add any notes about this card..."
        />
        <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
          <button
            className="nav-btn"
            onClick={saveNotes}
            disabled={notesSaving}
          >
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
        <button
          className="nav-btn secondary"
          onClick={() => navigate("/list-cards", { state: { scrollToCardId: Number(id), highlightCardId: Number(id) } })}
        >⬅ Back to List</button>
      </div>

      {/* Prev / Next navigation */}
      {cardIds && (
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button
            className="nav-btn secondary"
            onClick={() => prevId && navigate(`/card-detail/${prevId}`, { state: { cardIds } })}
            disabled={!prevId}
            style={{ opacity: prevId ? 1 : 0.4, cursor: prevId ? "pointer" : "not-allowed" }}
          >← Previous Card</button>
          <button
            className="nav-btn secondary"
            onClick={() => nextId && navigate(`/card-detail/${nextId}`, { state: { cardIds } })}
            disabled={!nextId}
            style={{ opacity: nextId ? 1 : 0.4, cursor: nextId ? "pointer" : "not-allowed" }}
          >Next Card →</button>
        </div>
      )}
    </div>
    </>
  );
}
