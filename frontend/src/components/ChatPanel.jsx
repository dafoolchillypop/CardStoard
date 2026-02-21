import React, { useState, useRef, useEffect } from "react";
import api from "../api/api";
import "./ChatPanel.css";

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything about your card collection." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const updatedMessages = [...messages, { role: "user", text }];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      const history = updatedMessages.slice(0, -1); // all but the current message
      const res = await api.post("/chat/", { message: text, history });
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.response }]);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Unknown error";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <span>CardStoard Assistant</span>
        <button className="chat-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant">...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your collection..."
        />
        <button className="chat-send-btn" onClick={send} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
