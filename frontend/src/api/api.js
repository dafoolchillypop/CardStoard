import axios from "axios";
import { logoutHandler } from "../utils/logoutHandler";

// Detect environment
const isLocal = window.location.hostname === "localhost";

// Dynamically choose baseURL
const baseURL =
  process.env.REACT_APP_API_BASE ||
  (isLocal
    ? "http://localhost:8000" // Local dev
    : "https://cardstoard.com/api"); // Production default

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// --- Token refresh state ---
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

const addSubscriber = (cb) => {
  refreshSubscribers.push(cb);
};

// --- Interceptor for automatic session refresh ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || "";
    const originalRequest = error.config;

    // Ignore login/register/verify 401s
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify");

    if (
      error.response &&
      error.response.status === 401 &&
      !isAuthRoute &&
      !originalRequest._retry
    ) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          addSubscriber(() => resolve(api(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔄 Access token expired — attempting refresh...");
        await api.post("/auth/refresh"); // refresh cookie
        isRefreshing = false;
        onRefreshed();
        return api(originalRequest); // retry
      } catch (refreshErr) {
        console.warn("⚠️ Refresh failed, logging out...");
        isRefreshing = false;
        logoutHandler();
        return Promise.reject(refreshErr);
      }
    }

    // For all other errors
    return Promise.reject(error);
  }
);

// 🔹 Smart Fill helper
export const smartFill = async (first, last, brand, year) => {
  try {
    const res = await api.get("/cards/smart-fill", {
      params: { first_name: first, last_name: last, brand, year },
    });
    return res.data;
  } catch (err) {
    console.error("Smart fill error:", err);
    return { status: "error", fields: {} };
  }
};

export default api;
