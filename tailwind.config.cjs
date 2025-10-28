module.exports = {
  // Explicitly include your source files so Tailwind picks up class names in TSX
  content: ["./src/**/*.{ts,tsx,js,jsx,html}", "./**/*.{md,mdx,html}"],
  // Small safelist to ensure classes are emitted while verifying
  // safelist: ["text-xl", "mb-20"],
  // Scope all utilities under the .mondo container to avoid leaking styles
  important: ".mondo",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
