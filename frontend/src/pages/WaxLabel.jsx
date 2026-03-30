// src/pages/WaxLabel.jsx — print label page for Wax Boxes (Avery 6427)
import React from "react";
import GenericItemLabel from "../components/GenericItemLabel";

export default function WaxLabel() {
  return (
    <GenericItemLabel endpoint="wax" notFoundMsg="Wax box not found.">
      {(data) => (
        <div className="set-label-text">
          <span className="set-label-id">{data.label_id}</span>
          <span className="set-label-desc">{data.descriptor}</span>
          {data.notes && (
            <span className="set-label-notes">{data.notes}</span>
          )}
        </div>
      )}
    </GenericItemLabel>
  );
}
