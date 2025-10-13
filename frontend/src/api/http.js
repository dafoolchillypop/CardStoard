// src/api/http.js
import http from "./http";
import { createBrowserHistory } from "history";
export const history = createBrowserHistory();

http.interceptors.response.use(
  r => r,
  err => {
    if (err?.response?.status === 401) {
      const target = window.location.pathname + window.location.search;
      const url = `/login?next=${encodeURIComponent(target)}`;
      window.location.assign(url);
    }
    return Promise.reject(err);
  }
);
