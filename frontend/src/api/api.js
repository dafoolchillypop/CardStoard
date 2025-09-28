// src/api/api.js
import axios from "axios";
import { logoutHandler } from "../utils/logoutHandler";

const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired, logging out...");
      logoutHandler("Session expired, please log in again.");
    }
    return Promise.reject(error);
  }
);

export default api;
