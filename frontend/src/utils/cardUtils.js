// src/utils/cardUtils.js — shared card utility functions

export function handleNameKeyDown(e, field, names, card, setCard) {
  if (e.key !== "Enter" && e.key !== "Tab") return;
  const typed = (card[field] || "").trim().toLowerCase();
  if (!typed) return;
  const match = names.find(n => n.toLowerCase().startsWith(typed));
  if (match && match.toLowerCase() !== typed) {
    if (e.key === "Enter") e.preventDefault();
    setCard(prev => ({ ...prev, [field]: match }));
  }
}

export function calcCardValue(card, settings) {
  const isRookie =
    card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1 || card.rookie === true;

  const g = parseFloat(card.grade);
  let gradeClass = "grade-unknown";
  if (!Number.isNaN(g)) {
    if (g === 3) gradeClass = "grade-mt";
    else if (g === 1.5) gradeClass = "grade-ex";
    else if (g === 1) gradeClass = "grade-vg";
    else if (g === 0.8) gradeClass = "grade-gd";
    else if (g === 0.4) gradeClass = "grade-fr";
    else gradeClass = "grade-pr";
  }

  let cardValue = null;
  if (settings) {
    const books = [
      parseFloat(card.book_high) || 0,
      parseFloat(card.book_high_mid) || 0,
      parseFloat(card.book_mid) || 0,
      parseFloat(card.book_low_mid) || 0,
      parseFloat(card.book_low) || 0,
    ];
    const avgBook = books.reduce((a, b) => a + b, 0) / books.length;
    let factor = null;

    if (g === 3 && isRookie) factor = settings.auto_factor;
    else if (g === 3) factor = settings.mtgrade_factor;
    else if (isRookie) factor = settings.rookie_factor;
    else if (g === 1.5) factor = settings.exgrade_factor;
    else if (g === 1) factor = settings.vggrade_factor;
    else if (g === 0.8) factor = settings.gdgrade_factor;
    else if (g === 0.4) factor = settings.frgrade_factor;
    else if (g === 0.2) factor = settings.prgrade_factor;

    if (factor !== null) {
      cardValue = Math.round(avgBook * g * factor);
    }
  }

  let valueClass = "book-low";
  if (cardValue !== null) {
    if (cardValue >= 500) valueClass = "book-high";
    else if (cardValue >= 200) valueClass = "book-highmid";
    else if (cardValue >= 50) valueClass = "book-mid";
    else if (cardValue >= 10) valueClass = "book-lowmid";
  }

  return { isRookie, g, gradeClass, cardValue, valueClass };
}
