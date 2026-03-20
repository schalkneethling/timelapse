import { defineConfig } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "There is still time",
        short_name: "Still time",
        description:
          "See how much of the day, week, month, quarter, and year has elapsed — with configurable widgets and time zones.",
        theme_color: "#0b1020",
        background_color: "#05060a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  lint: { options: { typeAware: true, typeCheck: true } },
});
