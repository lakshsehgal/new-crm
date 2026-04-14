import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        surface: "#fafafa",
        border: "#ececec",
        ink: "#111827",
        muted: "#6b7280",
        accent: "#2563eb",
        accentSoft: "#eff6ff",
        success: "#059669",
        warn: "#d97706",
        danger: "#dc2626",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,0.04), 0 1px 1px rgba(17,24,39,0.03)",
        pop: "0 8px 24px rgba(17,24,39,0.08)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
