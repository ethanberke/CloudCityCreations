import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

export default {
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: `http://server:5000`,
        changeOrigin: true,
      },
    },
  },
  cacheDir: "../node_modules/.vite",
};
