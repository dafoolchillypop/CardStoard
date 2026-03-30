// src/pages/SetBinderView.jsx — public set/binder view for QR scan / deep link
import React from "react";
import GenericItemView from "../components/GenericItemView";

const TYPE_COLORS = { Factory: "#1976d2", Collated: "#d97706", Binder: "#16a34a" };

export default function SetBinderView() {
  return (
    <GenericItemView endpoint="boxes" notFoundMsg="This set could not be found.">
      {(data) => (
        <>
          <h2 style={{ margin: "0 0 0.25rem" }}>
            {data.brand} {data.year}
          </h2>
          {data.name && (
            <h3 style={{ margin: "0 0 0.5rem", fontWeight: 400 }}>{data.name}</h3>
          )}

          <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
            <span
              style={{
                display: "inline-block",
                background: TYPE_COLORS[data.set_type] || "#555",
                color: "#fff",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.85rem",
                marginRight: "0.5rem",
              }}
            >
              {data.set_type}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{data.label_id}</span>
          </p>

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
