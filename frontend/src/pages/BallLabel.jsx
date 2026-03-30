// src/pages/BallLabel.jsx — print label page for Auto Balls (Avery 6427)
import React from "react";
import GenericItemLabel from "../components/GenericItemLabel";

export default function BallLabel() {
  return (
    <GenericItemLabel endpoint="balls" notFoundMsg="Ball not found.">
      {(data) => (
        <div className="set-label-text">
          <span className="set-label-id">{data.label_id}</span>
          <span className="set-label-desc">{data.name}</span>
          {data.inscription && (
            <span className="set-label-notes">{data.inscription}</span>
          )}
        </div>
      )}
    </GenericItemLabel>
  );
}
