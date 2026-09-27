import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit tests run without the Cloudflare and React plugins.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
