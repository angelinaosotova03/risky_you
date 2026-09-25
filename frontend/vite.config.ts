import { defineConfig } from "vite";

// В разработке запросы /api проксируются на локальный uvicorn
export default defineConfig({
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
});
