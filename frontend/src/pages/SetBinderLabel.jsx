// src/pages/SetBinderLabel.jsx — print label page for Sets/Binders (Avery 6427)
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./SetLabel.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

export default function SetBinderLabel() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/boxes/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setTimeout(() => window.print(), 300);
      })
      .catch(() => setError("Set not found."));
  }, [id]);

  if (error) return <p className="set-label-error">{error}</p>;
  if (!data)  return <p className="set-label-loading">Loading...</p>;

  return (
    <>
      <div className="set-label-screen-hint">
        <p>
          Print dialog should open automatically. If not, press{" "}
          <strong>Ctrl+P</strong> / <strong>Cmd+P</strong>.
        </p>
      </div>
      <div className="set-label">
        <img
          className="set-label-qr"
          src={`data:image/png;base64,${data.qr_b64}`}
          alt="QR"
        />
        <div className="set-label-text">
          <span className="set-label-id">{data.label_id}</span>
          <span className="set-label-desc">{data.descriptor}</span>
          <span className="set-label-type">{data.set_type} · {data.created_at}</span>
        </div>
      </div>
    </>
  );
}
