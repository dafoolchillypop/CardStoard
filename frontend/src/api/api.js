import axios from "axios";
import { logoutHandler } from "../utils/logoutHandler";

// Use env variable if available, fallback to localhost for dev
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:8000",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired, logging out...");
      logoutHandler(); // ensure session clears
    }
    return Promise.reject(error);
  }
);

export default api;
