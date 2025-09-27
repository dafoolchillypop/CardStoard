import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import App from "./App";
import AddCard from "./pages/AddCard";
import ListCards from "./pages/ListCards";
import ImportCards from "./pages/ImportCards";
import UpdateCard from "./pages/UpdateCard";
import DeleteCard from "./pages/DeleteCard";
import CardDetail from "./pages/CardDetail";
import Admin from "./pages/Admin";

import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Router>
    <Routes>
      {/* ✅ Home */}
      <Route path="/" element={<App />} />

      {/* ✅ Card management */}
      <Route path="/add-card" element={<AddCard />} />
      <Route path="/list-cards" element={<ListCards />} />
      <Route path="/update-card/:id" element={<UpdateCard />} />
      <Route path="/delete-card/:id" element={<DeleteCard />} />
      <Route path="/card-detail/:id" element={<CardDetail />} />

      {/* ✅ Admin settings */}
      <Route path="/admin" element={<Admin />} />

      {/* ✅ Import Cards */}
      <Route path="/import-cards" element={<ImportCards />} />

    </Routes>
  </Router>
);
