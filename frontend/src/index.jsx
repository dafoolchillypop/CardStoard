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
import CardView from "./pages/CardView.jsx";
import CardLabel from "./pages/CardLabel.jsx";
import BatchLabels from "./pages/BatchLabels.jsx";
import DictionaryList from "./pages/DictionaryList.jsx";
import DictionaryAdd from "./pages/DictionaryAdd.jsx";
import DictionaryEdit from "./pages/DictionaryEdit.jsx";
import DictionaryImport from "./pages/DictionaryImport.jsx";
import DictionaryValueImport from "./pages/DictionaryValueImport.jsx";
import SetsPage from "./pages/SetsPage.jsx";
import SetDetail from "./pages/SetDetail.jsx";
import SetImport from "./pages/SetImport.jsx";
import ListBoxes from "./pages/ListBoxes.jsx";
import AddBox from "./pages/AddBox.jsx";
import SetBinderDetail from "./pages/SetBinderDetail.jsx";
import SetBinderView from "./pages/SetBinderView.jsx";
import SetBinderLabel from "./pages/SetBinderLabel.jsx";
import ListBalls from "./pages/ListBalls.jsx";
import BallLabel from "./pages/BallLabel.jsx";
import BallView from "./pages/BallView.jsx";
import UserGuide from "./pages/UserGuide.jsx";

import "./index.css";

function AppRouter() {
  const { isLoggedIn } = React.useContext(AuthContext);

  if (isLoggedIn === null) {
    return <p>Loading session...</p>; // avoid flicker until we know
  }

  return (
    <Routes>
      {/* Always public — accessible regardless of login state */}
      <Route path="/card-view/:id" element={<CardView />} />
      <Route path="/card-label/:id" element={<CardLabel />} />
      <Route path="/set-view/:id" element={<SetBinderView />} />
      <Route path="/set-label/:id" element={<SetBinderLabel />} />
      <Route path="/ball-view/:id" element={<BallView />} />
      <Route path="/ball-label/:id" element={<BallLabel />} />

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
          <Route path="/dictionary/import-values" element={<ProtectedRoute><DictionaryValueImport /></ProtectedRoute>} />
          <Route path="/sets" element={<ProtectedRoute><SetsPage /></ProtectedRoute>} />
          <Route path="/sets/import" element={<ProtectedRoute><SetImport /></ProtectedRoute>} />
          <Route path="/sets/:setId" element={<ProtectedRoute><SetDetail /></ProtectedRoute>} />
          <Route path="/boxes" element={<ProtectedRoute><ListBoxes /></ProtectedRoute>} />
          <Route path="/add-box" element={<ProtectedRoute><AddBox /></ProtectedRoute>} />
          <Route path="/balls" element={<ProtectedRoute><ListBalls /></ProtectedRoute>} />
          <Route path="/set-detail/:id" element={<ProtectedRoute><SetBinderDetail /></ProtectedRoute>} />
          <Route path="/batch-labels" element={<ProtectedRoute><BatchLabels /></ProtectedRoute>} />
          <Route path="/user-guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />
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
