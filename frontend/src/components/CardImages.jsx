import React from "react";

const CardImages = ({ card, onClose }) => {
  if (!card) return null;

  const [showBack, setShowBack] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);

  const toggleImage = () => setShowBack((prev) => !prev);
  const toggleZoom = () => setZoomed((prev) => !prev);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        overflow: "auto", // allow scrolling when zoomed
      }}
      onClick={onClose}
    >
      {/* Image */}
      <img
        src={
          showBack
            ? `http://host.docker.internal:8000${card.back_image}`
            : `http://host.docker.internal:8000${card.front_image}`
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
          toggleZoom(); // click toggles zoom
        }}
      />

      {/* Links */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "30px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            toggleImage();
          }}
          style={{
            color: "#fff",
            textDecoration: "underline",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          {showBack ? "Front" : "Back"}
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{
            color: "#fff",
            textDecoration: "underline",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Close
        </a>
      </div>
    </div>
  );
};

export default CardImages;
