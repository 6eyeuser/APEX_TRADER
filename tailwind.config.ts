import type { Config } from "tailwindcss";

// Design tokens fixed by the project brief — do not rename without
// updating the color usage guide in README.md.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0B0E14",       // app background
        surface: "#131722",    // panel / card background
        panel: "#1E222D",      // borders & dividers
        bull: "#00C853",       // bullish / positive
        bear: "#FF3B30",       // bearish / negative
        ink: "#E7EAF1",        // primary text
        muted: "#7C8699",      // secondary text
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 26s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
