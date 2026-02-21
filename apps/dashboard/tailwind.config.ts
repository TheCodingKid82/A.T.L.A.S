import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          accent: "#6366f1",
          "accent-hover": "#818cf8",
          text: "#e2e8f0",
          "text-muted": "#94a3b8",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          critical: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
