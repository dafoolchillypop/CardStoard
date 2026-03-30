// src/pages/WaxView.jsx — public wax box view for QR scan / deep link
import React from "react";
import GenericItemView from "../components/GenericItemView";

export default function WaxView() {
  return (
    <GenericItemView endpoint="wax" notFoundMsg="This wax box could not be found.">
      {(data) => (
        <>
          <h2 style={{ margin: "0 0 0.25rem" }}>{data.descriptor}</h2>

          <p style={{ margin: "0.25rem 0 1rem", color: "#555", fontSize: "0.95rem" }}>
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
      )}
    </GenericItemView>
  );
}
