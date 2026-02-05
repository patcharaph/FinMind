/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d13",
        night: "#101018",
        haze: "#cbd5ff",
        ember: "#ff7a59",
        lime: "#b6ff6a",
        aqua: "#6ae4ff",
        sun: "#ffd36a"
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 30px rgba(106, 228, 255, 0.25)",
        ember: "0 0 25px rgba(255, 122, 89, 0.35)"
      }
    }
  },
  plugins: []
};
