import axios from "axios";
import { logoutHandler } from "../utils/logoutHandler";

// Detect environment
const isLocal = window.location.hostname === "localhost";

// Dynamically choose baseURL
const baseURL = process.env.REACT_APP_API_BASE 
  || (isLocal 
        ? "http://localhost:8000"       // Local dev
        : "https://cardstoard.com/api"  // Production default
     );

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired, logging out...");
      logoutHandler();
    }
    return Promise.reject(error);
  }
);

// 🔹 Smart Fill helper
export const smartFill = async (first, last, brand, year) => {
  try {
    const res = await api.get("/cards/smart-fill", {
      params: { first_name: first, last_name: last, brand, year }
    });
    return res.data;
  } catch (err) {
    console.error("Smart fill error:", err);
    return { status: "error", fields: {} };
  }
};

export default api;
