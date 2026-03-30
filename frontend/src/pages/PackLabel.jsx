// src/pages/PackLabel.jsx — print label page for Wax Packs (Avery 6427)
import React from "react";
import GenericItemLabel from "../components/GenericItemLabel";

export default function PackLabel() {
  return (
    <GenericItemLabel endpoint="packs" notFoundMsg="Pack not found.">
      {(data) => (
        <div className="set-label-text">
          <span className="set-label-id">{data.label_id}</span>
          <span className="set-label-desc">{data.descriptor}</span>
          {data.pack_type && (
            <span className="set-label-notes">
              {data.pack_type.charAt(0).toUpperCase() + data.pack_type.slice(1)} Pack
            </span>
          )}
          {data.notes && (
            <span className="set-label-notes">{data.notes}</span>
          )}
        </div>
      )}
    </GenericItemLabel>
  );
}
