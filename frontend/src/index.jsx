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
import Register from "./pages/Register";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<App />} />

        {/* Protected */}

        {/* ✅ Card management */}
        <Route path="/add-card" element={<ProtectedRoute><AddCard /></ProtectedRoute>} />
        <Route path="/list-cards" element={<ProtectedRoute><ListCards /></ProtectedRoute>} />
        <Route path="/update-card/:id" element={<ProtectedRoute><UpdateCard /></ProtectedRoute>} />
        <Route path="/delete-card/:id" element={<ProtectedRoute><DeleteCard /></ProtectedRoute>} />
        <Route path="/card-detail/:id" element={<ProtectedRoute><CardDetail /></ProtectedRoute>} />

        {/* ✅ Admin settings */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

        {/* ✅ Import Cards */}
        <Route path="/import-cards" element={<ProtectedRoute><ImportCards /></ProtectedRoute>} />
      </Routes>
    </Router>
  </AuthProvider>
);
