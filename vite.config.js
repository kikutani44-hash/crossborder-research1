import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 開発時だけVPSのAPIを直接叩く。本番はVercelの api/accumulated-results.js が中継する。
      "/api/accumulated-results": {
        target: "http://163.44.112.38:3001",
        changeOrigin: true,
        rewrite: () => "/results",
      },
      "/api/rakuten": {
        target: "https://app.rakuten.co.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rakuten/, "/services/api"),
      },
      "/api/ebay": {
        target: "https://svcs.ebay.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ebay/, ""),
      },
      "/api/yahoo": {
        target: "https://shopping.yahooapis.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
      },
      "/api/yahooauction": {
        target: "https://auctions.yahooapis.jp",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahooauction/, ""),
      },
    },
  },
});
