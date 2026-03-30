// src/pages/PackView.jsx — public wax pack view for QR scan / deep link
import React from "react";
import GenericItemView from "../components/GenericItemView";

const PACK_TYPE_COLORS = {
  cello:   { bg: "#1d4ed8", text: "#fff" },
  rack:    { bg: "#d97706", text: "#fff" },
  wax:     { bg: "#16a34a", text: "#fff" },
  blister: { bg: "#7c3aed", text: "#fff" },
};

export default function PackView() {
  return (
    <GenericItemView endpoint="packs" notFoundMsg="This pack could not be found.">
      {(data) => {
        const typeColors = data.pack_type
          ? PACK_TYPE_COLORS[data.pack_type.toLowerCase()] || { bg: "#6b7280", text: "#fff" }
          : null;
        return (
          <>
            <h2 style={{ margin: "0 0 0.25rem" }}>{data.descriptor}</h2>

            <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
              {data.pack_type && typeColors && (
                <span style={{
                  display: "inline-block",
                  background: typeColors.bg,
                  color: typeColors.text,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: "0.85rem",
                  marginRight: "0.5rem",
                  textTransform: "capitalize",
                }}>
                  {data.pack_type}
                </span>
              )}
              <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{data.label_id}</span>
            </p>

            {data.quantity && data.quantity > 1 && (
              <p style={{ fontSize: "0.95rem", color: "#444", margin: "0 0 0.5rem" }}>
                Qty: {data.quantity}
              </p>
            )}

            {data.notes && (
              <p style={{ fontSize: "0.9rem", color: "#666", fontStyle: "italic", margin: "0 0 1rem" }}>
                {data.notes}
              </p>
            )}
          </>
        );
      }}
    </GenericItemView>
  );
}
