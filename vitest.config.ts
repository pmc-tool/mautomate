import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/__tests__/setup.ts"],
    alias: {
      "wasp/server": path.resolve(__dirname, "src/__tests__/mocks/wasp-server.ts"),
      "wasp/server/operations": path.resolve(__dirname, "src/__tests__/mocks/wasp-server-operations.ts"),
      "wasp/client/operations": path.resolve(__dirname, "src/__tests__/mocks/wasp-client-operations.ts"),
      "wasp/auth": path.resolve(__dirname, "src/__tests__/mocks/wasp-auth.ts"),
    },
  },
});
