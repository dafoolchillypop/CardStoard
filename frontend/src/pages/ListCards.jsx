// src/pages/ListCards.jsx
/**
 * pages/ListCards.jsx
 * --------------------
 * Main card inventory view — the primary card management interface.
 *
 * Key features:
 *   - Paginated table of all user cards with sortable columns
 *   - Multi-column sort via SortModal (up to N levels, can be saved as default)
 *   - Inline editing: click row or edit button → edit form in row → save PUT /cards/:id
 *   - Row color coding: rookie (gold), grade 3.0 (lavender), rookie+grade3 (blue)
 *     Colors sourced from GlobalSettings
 *   - Pinned row (bookmark): persisted to localStorage per user
 *   - CD-player pagination controls in thead action column
 *   - Image viewer modal (CardImages) for front/back card photos
 *   - Label print via LabelPreviewModal → /card-label/:id
 *   - Batch label print: select multiple rows → /batch-labels with cardIds state
 *   - Quick navigation to CardDetail passing full sorted cardIds list for prev/next nav
 *
 * Sticky header: card-section uses overflow:auto + maxHeight calc(100vh-180px)
 * so thead th { position: sticky; top: 0 } works within the scroll container.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import CardImages from "../components/CardImages";
import LabelPreviewModal from "../components/LabelPreviewModal";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

const SORT_COLUMNS = [
  { key: "last_name",     label: "Last Name" },
  { key: "first_name",    label: "First Name" },
  { key: "year",          label: "Year" },
  { key: "brand",         label: "Brand" },
  { key: "card_number",   label: "Card #" },
  { key: "grade",         label: "Grade" },
  { key: "card_value",    label: "Card Value" },
  { key: "market_factor", label: "Market Factor" },
  { key: "rookie",        label: "Rookie" },
];

function SortModal({ sortConfig, defaultSort, onApply, onClose }) {
  const [levels, setLevels] = useState([...sortConfig]);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const usedKeys = new Set(levels.map(l => l.key));
  const available = SORT_COLUMNS.filter(c => !usedKeys.has(c.key));

  const addLevel = () => {
    if (available.length === 0) return;
    setLevels(prev => [...prev, { key: available[0].key, direction: "asc" }]);
  };
  const removeLevel = (i) => setLevels(prev => prev.filter((_, idx) => idx !== i));
  const updateLevel = (i, field, value) =>
    setLevels(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleApply = async () => {
    if (setAsDefault) {
      try { await api.put("/settings/", { default_sort: levels }); } catch (e) {}
    }
    onApply(levels);
    onClose();
  };

  const selStyle = { padding: "0.4rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 640, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Advanced Sort</h3>

        {levels.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No sort levels. Add one below.</p>
        )}

        {levels.map((level, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", width: 20 }}>{i + 1}.</span>
            <select value={level.key} onChange={e => updateLevel(i, "key", e.target.value)} style={{ ...selStyle, flex: 1 }}>
              {SORT_COLUMNS.filter(c => c.key === level.key || !usedKeys.has(c.key)).map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <select value={level.direction} onChange={e => updateLevel(i, "direction", e.target.value)} style={{ ...selStyle, width: 130 }}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button onClick={() => removeLevel(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem" }}
              title="Remove">✕</button>
          </div>
        ))}

        <button onClick={addLevel} disabled={available.length === 0}
          style={{ marginTop: "0.5rem", background: "none", border: "1px dashed var(--border)",
            borderRadius: 6, padding: "0.35rem 0.75rem", cursor: available.length === 0 ? "not-allowed" : "pointer",
            color: "var(--text-muted)", fontSize: "0.85rem", width: "100%" }}>
          + Add Level
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem",
          marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={setAsDefault} onChange={e => setSetAsDefault(e.target.checked)} />
          Set as my default sort order
        </label>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "center" }}>
          <button className="nav-btn" style={{ background: "#c62828" }}
            onClick={() => { onApply([]); onClose(); }}>Clear All</button>
          <button className="nav-btn secondary" disabled={!defaultSort?.length}
            onClick={() => setLevels([...defaultSort])}
            title={defaultSort?.length ? "Restore saved default sort" : "No default sort saved"}>↺ Default</button>
          <button className="nav-btn secondary" onClick={onClose}>Cancel</button>
          <button className="nav-btn" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function ListCards() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnState = location.state || {};

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [settings, setSettings] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [lastNameFilter, setLastNameFilter] = useState(returnState.lastNameFilter ?? "");
  const [brandFilter, setBrandFilter] = useState(returnState.brandFilter ?? "");
  const [gradeFilter, setGradeFilter] = useState(returnState.gradeFilter ?? "");
  const [yearFilter, setYearFilter] = useState(returnState.yearFilter ?? "");
  const [sortConfig, setSortConfig] = React.useState(Array.isArray(returnState.sortConfig) ? returnState.sortConfig : []);
  const [showSortModal, setShowSortModal] = useState(false);
  const [returnCardId, setReturnCardId] = useState(returnState.returnCardId ?? null);
  const [pinnedCard, setPinnedCard] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [cloningCardId, setCloningCardId] = useState(null);
  const [cloningParentId, setCloningParentId] = useState(null);
  const [displaySnapshot, setDisplaySnapshot] = useState(null); // frozen ordered id list during clone session
  const [focusCardId, setFocusCardId] = useState(null);
  const [pinnedRowId, setPinnedRowId] = useState(() => {
    const stored = localStorage.getItem("cs-pinned-row");
    return stored ? Number(stored) : null;
  });
  const rowRefsMap = useRef({});
  const [variantOpenId, setVariantOpenId] = useState(null);
  const [variantForm, setVariantForm] = useState({});
  const [labelData, setLabelData] = useState(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(new Set());
  const [playerNames, setPlayerNames] = useState({ firstNames: [], lastNames: [] });
  const skipNextFetchRef = React.useRef(false);
  const defaultSortApplied = useRef(false);
  const tableSectionRef = useRef(null);
  const origBookVals = useRef({});
  const autoEditRef = useRef(false);
  const [toast, setToast] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [jumpRate, setJumpRate] = useState(50);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch the updated card directly so it's always visible regardless of current page
  useEffect(() => {
    if (!returnCardId) { setPinnedCard(null); return; }
    api.get(`/cards/${returnCardId}`)
      .then(res => setPinnedCard(res.data))
      .catch(() => setPinnedCard(null));
  }, [returnCardId]);

  const clearPin = () => { setReturnCardId(null); setPinnedCard(null); };
  const clearCloneAnchor = () => { setCloningCardId(null); setCloningParentId(null); setDisplaySnapshot(null); };
  const handlePinRow = (cardId) => {
    setPinnedRowId(prev => {
      const next = prev === cardId ? null : cardId;
      if (next) localStorage.setItem("cs-pinned-row", String(next));
      else localStorage.removeItem("cs-pinned-row");
      return next;
    });
  };

  // Auto-enter edit mode when navigating back with editCardId in state (e.g. from "Book: never updated" link)
  useEffect(() => {
    if (!autoEditRef.current && returnState.editCardId) {
      const target = pinnedCard?.id === returnState.editCardId
        ? pinnedCard
        : cards.find(c => c.id === returnState.editCardId);
      if (target) {
        handleEditStart(target);
        autoEditRef.current = true;
      }
    }
  }, [cards, pinnedCard]);

  // Focus the scroll container whenever cards load/refresh so arrow keys work immediately.
  // preventScroll avoids browsers resetting the container's scroll position on focus.
  useEffect(() => {
    tableSectionRef.current?.focus({ preventScroll: true });
  }, [cards]);


  const handlePrintLabel = (card) => {
    setLabelLoading(card.id);
    api.get(`/cards/${card.id}/public`)
      .then((res) => setLabelData(res.data))
      .catch((err) => console.error("Label fetch error:", err))
      .finally(() => setLabelLoading(false));
  };

  const toggleFilterCol = (col) => {
    setOpenFilterCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const handleEditStart = (card) => {
    setVariantOpenId(null);
    setVariantForm({});
    setEditingCardId(card.id);
    setEditForm({ ...card });
    origBookVals.current = {
      book_high: card.book_high, book_high_mid: card.book_high_mid,
      book_mid: card.book_mid, book_low_mid: card.book_low_mid, book_low: card.book_low,
    };
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const reapplySort = () => {
    clearPin();
    if (sortConfig.length === 0 && settings?.default_sort?.length > 0) {
      setSortConfig(settings.default_sort);
    }
  };

  const handleEditSave = async (cardId) => {
    if (cardId === "new") {
      try {
        const res = await api.post("/cards/", editForm);
        setCards(prev => [res.data, ...prev]);
        setTotal(prev => prev + 1);
        setEditingCardId(null);
        setEditForm({});
        reapplySort();
      } catch (err) {
        console.error("Error adding card:", err);
        alert("Failed to add card.");
      }
    } else {
      try {
        const res = await api.put(`/cards/${cardId}`, editForm);
        setCards(prev => prev.map(c => c.id === cardId ? res.data : c));
        if (pinnedCard?.id === cardId) setPinnedCard(res.data);
        setEditingCardId(null);
        setPinnedRowId(cardId);
        localStorage.setItem("cs-pinned-row", String(cardId));
        // For clone saves the snapshot already keeps the row in place; only
        // trigger a scroll for regular edits where the row may have moved.
        if (cardId !== cloningCardId) setFocusCardId(cardId);

        const BOOK_FIELDS = ["book_high", "book_high_mid", "book_mid", "book_low_mid", "book_low"];
        const bookChanged = BOOK_FIELDS.some(f => (editForm[f] || null) !== (origBookVals.current[f] || null));
        if (bookChanged && editForm.brand && editForm.year && editForm.card_number) {
          try {
            const params = {
              first_name: editForm.first_name, last_name: editForm.last_name,
              brand: editForm.brand, year: editForm.year, card_number: editForm.card_number,
              ...(editForm.book_high     ? { book_high:     editForm.book_high }     : {}),
              ...(editForm.book_high_mid ? { book_high_mid: editForm.book_high_mid } : {}),
              ...(editForm.book_mid      ? { book_mid:      editForm.book_mid }      : {}),
              ...(editForm.book_low_mid  ? { book_low_mid:  editForm.book_low_mid }  : {}),
              ...(editForm.book_low      ? { book_low:      editForm.book_low }      : {}),
            };
            const bulkRes = await api.patch("/cards/propagate-book-values", null, { params });
            if (bulkRes.data.updated > 1) {
              showToast(`Book values updated for all ${bulkRes.data.updated} matching cards`);
              setRefreshTick(t => t + 1);
            }
          } catch (bulkErr) {
            console.error("Book value propagation failed:", bulkErr);
          }
        }
      } catch (err) {
        console.error("Error updating card:", err);
        alert("Failed to save changes.");
      }
    }
  };

  const handleEditCancel = () => {
    if (cloningCardId) {
      // Clone in progress — delete the new card and scroll back to parent
      api.delete(`/cards/${cloningCardId}`).catch(console.error);
      setCards(prev => prev.filter(c => c.id !== cloningCardId));
      setTotal(prev => prev - 1);
      setDisplaySnapshot(null);
      setFocusCardId(cloningParentId);
      setCloningCardId(null);
      setCloningParentId(null);
    } else if (editingCardId && editingCardId !== "new") {
      // Regular edit cancel — scroll back to the row's current position
      setFocusCardId(editingCardId);
    }
    setEditingCardId(null);
    setEditForm({});
  };

  const openVariant = (card) => {
    setVariantOpenId(card.id);
    setVariantForm(card.card_attributes || {});
  };

  const closeVariant = () => {
    setVariantOpenId(null);
    setVariantForm({});
  };

  const saveVariant = async (cardId) => {
    try {
      const res = await api.put(`/cards/${cardId}`, { card_attributes: variantForm });
      setCards(prev => prev.map(c => c.id === cardId ? res.data : c));
      closeVariant();
    } catch (err) {
      console.error("Variant save error:", err);
    }
  };

  const handleNewNameKeyDown = (e, field, names) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    const typed = (editForm[field] || "").trim().toLowerCase();
    if (!typed) return;
    const match = names.find(n => n.toLowerCase().startsWith(typed));
    if (match && match.toLowerCase() !== typed) {
      if (e.key === "Enter") e.preventDefault();
      setEditForm(prev => ({ ...prev, [field]: match }));
    }
  };

  const handleDuplicate = async (card) => {
    const { id, value, market_factor, front_image, back_image, ...fields } = card;
    try {
      const res = await api.post("/cards/", fields);
      const newCard = res.data;
      skipNextFetchRef.current = true;
      // Insert directly after the original card in the raw cards array
      setCards(prev => {
        const idx = prev.findIndex(c => c.id === card.id);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx + 1, 0, newCard);
          return next;
        }
        return [newCard, ...prev];
      });
      setTotal(prev => prev + 1);
      // Freeze the current display order with the new card inserted after its parent
      const parentIdx = displayedCards.findIndex(c => c.id === card.id);
      const snap = displayedCards.map(c => c.id);
      snap.splice(parentIdx >= 0 ? parentIdx + 1 : snap.length, 0, newCard.id);
      setDisplaySnapshot(snap);
      setCloningCardId(newCard.id);
      setCloningParentId(card.id);
      setEditingCardId(newCard.id);
      setEditForm({ ...newCard });
      // Initialise origBookVals so clone save doesn't false-positive bookChanged
      origBookVals.current = {
        book_high: newCard.book_high, book_high_mid: newCard.book_high_mid,
        book_mid: newCard.book_mid, book_low_mid: newCard.book_low_mid, book_low: newCard.book_low,
      };
      setFocusCardId(newCard.id);
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert("Failed to duplicate card.");
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Delete ${card.first_name} ${card.last_name}?`)) return;
    try {
      await api.delete(`/cards/${card.id}`);
      setCards(prev => prev.filter(c => c.id !== card.id));
      setTotal(prev => prev - 1);
      if (pinnedCard?.id === card.id) setPinnedCard(null);
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Failed to delete card.");
    }
  };

  const handleRefreshBook = async (card) => {
    try {
      const res = await api.post(`/cards/${card.id}/refresh-book-values`);
      setCards(prev => prev.map(c => c.id === card.id ? res.data : c));
      if (pinnedCard?.id === card.id) setPinnedCard(res.data);
    } catch (err) {
      console.error("Book refresh failed:", err);
    }
  };

  // Load count once
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get("/cards/count");
        setTotal(res.data.count);
        if (res.data.count === 0) setLoading(false); // empty collection — nothing to fetch
      } catch (err) {
        console.error("Error fetching count:", err);
        setLoading(false);
      }
    };
    fetchCount();
  }, []);

  // Load settings once
  useEffect(() => {
    api
      .get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Apply saved default sort on first load (only if no returnState sort was set)
  useEffect(() => {
    if (defaultSortApplied.current) return;
    if (!settings) return;
    defaultSortApplied.current = true;
    if (settings.default_sort?.length > 0 && sortConfig.length === 0) {
      setSortConfig(settings.default_sort);
    }
  }, [settings]);

  // Load player names for smart fill autocomplete
  useEffect(() => {
    api.get("/cards/players")
      .then((res) => {
        const players = res.data.players || [];
        setPlayerNames({
          firstNames: [...new Set(players.map(p => p.first_name))].sort(),
          lastNames: [...new Set(players.map(p => p.last_name))].sort(),
        });
      })
      .catch(() => {});
  }, []);

  // Smart fill for inline new-card row
  useEffect(() => {
    if (editingCardId !== "new") return;
    if (!settings?.enable_smart_fill) return;
    if (!editForm.first_name || !editForm.last_name) return;

    const params = {
      first_name: editForm.first_name.trim().toLowerCase(),
      last_name: editForm.last_name.trim().toLowerCase(),
    };
    if (editForm.brand) params.brand = editForm.brand;
    if (editForm.year && !isNaN(Number(editForm.year))) params.year = Number(editForm.year);

    const cardNum = (editForm.card_number || "").trim();

    const timeout = setTimeout(async () => {
      try {
        if (cardNum) {
          // Card number present — look up book values for this exact card
          const res = await api.get("/cards/smart-fill", { params: { ...params, card_number: cardNum } });
          if (res.data.status === "ok") {
            const f = res.data.fields;
            setEditForm(prev => ({
              ...prev,
              book_high:     f.book_high     ?? prev.book_high,
              book_high_mid: f.book_high_mid ?? prev.book_high_mid,
              book_mid:      f.book_mid      ?? prev.book_mid,
              book_low_mid:  f.book_low_mid  ?? prev.book_low_mid,
              book_low:      f.book_low      ?? prev.book_low,
            }));
          }
        } else {
          // No card number — fill card_number + rookie, then immediately look up book values
          const res = await api.get("/cards/smart-fill", { params });
          if (res.data.status === "ok") {
            const f = res.data.fields;
            const filledCardNum = f.card_number || "";
            setEditForm(prev => ({
              ...prev,
              rookie: f.rookie !== undefined ? (f.rookie ? 1 : 0) : prev.rookie,
              card_number: filledCardNum || prev.card_number,
            }));
            if (filledCardNum) {
              const res2 = await api.get("/cards/smart-fill", { params: { ...params, card_number: filledCardNum } });
              if (res2.data.status === "ok") {
                const f2 = res2.data.fields;
                setEditForm(prev => ({
                  ...prev,
                  book_high:     f2.book_high     ?? prev.book_high,
                  book_high_mid: f2.book_high_mid ?? prev.book_high_mid,
                  book_mid:      f2.book_mid      ?? prev.book_mid,
                  book_low_mid:  f2.book_low_mid  ?? prev.book_low_mid,
                  book_low:      f2.book_low      ?? prev.book_low,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error("Smart Fill error:", err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [editForm.first_name, editForm.last_name, editForm.brand, editForm.year, editForm.card_number, editingCardId, settings?.enable_smart_fill]);

  // Load all cards whenever total or refreshTick changes
  useEffect(() => {
    if (skipNextFetchRef.current) { skipNextFetchRef.current = false; return; }
    const fetchCards = async () => {
      if (total === 0) return;
      setLoading(true);
      try {
        const res = await api.get(`/cards/?skip=0&limit=${total}`);
        setCards(res.data);
      } catch (err) {
        console.error("Error fetching cards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [location, total, refreshTick]);


  // Filtering Fields
  const filteredCards = cards.filter((card) => {
    const matchesLastName = lastNameFilter
      ? card.last_name?.toLowerCase().includes(lastNameFilter.toLowerCase())
      : true;

    const matchesBrand = brandFilter
      ? card.brand?.toLowerCase().includes(brandFilter.toLowerCase())
      : true;

    const matchesGrade = gradeFilter
      ? String(card.grade || "").toLowerCase().includes(gradeFilter.toLowerCase())
      : true;

    const matchesYear = yearFilter
      ? String(card.year || "").includes(yearFilter)
      : true;

    return matchesLastName && matchesBrand && matchesGrade && matchesYear;
  });

  const sortedCards = React.useMemo(() => {
    let sortable = [...filteredCards];

    if (sortConfig.length === 0) return sortable;

    const getVal = (card, key) => {
      switch (key) {
        case "year":          return parseInt(card.year, 10) || 0;
        case "last_name":     return card.last_name?.toLowerCase() || "";
        case "first_name":    return card.first_name?.toLowerCase() || "";
        case "grade":         return parseFloat(card.grade) || 0;
        case "card_value":    return Number(card.value) || 0;
        case "market_factor": return Number(card.market_factor) || 0;
        case "rookie":        return Number(card.rookie) || 0;
        default:              return (card[key] || "").toString().toLowerCase();
      }
    };

    sortable.sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        const aVal = getVal(a, key);
        const bVal = getVal(b, key);
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortable;
  }, [filteredCards, sortConfig, settings]);

  // When a clone session is active, use the frozen snapshot order (updated data only).
  // Otherwise, apply pin-to-top for return navigation.
  const displayedCards = React.useMemo(() => {
    if (displaySnapshot) {
      const cardMap = new Map(cards.map(c => [c.id, c]));
      if (pinnedCard) cardMap.set(pinnedCard.id, pinnedCard);
      return displaySnapshot.map(id => cardMap.get(id)).filter(Boolean);
    }

    let result = [...sortedCards];
    if (pinnedCard) {
      const pinId = Number(pinnedCard.id);
      result = [pinnedCard, ...result.filter(c => Number(c.id) !== pinId)];
    }
    return result;
  }, [displaySnapshot, cards, sortedCards, pinnedCard]);

  // Scroll a specific row into view after render (edit save / clone / cancel)
  useEffect(() => {
    if (!focusCardId) return;
    const el = rowRefsMap.current[focusCardId];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setFocusCardId(null);
    }
  }, [focusCardId, displayedCards]);

  const requestSort = (key) => {
    clearPin();
    clearCloneAnchor();
    const existing = sortConfig.find(s => s.key === key);
    const direction = (existing && sortConfig.length === 1 && existing.direction === "asc") ? "desc" : "asc";
    setSortConfig([{ key, direction }]);
  };

  const getSortIndicator = (key) => {
    if (sortConfig.length !== 1 || sortConfig[0].key !== key) return "";
    return sortConfig[0].direction === "asc" ? "▲" : "▼";
  };

  // Add this near top of component body (after sortedCards is defined)
  const totalValue = React.useMemo(
    () => displayedCards.reduce((sum, card) => sum + Math.round(Number(card.value) || 0), 0), [displayedCards]
  );

  const getAnchorIndex = () => {
    const container = tableSectionRef.current;
    if (!container || displayedCards.length === 0) return 0;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < displayedCards.length; i++) {
      const el = rowRefsMap.current[displayedCards[i].id];
      if (el && el.offsetTop >= scrollTop) return i;
    }
    return displayedCards.length - 1;
  };

  const scrollToTop = () => {
    clearCloneAnchor();
    if (tableSectionRef.current) tableSectionRef.current.scrollTop = 0;
  };

  const scrollToBottom = () => {
    clearCloneAnchor();
    if (tableSectionRef.current) tableSectionRef.current.scrollTop = tableSectionRef.current.scrollHeight;
  };

  const jumpUp = () => {
    if (displayedCards.length === 0) return;
    clearCloneAnchor();
    const targetIdx = Math.max(0, getAnchorIndex() - jumpRate);
    setFocusCardId(displayedCards[targetIdx].id);
  };

  const jumpDown = () => {
    if (displayedCards.length === 0) return;
    clearCloneAnchor();
    const targetIdx = Math.min(displayedCards.length - 1, getAnchorIndex() + jumpRate);
    setFocusCardId(displayedCards[targetIdx].id);
  };

    return (
      <>
      <AppHeader />
      <div className="list-container">

        {/* Line 1: compact title */}
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          Cards
        </h2>

        {/* Line 2: single toolbar — left / center / right */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem" }}>

          {/* Left: selection toggle + print selected */}
          <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
            {!selectionMode ? (
              <button
                className="nav-btn"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => setSelectionMode(true)}
              >
                Select to Print
              </button>
            ) : (
              <button
                className="nav-btn secondary"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); tableSectionRef.current?.focus(); }}
              >
                ✕ Cancel
              </button>
            )}
            {selectionMode && selectedIds.size > 0 && (
              <button
                className="nav-btn"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => navigate("/batch-labels", { state: { mode: "selection", ids: [...selectedIds] } })}
              >
                🖨️ Print Selected ({selectedIds.size})
              </button>
            )}
          </div>

          {/* Center: count [clear filters] · value */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", color: "#555" }}>
            {(lastNameFilter || brandFilter || yearFilter || gradeFilter)
              ? <>
                  <span><span style={{ color: "#dc3545" }}>{displayedCards.length}</span><span style={{ color: "var(--accent-blue)" }}> of {total} cards</span></span>
                  <span
                    onClick={() => { setLastNameFilter(""); setBrandFilter(""); setYearFilter(""); setGradeFilter(""); clearCloneAnchor(); }}
                    style={{ color: "#dc3545", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                  >✕ Clear filters</span>
                </>
              : <span style={{ color: "var(--accent-blue)" }}>{total} cards</span>
            }
            <span>&middot;</span>
            <span style={{ color: "#2e7d32" }}>Value: {fmtDollar(totalValue)}</span>
          </div>

          {/* Right: sort + print buttons */}
          <div style={{ flex: 1, display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              className="nav-btn"
              onClick={() => setShowSortModal(true)}
              style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem", ...(sortConfig.length > 0 && { background: "#1a7a1a" }) }}
              title="Advanced sort"
            >
              ⇅ Sort{sortConfig.length > 0 ? ` (${sortConfig.length})` : ""}
            </button>
            <button
              className="nav-btn"
              style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
              onClick={() => navigate("/batch-labels", { state: { mode: "all" } })}
            >
              🖨️ Print All
            </button>
          </div>

        </div>

        <div style={{ clear: "both" }} />  {/* ensures layout resets after float */}
      
        {loading ? (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <div className="cs-spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.95rem" }}>Loading cards…</p>
          </div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ color: "#555" }}>No cards found.</p>
            <button className="nav-btn" onClick={() => navigate("/import-cards")}>
              Import Cards
            </button>
          </div>
        ) : (
          <div ref={tableSectionRef} tabIndex={-1} className="card-section" style={{ width: "100%", boxSizing: "border-box", overflow: "auto", maxHeight: "calc(100vh - 180px)", outline: "none" }}>
          {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {selectionMode && (
                    <th style={{ width: 32, textAlign: "center", padding: "0 4px" }}>
                      <input
                        type="checkbox"
                        title="Select all"
                        checked={displayedCards.length > 0 && displayedCards.every(c => selectedIds.has(c.id))}
                        onChange={(e) => {
                          const ids = displayedCards.map(c => c.id);
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) ids.forEach(id => next.add(id));
                            else ids.forEach(id => next.delete(id));
                            return next;
                          });
                        }}
                      />
                    </th>
                  )}
                  <th className="fname-col">First</th>
                  <th className="lname-col" onClick={() => requestSort("last_name")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Last {getSortIndicator("last_name")}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("last"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: lastNameFilter ? "#007bff" : "#aaa" }} title="Filter by last name">🔍</span>
                    </div>
                    {openFilterCols.has("last") && (
                      <input autoFocus type="text" value={lastNameFilter} onChange={(e) => setLastNameFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("last")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="year-col" onClick={() => requestSort("year")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Year {getSortIndicator("year")}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("year"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: yearFilter ? "#007bff" : "#aaa" }} title="Filter by year">🔍</span>
                    </div>
                    {openFilterCols.has("year") && (
                      <input autoFocus type="text" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("year")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="brand-col">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Brand
                      <span onClick={() => toggleFilterCol("brand")} style={{ cursor: "pointer", fontSize: "0.75rem", color: brandFilter ? "#007bff" : "#aaa" }} title="Filter by brand">🔍</span>
                    </div>
                    {openFilterCols.has("brand") && (
                      <input autoFocus type="text" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("brand")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="card-number-col">Card #</th>
                  <th className="rookie-col" style={{ textAlign: "center", width: 55 }}>Rookie</th>

                  <th className="grade-col" style={{ textAlign: "center", width: 65, cursor: "pointer" }} onClick={() => requestSort("grade")}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Grade {getSortIndicator("grade")}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("grade"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: gradeFilter ? "#007bff" : "#aaa" }} title="Filter by grade">🔍</span>
                    </div>
                    {openFilterCols.has("grade") && (
                      <input autoFocus type="text" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("grade")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>

                  <th className="book-col" style={{ textAlign: "center", minWidth: 180 }}>Book</th>
                  <th className="market-factor-col" style={{ textAlign: "center", width: 80 }}>Market Factor</th>

                  <th className="card-value-col" style={{ textAlign: "center", cursor: "pointer" }}
                      onClick={() => requestSort("card_value")}>Card Value {getSortIndicator("card_value")}
                  </th>

                  <th className="card-images-col" style={{ textAlign: "center", width: 65 }}>Images</th>
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140 }}>
                    {/* Row 1: |◄ ▲ [rate] ▼ ►| */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", marginBottom: "0.25rem" }}>
                      <button onClick={scrollToTop} disabled={displayedCards.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: displayedCards.length === 0 ? "default" : "pointer",
                                 opacity: displayedCards.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title="Jump to top">|◄</button>
                      <button onClick={jumpUp} disabled={displayedCards.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: displayedCards.length === 0 ? "default" : "pointer",
                                 opacity: displayedCards.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title={`Page up ${jumpRate} rows`}>▲</button>
                      <select value={jumpRate} onChange={e => setJumpRate(Number(e.target.value))}
                        style={{ fontSize: "0.75rem", padding: "1px 2px", border: "1px solid var(--border)",
                                 background: "var(--bg-input)", color: "var(--text-primary)",
                                 borderRadius: 4, cursor: "pointer", width: "auto" }}
                        title="Page size (rows per step)">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <button onClick={jumpDown} disabled={displayedCards.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: displayedCards.length === 0 ? "default" : "pointer",
                                 opacity: displayedCards.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title={`Page down ${jumpRate} rows`}>▼</button>
                      <button onClick={scrollToBottom} disabled={displayedCards.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: displayedCards.length === 0 ? "default" : "pointer",
                                 opacity: displayedCards.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title="Jump to bottom">►|</button>
                    </div>
                    {/* Row 2: pin centered under left cluster, add centered under right cluster */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => pinnedRowId && setFocusCardId(pinnedRowId)} disabled={!pinnedRowId}
                          style={{ background: "none", border: "none", padding: 0, fontSize: "1.1rem", width: "auto",
                                   cursor: pinnedRowId ? "pointer" : "default",
                                   opacity: pinnedRowId ? 1 : 0.5, color: "#ff0000" }}
                          title={pinnedRowId ? "Jump to pinned row" : "No row pinned"}>📌</button>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button
                          onClick={() => {
                            if (editingCardId === "new") return;
                            setEditingCardId("new");
                            setEditForm({
                              first_name: "", last_name: "", year: "", card_number: "",
                              brand: settings?.card_makes?.[0] || "",
                              grade: settings?.card_grades?.[0] || "",
                              rookie: 0,
                              book_high: "", book_high_mid: "", book_mid: "", book_low_mid: "", book_low: ""
                            });
                          }}
                          style={{ background: "none", border: "none", fontSize: "1.5rem", width: "auto", padding: 0,
                                   cursor: editingCardId === "new" ? "not-allowed" : "pointer",
                                   color: editingCardId === "new" ? "#aaa" : "#28a745" }}
                          title="Add card">＋</button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {editingCardId === "new" && (() => {
                  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };
                  return (
                    <tr style={{ backgroundColor: "#f0fff4", outline: "2px solid #28a745" }}>
                      {selectionMode && <td style={{ width: 32 }} />}
                      <td className="fname-col"><input style={inp} placeholder="First" value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} onKeyDown={e => handleNewNameKeyDown(e, "first_name", playerNames.firstNames)} /></td>
                      <td className="lname-col"><input style={inp} placeholder="Last" value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} onKeyDown={e => handleNewNameKeyDown(e, "last_name", playerNames.lastNames)} /></td>
                      <td className="year-col"><input style={inp} type="number" placeholder="Year" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} /></td>
                      <td className="brand-col">
                        <select style={inp} value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)}>
                          {(settings?.card_makes || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="card-number-col"><input style={inp} placeholder="Card #" value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} /></td>
                      <td className="rookie-col" style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={!!Number(editForm.rookie)} onChange={e => handleEditChange("rookie", e.target.checked ? 1 : 0)} />
                      </td>
                      <td className="grade-col">
                        <select style={inp} value={editForm.grade || ""} onChange={e => handleEditChange("grade", parseFloat(e.target.value))}>
                          {(settings?.card_grades || []).map(gr => <option key={gr} value={gr}>{gr}</option>)}
                        </select>
                      </td>
                      <td className="book-col">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {[["book_high","H","High (NM-MT+)"],["book_high_mid","HM","High Mid (NM)"],["book_mid","M","Mid (EX)"],["book_low_mid","LM","Low Mid (VG)"],["book_low","L","Low (PR)"]].map(([field, label, title]) => (
                            <div key={field} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              <span style={{ fontSize: "0.7rem", color: "#888", width: "18px", flexShrink: 0 }}>{label}</span>
                              <input style={inp} type="number" title={title} value={editForm[field] || ""} onChange={e => handleEditChange(field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="market-factor-col"></td>
                      <td className="value-col"></td>
                      <td className="image-col"></td>
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          <button onClick={() => handleEditSave("new")} style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✓ Save</button>
                          <button onClick={handleEditCancel} style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✗ Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
                {displayedCards.map((card) => {
                  const g = parseFloat(card.grade);
                  const rookieVal = card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1 || card.rookie === true;
                  const isEditing = editingCardId === card.id;

                  let gradeClass = "grade-unknown";
                  if (!Number.isNaN(g)) {
                    if (g === 3) gradeClass = "grade-mt";
                    else if (g === 1.5) gradeClass = "grade-ex";
                    else if (g === 1) gradeClass = "grade-vg";
                    else if (g === 0.8) gradeClass = "grade-gd";
                    else if (g === 0.4) gradeClass = "grade-fr";
                    else gradeClass = "grade-pr";
                  }

                  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };

                  return (
                    <tr
                      key={card.id}
                      ref={el => { if (el) rowRefsMap.current[card.id] = el; else delete rowRefsMap.current[card.id]; }}
                      style={(() => {
                        // Book freshness left border
                        const freshnessColor = (() => {
                          if (!card.book_values_updated_at) return "#dc2626";
                          const d = (Date.now() - new Date(card.book_values_updated_at)) / (1000 * 60 * 60 * 24);
                          if (d < 30) return null;
                          if (d < 90) return "#f59e0b";
                          return "#dc2626";
                        })();
                        const freshnessBorder = freshnessColor ? { borderLeft: `4px solid ${freshnessColor}` } : {};

                        if (isEditing) return { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2", ...freshnessBorder };
                        if (selectedIds.has(card.id)) return { backgroundColor: "#dceeff", ...freshnessBorder };
                        if (Number(card.id) === Number(returnCardId))
                          return { backgroundColor: "#fffde7", outline: "2px solid #ffc107", transition: "background-color 0.5s", ...freshnessBorder };
                        if (Number(card.id) === Number(pinnedRowId))
                          return { backgroundColor: "#6b7280", outline: "2px solid #374151", ...freshnessBorder };
                        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
                        const def = isDark
                          ? { rg3: "#1d6090", g3: "#5f3d96", r: "#b8ad00" }
                          : { rg3: "#b8d8f7", g3: "#e8dcff", r: "#fff3c4" };
                        if (rookieVal && g === 3)
                          return { backgroundColor: isDark ? def.rg3 : (settings?.row_color_rookie_grade3 || def.rg3), ...freshnessBorder };
                        if (g === 3)
                          return { backgroundColor: isDark ? def.g3 : (settings?.row_color_grade3 || def.g3), ...freshnessBorder };
                        if (rookieVal)
                          return { backgroundColor: isDark ? def.r : (settings?.row_color_rookie || def.r), ...freshnessBorder };
                        return freshnessBorder;
                      })()}
                    >
                      {/* Checkbox — only in selection mode */}
                      {selectionMode && (
                        <td style={{ width: 32, textAlign: "center", padding: "0 4px" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(card.id)}
                            onChange={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(card.id)) next.delete(card.id);
                                else next.add(card.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                      )}
                      {/* First */}
                      <td className="fname-col">
                        {isEditing
                          ? <input style={inp} value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} />
                          : <span>{card.first_name}</span>}
                      </td>

                      {/* Last */}
                      <td className="lname-col">
                        {isEditing
                          ? <input style={inp} value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} />
                          : card.last_name}
                      </td>

                      {/* Year */}
                      <td className="year-col">
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} />
                          : card.year}
                      </td>

                      {/* Brand — click to expand variant accordion */}
                      <td className="brand-col" style={(() => {
                        const a = card.card_attributes || {};
                        const hasExtra = !isEditing && (variantOpenId === card.id || a.parallel || a.refractor || a.autograph || a.short_print || a.numbered || a.traded || a.subset);
                        return hasExtra ? { verticalAlign: "top" } : { verticalAlign: "middle", textAlign: "center" };
                      })()}>
                        {isEditing
                          ? <select style={inp} value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)}>
                              {(settings?.card_makes || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          : <>
                              <span
                                className="badge badge-brand"
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => variantOpenId === card.id ? closeVariant() : openVariant(card)}
                                title="Click to view/edit card variants"
                              >{card.brand}</span>
                              {/* Variant chips — shown when collapsed and attributes set */}
                              {variantOpenId !== card.id && (() => {
                                const a = card.card_attributes || {};
                                const chips = [
                                  a.parallel && <span key="par" style={{ display: "inline-block", fontSize: "0.65rem", background: "#7c3aed", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>{a.parallel}</span>,
                                  a.refractor && <span key="ref" style={{ display: "inline-block", fontSize: "0.65rem", background: "#0ea5e9", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>Ref</span>,
                                  a.autograph && <span key="auto" style={{ display: "inline-block", fontSize: "0.65rem", background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>Auto</span>,
                                  a.short_print && <span key="sp" style={{ display: "inline-block", fontSize: "0.65rem", background: "#b45309", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>SP</span>,
                                  a.numbered && <span key="num" style={{ display: "inline-block", fontSize: "0.65rem", background: "#374151", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>/{a.numbered}</span>,
                                  a.traded && <span key="tr" style={{ display: "inline-block", fontSize: "0.65rem", background: "#065f46", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>T</span>,
                                  a.subset && <span key="sub" style={{ display: "inline-block", fontSize: "0.65rem", background: "#6b7280", color: "#fff", borderRadius: 10, padding: "1px 5px", marginLeft: 3 }}>{a.subset}</span>,
                                ].filter(Boolean);
                                return chips.length > 0 ? <div style={{ marginTop: 3 }}>{chips}</div> : null;
                              })()}
                              {/* Variant accordion panel */}
                              {variantOpenId === card.id && (
                                <div style={{ marginTop: "6px", textAlign: "left", background: "var(--bg-input, #f8f8f8)", border: "1px solid var(--border-color, #ddd)", borderRadius: 6, padding: "8px 10px", minWidth: 200 }}>
                                  {[
                                    ["parallel",    "Parallel",   "text",     "e.g. Gold Prizm"],
                                    ["numbered",    "Numbered",   "text",     "e.g. 100"],
                                    ["subset",      "Subset",     "text",     "e.g. Future Stars"],
                                  ].map(([key, label, type, ph]) => (
                                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                                      <label style={{ fontSize: "0.72rem", width: 62, color: "var(--text-muted)", flexShrink: 0 }}>{label}</label>
                                      <input
                                        type={type}
                                        placeholder={ph}
                                        value={variantForm[key] || ""}
                                        onChange={e => setVariantForm(f => ({ ...f, [key]: e.target.value || undefined }))}
                                        style={{ fontSize: "0.78rem", padding: "2px 4px", border: "1px solid var(--border-color, #ccc)", borderRadius: 3, width: "100%", background: "var(--bg-input, #fff)" }}
                                      />
                                    </div>
                                  ))}
                                  {[
                                    ["refractor",   "Refractor"],
                                    ["short_print", "Short Print"],
                                    ["autograph",   "Autograph"],
                                    ["traded",      "Traded"],
                                  ].map(([key, label]) => (
                                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", marginBottom: 3, cursor: "pointer" }}>
                                      <input
                                        type="checkbox"
                                        checked={!!variantForm[key]}
                                        onChange={e => setVariantForm(f => ({ ...f, [key]: e.target.checked || undefined }))}
                                      />
                                      {label}
                                    </label>
                                  ))}
                                  <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                                    <button onClick={() => saveVariant(card.id)} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "#28a745", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
                                    <button onClick={closeVariant} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </>
                        }
                      </td>

                      {/* Card Number */}
                      <td className="card-number-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} />
                          : card.front_image || card.back_image
                            ? <span style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }} onClick={() => navigate(`/card-detail/${card.id}`, { state: { cardIds: sortedCards.map(c => c.id) } })}>{card.card_number}</span>
                            : <span>{card.card_number}</span>}
                      </td>

                      {/* Rookie */}
                      <td className="rookie-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <input type="checkbox" checked={!!Number(editForm.rookie)} onChange={e => handleEditChange("rookie", e.target.checked ? 1 : 0)} />
                          : rookieVal && <span className="rookie-badge">⭐</span>}
                      </td>

                      {/* Grade */}
                      <td className="grade-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <select style={inp} value={editForm.grade || ""} onChange={e => handleEditChange("grade", parseFloat(e.target.value))}>
                              {(settings?.card_grades || []).map(gr => <option key={gr} value={gr}>{gr}</option>)}
                            </select>
                          : card.grade && <span className={`badge badge-grade ${gradeClass}`}>{card.grade}</span>}
                      </td>

                      {/* Book — freshness shown via row left border */}
                      <td className="book-col" style={{ textAlign: "center" }} title={card.book_values_updated_at
                        ? `Book values updated: ${new Date(card.book_values_updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                        : "Book values never updated"
                      }>
                        {isEditing
                          ? <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {[["book_high","H","High (NM-MT+)"],["book_high_mid","HM","High Mid (NM)"],["book_mid","M","Mid (EX)"],["book_low_mid","LM","Low Mid (VG)"],["book_low","L","Low (PR)"]].map(([field, label, title]) => (
                                <div key={field} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <span style={{ fontSize: "0.7rem", color: "#888", width: "18px", flexShrink: 0 }}>{label}</span>
                                  <input style={inp} type="number" title={title} value={editForm[field] || ""} onChange={e => handleEditChange(field, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          : (!card.book_values_updated_at && !card.book_high && !card.book_mid && !card.book_low)
                            ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.95rem" }} title="Book values never entered">!</span>
                            : <>
                                {card.book_high && <span className="book-badge book-high" title="High (NM-MT+)">{card.book_high}</span>}
                                {card.book_high_mid && <span className="book-badge book-highmid" title="High Mid (NM)">{card.book_high_mid}</span>}
                                {card.book_mid && <span className="book-badge book-mid" title="Mid (EX)">{card.book_mid}</span>}
                                {card.book_low_mid && <span className="book-badge book-lowmid" title="Low Mid (VG)">{card.book_low_mid}</span>}
                                {card.book_low && <span className="book-badge book-low" title="Low (PR)">{card.book_low}</span>}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRefreshBook(card); }}
                                  title="Confirm book values are current (resets freshness timer)"
                                  style={{ background: "none", border: "none", cursor: "pointer",
                                           fontSize: "0.9rem", padding: "0 3px", color: "#0891b2",
                                           verticalAlign: "middle", lineHeight: 1 }}
                                >↻</button>
                              </>}
                      </td>

                      {/* Market Factor */}
                      <td className="market-col market-factor-col" style={{ textAlign: "center" }}>
                        {typeof card.market_factor === "number" ? (
                          (() => {
                            const f = card.market_factor;
                            let badgeClass = "badge-market-mid";
                            if (f >= 0.85) badgeClass = "badge-market-low";
                            else if (f <= 0.5) badgeClass = "badge-market-high";
                            return <span className={`badge-market ${badgeClass}`}>{f.toFixed(2)}</span>;
                          })()
                        ) : null}
                      </td>

                      {/* Card Value — color matches nearest book tier */}
                      <td className="value-col" style={{ textAlign: "center" }}>
                        {(() => {
                          const v = Math.round(Number(card.value) || 0);
                          const bH  = Number(card.book_high)     || null;
                          const bHM = Number(card.book_high_mid)  || null;
                          const bM  = Number(card.book_mid)       || null;
                          const bLM = Number(card.book_low_mid)   || null;
                          let valueClass = "book-low";
                          if (bH  && v > bH)  valueClass = "value-above-book";
                          else if (bH  && v >= bH)  valueClass = "book-high";
                          else if (bHM && v >= bHM) valueClass = "book-highmid";
                          else if (bM  && v >= bM)  valueClass = "book-mid";
                          else if (bLM && v >= bLM) valueClass = "book-lowmid";
                          return <span className={`badge badge-value ${valueClass}`}>{fmtDollar(v)}</span>;
                        })()}
                      </td>

                      {/* Card Image */}
                      <td className="image-col" style={{ textAlign: "center" }}>
                        {card.front_image ? (
                          <img
                            src={`http://host.docker.internal:8000${card.front_image}`}
                            alt="Front"
                            style={{ width: "50px", height: "auto", cursor: "pointer" }}
                            onClick={() => setSelectedCard(card)}
                          />
                        ) : (
                          <span style={{ color: "#aaa" }}>No Image</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditSave(card.id)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✓ Save</button>
                            <button
                              onClick={handleEditCancel}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handlePinRow(card.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: Number(card.id) === Number(pinnedRowId) ? 1 : 0.5,
                                color: Number(card.id) === Number(pinnedRowId) ? "#ff0000" : "inherit",
                                transform: Number(card.id) === Number(pinnedRowId) ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={Number(card.id) === Number(pinnedRowId) ? "Unpin row" : "Pin row"}
                            >📌</button>
                            <button
                              onClick={() => handleEditStart(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit"
                            >✏️</button>
                            <button
                              onClick={() => handleDuplicate(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#28a745", width: "auto" }}
                              title="Copy"
                            >📋</button>
                            <button
                              onClick={() => handlePrintLabel(card)}
                              disabled={labelLoading === card.id}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Print label"
                            >🖨️</button>
                            <button
                              onClick={() => navigate(`/card-detail/${card.id}`, { state: { cardIds: sortedCards.map(c => c.id) } })}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Card detail"
                            >ℹ️</button>
                            <button
                              onClick={() => handleDelete(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#dc3545", width: "auto" }}
                              title="Delete"
                            >✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

        </div>
      )}
      {selectedCard && (
        <CardImages card={selectedCard} onClose={() => { setSelectedCard(null); tableSectionRef.current?.focus(); }} />
      )}
      <LabelPreviewModal
        labelData={labelData}
        onPrint={() => window.open(`/card-label/${labelData?.id}`, "_blank")}
        onClose={() => { setLabelData(null); tableSectionRef.current?.focus(); }}
      />
    </div>
    {toast && (
      <div style={{
        position: "fixed", bottom: "1.5rem", left: "1.5rem",
        background: "#1a7a1a", color: "white", padding: "0.6rem 1.2rem",
        borderRadius: "8px", fontSize: "0.9rem", zIndex: 9999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>{toast}</div>
    )}
    {showSortModal && (
      <SortModal
        sortConfig={sortConfig}
        defaultSort={settings?.default_sort || []}
        onApply={(levels) => { clearPin(); clearCloneAnchor(); setSortConfig(levels); }}
        onClose={() => { setShowSortModal(false); tableSectionRef.current?.focus(); }}
      />
    )}
    </>
  );
}
