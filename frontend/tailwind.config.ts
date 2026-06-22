import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Lick.fun design tokens — extracted from Figma.
 * Every value below was pulled from the Figma MCP for the Lick.fun design
 * (file key CU3oZmvNUl8b722gjtQvNa — "Memecoin Launchpad Community").
 * Components should reference these semantic tokens, never hardcoded hex.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Figma-sourced surfaces ── */
        "figma-bg":       "#0E0E0E",
        "figma-surface":  "#1B1B1B",
        "figma-card":     "#000000",
        "figma-card-alt": "#1B1B1B",

        /* ── Figma-sourced white card ── */
        "figma-white-card": "#FFFFFF",

        /* ── Figma-sourced text ── */
        "figma-white":   "#FFFFFF",
        "figma-card-fg": "#0E0E0E",
        "figma-muted":   "rgba(255, 255, 255, 0.5)",

        /* ── Figma-sourced accents ── */
        "figma-green":       "#70E000",
        "figma-green-soft":  "#9EF01A",
        "figma-chart-green": "#2CC054",
        "figma-purple":      "#6E44D2",
        "figma-purple-soft": "#9B6FFF",
        "figma-red":         "#E00004",
        "figma-red-soft":    "#F01A1E",

        /* ── Background fallbacks for legacy shadcn-style components ── */
        background:  "#0E0E0E",
        foreground:  "#FFFFFF",
        card: {
          DEFAULT: "#1B1B1B",
          foreground: "#FFFFFF",
        },
        border: "#1B1B1B",
        input:  "#1B1B1B",
        ring:   "#70E000",
      },
      borderRadius: {
        card:   "12px",
        pill:   "8px",
        panel:  "23px",
      },
      fontFamily: {
        sans:  ["var(--font-sans)", "system-ui", "sans-serif"],
        mono:  ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        /* Figma-sourced text sizes (used across the design) */
        "figma-xs":  ["10px", { lineHeight: "1.3" }],
        "figma-sm":  ["12px", { lineHeight: "1.3" }],
        "figma-md":  ["14px", { lineHeight: "1.4" }],
        "figma-lg":  ["16px", { lineHeight: "1.4" }],
        "figma-xl":  ["20px", { lineHeight: "1.3" }],
        "figma-2xl": ["24px", { lineHeight: "1.25" }],
        "figma-3xl": ["28px", { lineHeight: "1.2" }],
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
      animation: {
        "fade-in":   "fade-in 0.2s ease-out",
        "slide-up":  "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;