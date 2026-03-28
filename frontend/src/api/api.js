/**
 * src/api/api.js
 * ---------------
 * Configured Axios instance used by all frontend API calls.
 *
 * Base URL:
 *   - Reads REACT_APP_API_BASE env var if set.
 *   - Otherwise: localhost → http://localhost:8000 (dev)
 *                production → https://cardstoard.com/api
 *
 * withCredentials: true  — sends HttpOnly JWT cookies on every request.
 *
 * Response interceptor — automatic token refresh on 401:
 *   1. Auth routes (/auth/login, /auth/register, /auth/verify, /auth/refresh) → reject immediately
 *      to avoid refresh loops.
 *   2. First non-auth 401 → mark isRefreshing=true, POST /auth/refresh, replay original request.
 *   3. Concurrent 401s during refresh → queued in refreshSubscribers[], replayed after refresh.
 *   4. Refresh failure → logoutHandler() (clears AuthContext state without circular import).
 *
 * Named exports:
 *   api (default)     — the Axios instance
 *   smartFill()       — GET /cards/smart-fill with player + brand + year params
 */
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
  refreshSubscribers.forEach((cb) => cb(null));
  refreshSubscribers = [];
};

const onRefreshFailed = (err) => {
  refreshSubscribers.forEach((cb) => cb(err));
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

    // Ignore 401s from auth endpoints — especially /auth/refresh to prevent deadlock
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify") ||
      url.includes("/auth/refresh");

    if (
      error.response &&
      error.response.status === 401 &&
      !isAuthRoute &&
      !originalRequest._retry
    ) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addSubscriber((err) => {
            if (err) return reject(err);
            resolve(api(originalRequest));
          });
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
        onRefreshFailed(refreshErr);
        logoutHandler();
        throw refreshErr;
      }
    }

    // For all other errors
    throw error;
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
