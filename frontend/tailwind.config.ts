import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Lickfun.xyz design tokens — extracted from Figma.
 * Every value below was pulled from the Figma MCP for the Lickfun.xyz design
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
        /* ── Purple degen surfaces ── */
        "figma-bg":       "#0B0613",
        "figma-surface":  "#150B26",
        "figma-card":     "#130A22",
        "figma-card-alt": "#1E1236",

        /* ── White card (kept for high-contrast surfaces) ── */
        "figma-white-card": "#FFFFFF",

        /* ── Text ── */
        "figma-white":   "#FFFFFF",
        "figma-card-fg": "#0B0613",
        "figma-muted":   "rgba(214, 199, 240, 0.55)",

        /* ── Brand accent = electric purple (primary CTA / highlights) ── */
        "figma-purple":      "#8B3DFF",
        "figma-purple-soft": "#B57BFF",
        "figma-purple-deep": "#6D28D9",

        /* ── Buy / positive (lime) & sell / negative (red) semantics ── */
        "figma-green":       "#7CEF3A",
        "figma-green-soft":  "#9EF01A",
        "figma-chart-green": "#3BD671",
        "figma-red":         "#FF3B4E",
        "figma-red-soft":    "#FF5A6A",

        /* ── Background fallbacks for legacy shadcn-style components ── */
        background:  "#0B0613",
        foreground:  "#FFFFFF",
        card: {
          DEFAULT: "#130A22",
          foreground: "#FFFFFF",
        },
        border: "#271641",
        input:  "#1E1236",
        ring:   "#8B3DFF",
      },
      borderRadius: {
        card:   "12px",
        pill:   "8px",
        panel:  "23px",
      },
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
        sora:    ["var(--font-sora)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sora)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-purple":    "0 0 0 1px rgba(139,61,255,0.35), 0 8px 40px -8px rgba(139,61,255,0.55)",
        "glow-purple-sm": "0 0 24px -6px rgba(139,61,255,0.55)",
        "glow-green":     "0 0 24px -6px rgba(124,239,58,0.55)",
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
        "float": {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%,100%": { opacity: "0.6" },
          "50%":     { opacity: "1" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.2s ease-out",
        "slide-up":   "slide-up 0.25s ease-out",
        "float":      "float 5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
