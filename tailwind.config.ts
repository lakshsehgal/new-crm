import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Light content palette
        bg: "#ffffff",
        surface: "#f7f8fa",
        border: "#e6e8ec",
        ink: "#0f1419",
        muted: "#6b7280",
        mutedSoft: "#9ca3af",
        accent: "#2563eb",
        accentSoft: "#eff6ff",
        success: "#059669",
        warn: "#d97706",
        danger: "#dc2626",

        // Dark sidebar palette (Close-style)
        sidebar: {
          bg: "#0a0b0d",
          surface: "#131417",
          border: "#1f2126",
          ink: "#e7e8ea",
          muted: "#7c7f87",
          mutedSoft: "#5a5c63",
          accent: "#3b82f6",
          hover: "#17181c",
          active: "#23252b",
          green: "#4ade80",
        },

        // Stage badges
        stage: {
          yellow: "#f3c94c",
          orange: "#f59e0b",
          amber: "#fb923c",
          blue: "#60a5fa",
          purple: "#a78bfa",
          rose: "#fb7185",
          teal: "#2dd4bf",
          emerald: "#34d399",
          red: "#f87171",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,20,25,0.04), 0 1px 1px rgba(15,20,25,0.03)",
        cardHover: "0 4px 12px rgba(15,20,25,0.08)",
        pop: "0 8px 24px rgba(15,20,25,0.12)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      fontSize: {
        "2xs": ["0.6875rem", "0.9rem"],
      },
    },
  },
  plugins: [],
} satisfies Config;
