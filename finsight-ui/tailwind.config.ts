import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light surfaces (mist/slate blue) — token names kept for stability
        cream: {
          DEFAULT: "#F1F5FB",
          card: "#FFFFFF",
          soft: "#E5EDF7",
          input: "#F4F8FD",
        },
        // Text
        ink: {
          primary: "#0F1B2D",
          secondary: "#475569",
          tertiary: "#8B97AB",
        },
        // Brand (blue)
        forest: {
          primary: "#2563EB",
          soft: "#60A5FA",
          mint: "#DBEAFE",
          pale: "#EFF6FF",
          deep: "#1D4ED8",
        },
        // Warm accents (warnings / errors / amber)
        warm: {
          amber: "#F59E0B",
          coral: "#EF6961",
          rose: "#E14F4F",
        },
        // Borders / dividers
        line: {
          soft: "#DBE3EE",
          medium: "#BCC6D6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 27, 45, 0.05)",
        "card-hover": "0 10px 30px rgba(37, 99, 235, 0.12)",
        glow: "0 0 0 4px rgba(37, 99, 235, 0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #2563EB 0%, #4F8DF7 50%, #60A5FA 100%)",
        "soft-gradient":
          "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 25px) scale(0.97)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "live-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(37, 99, 235, 0.55)" },
          "100%": { boxShadow: "0 0 0 8px rgba(37, 99, 235, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms ease-out",
        "slide-up": "slide-up 300ms ease-out",
        float: "float 18s ease-in-out infinite",
        "float-slow": "float 28s ease-in-out infinite",
        "live-pulse": "live-pulse 2s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
