import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(20 15% 4%)",
        foreground: "hsl(30 20% 90%)",
        card: {
          DEFAULT: "hsl(20 15% 8%)",
          foreground: "hsl(30 20% 90%)",
        },
        popover: {
          DEFAULT: "hsl(20 15% 8%)",
          foreground: "hsl(30 20% 90%)",
        },
        primary: {
          DEFAULT: "hsl(25 95% 55%)",
          foreground: "hsl(0 0% 5%)",
        },
        secondary: {
          DEFAULT: "hsl(20 15% 14%)",
          foreground: "hsl(30 20% 85%)",
        },
        muted: {
          DEFAULT: "hsl(20 15% 14%)",
          foreground: "hsl(30 10% 50%)",
        },
        accent: {
          DEFAULT: "hsl(25 70% 45%)",
          foreground: "hsl(0 0% 5%)",
        },
        destructive: {
          DEFAULT: "hsl(0 62% 40%)",
          foreground: "hsl(0 0% 98%)",
        },
        border: "hsl(20 15% 18%)",
        input: "hsl(20 15% 18%)",
        ring: "hsl(25 95% 55%)",
        // Lick.fun brand colors
        lick: {
          orange: "hsl(25 95% 55%)",
          "orange-light": "hsl(25 95% 65%)",
          "orange-dark": "hsl(25 95% 40%)",
          charcoal: "hsl(20 15% 8%)",
          deep: "hsl(20 15% 4%)",
          surface: "hsl(20 15% 12%)",
          muted: "hsl(20 10% 40%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "pulse-lick": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "pulse-lick": "pulse-lick 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;