import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5175",
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
