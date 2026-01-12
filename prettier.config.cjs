module.exports = {
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "^react",
    "^@mui/(.*)$",
    "^@/components/(.*)$",
    "^@/utils/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,

  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
};
