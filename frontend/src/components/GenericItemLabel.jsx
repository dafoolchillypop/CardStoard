// src/components/GenericItemLabel.jsx — shared label page scaffold (Avery 6427)
// Also exports useLabelLoader hook for detail pages (CardDetail, SetBinderDetail)
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import "../pages/SetLabel.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://cardstoard.com/api");

export function useLabelLoader(endpoint, id) {
  const [labelData, setLabelData] = useState(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const handlePrintLabel = () => {
    setLabelLoading(true);
    api.get(`/${endpoint}/${id}/public`)
      .then((res) => setLabelData(res.data))
      .catch((err) => console.error("Label fetch error:", err))
      .finally(() => setLabelLoading(false));
  };
  return { labelData, setLabelData, labelLoading, handlePrintLabel };
}

export default function GenericItemLabel({ endpoint, notFoundMsg, children }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/${endpoint}/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setTimeout(() => window.print(), 300);
      })
      .catch(() => setError(notFoundMsg));
  }, [id, endpoint, notFoundMsg]);

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
        {children(data)}
      </div>
    </>
  );
}
