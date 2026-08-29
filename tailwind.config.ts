import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color — dusty rose / mauve-taupe.
        // Refine from the supplied logo artwork before final implementation.
        rose: {
          DEFAULT: "#A98282",
          light: "#E6C8C8", // soft blush
        },
        cream: "#F8F4EF",
        brown: "#302827", // deep brown
        taupe: "#766866", // muted taupe
        sage: "#AEB9A6", // muted sage
      },
      fontFamily: {
        serif: ["var(--font-editorial)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
