/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          violet: "#7C3AED",
          pink: "#EC4899",
          ink: "#1E1B2E",
          mist: "#F7F6FB",
        },
        mint: "#10B981",
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
      },
    },
  },
  plugins: [],
};
