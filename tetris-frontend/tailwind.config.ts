import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        eink: {
          background: "#F5F4E8", // E-ink display background (yellowish-green, like early Kindle)
          backgroundAlt: "#E8E6D9", // Slightly darker for contrast
          text: "#000000",
          textSecondary: "#1A1A1A",
          textDisabled: "#999999",
          border: "#D0CEC0", // Softer border for e-ink feel
          borderDark: "#333333",
          accent: "#000000",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "'Consolas'", "monospace"],
        pixel: ["'Press Start 2P'", "monospace"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      borderWidth: {
        thin: "1px",
        medium: "2px",
        "3": "3px",
        "4": "4px",
      },
    },
  },
  plugins: [],
} satisfies Config;

