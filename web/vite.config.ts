import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
