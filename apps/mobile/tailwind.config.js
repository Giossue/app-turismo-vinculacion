/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { brand: { 50: "#edfdf5", 700: "#047857", 900: "#064e3b" } },
    },
  },
  plugins: [],
};
