// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import App from "./App";
import VerifySuccess from "./pages/VerifySuccess";
import VerifyError from "./pages/VerifyError";
import ResendVerify from "./pages/ResendVerify";
import AddCard from "./pages/AddCard";
import ListCards from "./pages/ListCards";
import ImportCards from "./pages/ImportCards";
import UpdateCard from "./pages/UpdateCard";
import DeleteCard from "./pages/DeleteCard";
import CardDetail from "./pages/CardDetail";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Register from "./pages/Register";
import Account from "./pages/Account";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import About from "./pages/About.jsx";
import ImportHelp from "./pages/ImportHelp.jsx";
import DictionaryList from "./pages/DictionaryList.jsx";
import DictionaryAdd from "./pages/DictionaryAdd.jsx";
import DictionaryEdit from "./pages/DictionaryEdit.jsx";
import DictionaryImport from "./pages/DictionaryImport.jsx";

import "./index.css";

function AppRouter() {
  const { isLoggedIn } = React.useContext(AuthContext);

  if (isLoggedIn === null) {
    return <p>Loading session...</p>; // avoid flicker until we know
  }

  return (
    <Routes>
      {/* Public only if not logged in */}
      {!isLoggedIn && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-success" element={<VerifySuccess />} />
          <Route path="/verify-error" element={<VerifyError />} />
          <Route path="/resend-verify" element={<ResendVerify />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}

      {/* Protected once logged in */}
      {isLoggedIn && (
        <>
          <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/about" element={<About />} />
          <Route path="/add-card" element={<ProtectedRoute><AddCard /></ProtectedRoute>} />
          <Route path="/list-cards" element={<ProtectedRoute><ListCards /></ProtectedRoute>} />
          <Route path="/update-card/:id" element={<ProtectedRoute><UpdateCard /></ProtectedRoute>} />
          <Route path="/delete-card/:id" element={<ProtectedRoute><DeleteCard /></ProtectedRoute>} />
          <Route path="/card-detail/:id" element={<ProtectedRoute><CardDetail /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/import-cards" element={<ProtectedRoute><ImportCards /></ProtectedRoute>} />
          <Route path="/import-help" element={<ProtectedRoute><ImportHelp /></ProtectedRoute>} />
          <Route path="/dictionary" element={<ProtectedRoute><DictionaryList /></ProtectedRoute>} />
          <Route path="/dictionary/add" element={<ProtectedRoute><DictionaryAdd /></ProtectedRoute>} />
          <Route path="/dictionary/edit/:id" element={<ProtectedRoute><DictionaryEdit /></ProtectedRoute>} />
          <Route path="/dictionary/import" element={<ProtectedRoute><DictionaryImport /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <Router>
      <AppRouter />
    </Router>
  </AuthProvider>
);
