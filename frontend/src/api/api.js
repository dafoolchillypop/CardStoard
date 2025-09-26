// src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/",  // 👈 bypass CRA, talk directly
  withCredentials: true,
});

export default api;
