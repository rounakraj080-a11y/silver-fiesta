/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        discord: {
          darkest: "#1e1f22",
          dark: "#2b2d31",
          mid: "#313338",
          light: "#383a40",
          lighter: "#404249",
          text: "#dbdee1",
          muted: "#949ba4",
          blurple: "#5865f2",
          green: "#23a55a",
          red: "#f23f42",
        },
      },
    },
  },
  plugins: [],
};
