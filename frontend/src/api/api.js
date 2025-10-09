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

export default api;
