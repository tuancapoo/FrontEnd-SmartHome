import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api được chuyển tiếp tới backend (mặc định http://localhost:5000, đổi bằng VITE_API_TARGET)
const target = process.env.VITE_API_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target, changeOrigin: true } } },
  preview: { port: 5173, proxy: { "/api": { target, changeOrigin: true } } },
});
