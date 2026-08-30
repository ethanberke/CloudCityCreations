import react from "@vitejs/plugin-react-swc";

// No dotenv here on purpose. This config reads no process.env at all, and the
// call it used to make loaded the repo-root .env — a file that held a GitHub PAT
// — into the build process (#27). Vite loads client/.env itself and inlines only
// VITE_-prefixed vars into the bundle.
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
