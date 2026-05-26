import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Don't let the SPA navigation fallback swallow Azure SWA auth routes.
        // Without this, navigating to /.auth/login/github or /.auth/me serves
        // the cached index.html, so login silently never happens.
        navigateFallbackDenylist: [/^\/\.auth\//, /^\/login$/, /^\/logout$/, /^\/api\//],
      },
      manifest: {
        name: "Tudo Bem",
        short_name: "TudoBem",
        description: "European Portuguese travel-prep tutor",
        theme_color: "#0e7c66",
        background_color: "#0b1f1a",
        display: "standalone",
        start_url: "/#/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:7071",
    },
  },
});
