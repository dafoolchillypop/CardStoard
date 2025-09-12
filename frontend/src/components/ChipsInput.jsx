import React, { useState } from "react";

export default function ChipsInput({ label, values, setValues, type = "text" }) {
  const [inputValue, setInputValue] = useState("");

  const addChip = () => {
    if (inputValue.trim() === "") return;
    if (type === "number" && isNaN(parseFloat(inputValue))) return;

    const newValue = type === "number" ? parseFloat(inputValue) : inputValue.trim();
    setValues([...values, newValue]);
    setInputValue("");
  };

  const removeChip = (index) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip();
    }
  };

  return (
    <div className="chips-input">
      <label>{label}</label>
      <div className="chips-container">
        {values.map((val, i) => (
          <span key={i} className="chip">
            {val}
            <button type="button" onClick={() => removeChip(i)}>×</button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Add ${label}`}
        />
      </div>
    </div>
  );
}
