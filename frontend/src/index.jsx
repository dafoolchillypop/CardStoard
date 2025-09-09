import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

// Pages
import Home from "./pages/Home.jsx";
import AddCard from "./pages/AddCard.jsx";
import ListCards from "./pages/ListCards.jsx";
import UpdateCard from "./pages/UpdateCard.jsx";
import DeleteCard from "./pages/DeleteCard.jsx";

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
