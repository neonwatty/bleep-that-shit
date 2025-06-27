import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/javascript/**/*.test.js"],
    setupFiles: ["test/javascript/setup.js"],
  },
});
