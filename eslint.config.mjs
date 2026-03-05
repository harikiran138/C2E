import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-page-custom-font": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    ignores: [
      "python-backend/**",
      "api/**",
      "**/__pycache__/**",
      "**/*.pyc"
    ],
  },
];

export default config;
