import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import AddCard from "./pages/AddCard";
import ListCards from "./pages/ListCards";
import UpdateCard from "./pages/UpdateCard";
import DeleteCard from "./pages/DeleteCard";
import "./index.css";

// Import the background image
import bgImage from "./assets/baseball-bg.png";

// Apply background dynamically
document.body.style.background = `url(${bgImage}) no-repeat center center fixed`;
document.body.style.backgroundSize = "cover";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/add" element={<AddCard />} />
      <Route path="/list" element={<ListCards />} />
      <Route path="/update" element={<UpdateCard />} />
      <Route path="/delete" element={<DeleteCard />} />
    </Routes>
  </Router>
);
