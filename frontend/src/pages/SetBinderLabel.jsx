// src/pages/SetBinderLabel.jsx — print label page for Sets/Binders (Avery 6427)
import React from "react";
import GenericItemLabel from "../components/GenericItemLabel";

export default function SetBinderLabel() {
  return (
    <GenericItemLabel endpoint="boxes" notFoundMsg="Set not found.">
      {(data) => (
        <div className="set-label-text">
          <span className="set-label-id">{data.label_id}</span>
          <span className="set-label-desc">{data.descriptor}</span>
          <span className="set-label-type">{data.set_type} · {data.created_at}</span>
          {data.notes && (
            <span className="set-label-notes">{data.notes}</span>
          )}
        </div>
      )}
    </GenericItemLabel>
  );
}
