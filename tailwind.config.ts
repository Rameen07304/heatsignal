import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(0 0% 100%)" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
        elevated: "hsl(var(--elevated))",
        popover: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
      },
      borderRadius: { lg: "0.5rem", md: "0.375rem", sm: "0.25rem" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      keyframes: {
        "page-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "risk-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--glow, transparent)" },
          "50%": { boxShadow: "0 0 14px 2px var(--glow, transparent)" },
        },
      },
      animation: {
        "page-in": "page-in 0.35s ease-out both",
        "risk-pulse": "risk-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
