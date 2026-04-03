// src/setupProxy.js
// Explicitly proxy /static/cards/ to the backend so CRA's dev server
// doesn't intercept it (CRA claims /static/ for its own webpack assets).
const { createProxyMiddleware } = require("http-proxy-middleware");

// In Docker dev, the backend is reachable by its service name on the internal network.
// "localhost:8000" would refer to the frontend container itself — use "backend:8000" instead.
module.exports = function (app) {
  app.use(
    "/static/cards",
    createProxyMiddleware({
      target: "http://backend:8000",
      changeOrigin: true,
    })
  );
};
