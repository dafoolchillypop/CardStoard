import React from "react";

const CardImages = ({ card, onClose }) => {
  const [showBack, setShowBack] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);

  if (!card) return null;

  const toggleImage = () => setShowBack((prev) => !prev);
  const toggleZoom = () => setZoomed((prev) => !prev);

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: zoomed ? "flex-start" : "center",
        alignItems: zoomed ? "flex-start" : "center",
        zIndex: 1000,
        overflow: "auto",
        padding: zoomed ? "1rem" : 0,
        boxSizing: "border-box",
      }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Image */}
      <img
        src={
          showBack
            ? card.back_image
            : card.front_image
        }
        alt={showBack ? "Back" : "Front"}
        style={{
          maxWidth: zoomed ? "none" : "80%",
          maxHeight: zoomed ? "none" : "80%",
          borderRadius: "8px",
          cursor: zoomed ? "zoom-out" : "zoom-in",
        }}
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom();
        }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleZoom(); } }}
      />

      {/* Fixed bottom toolbar — always visible regardless of scroll/zoom */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          padding: "0.75rem 1rem",
          background: "rgba(0, 0, 0, 0.55)",
          zIndex: 1001,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); toggleImage(); }}
          style={{ color: "#fff", textDecoration: "underline", fontSize: "18px", cursor: "pointer" }}
        >
          {showBack ? "Front" : "Back"}
        </a>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onClose(); }}
          style={{ color: "#fff", textDecoration: "underline", fontSize: "18px", cursor: "pointer" }}
        >
          Close
        </a>
      </div>
    </div>
  );
};

export default CardImages;
