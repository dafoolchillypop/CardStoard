// src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",  // 👈 point to FastAPI backend
  withCredentials: true,             // 👈 send cookies (access/refresh)
});

export default api;
