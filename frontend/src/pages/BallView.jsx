// src/pages/BallView.jsx — public auto ball view for QR scan / deep link
import React from "react";
import GenericItemView from "../components/GenericItemView";

export default function BallView() {
  return (
    <GenericItemView endpoint="balls" notFoundMsg="This ball could not be found.">
      {(data) => (
        <>
          <h2 style={{ margin: "0 0 0.25rem" }}>{data.name}</h2>

          <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
            <span
              style={{
                display: "inline-block",
                background: data.auth ? "#16a34a" : "#9ca3af",
                color: "#fff",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.85rem",
                marginRight: "0.5rem",
              }}
            >
              {data.auth ? "AUTH" : "UNAUTH"}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{data.label_id}</span>
          </p>

          {data.inscription && (
            <p style={{ fontSize: "0.95rem", color: "#444", margin: "0 0 0.5rem" }}>
              <em>{data.inscription}</em>
            </p>
          )}

          {(data.brand || data.commissioner) && (
            <p style={{ fontSize: "0.9rem", color: "#666", margin: "0 0 1rem" }}>
              {[data.brand, data.commissioner].filter(Boolean).join(" · ")}
            </p>
          )}

          {data.notes && (
            <p style={{ fontSize: "0.9rem", color: "#666", fontStyle: "italic", margin: "0 0 1rem" }}>
              {data.notes}
            </p>
          )}
        </>
      )}
    </GenericItemView>
  );
}
