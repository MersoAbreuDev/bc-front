import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import only in dev using dynamic require inside plugin to avoid build resolution

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        "C:/Users/Emerson/Documents/branchit/BComandas/bc-front",
        "C:/Users/Emerson/Documents/branchit/BComandas/bc-front/client",
        "C:/Users/Emerson/Documents/branchit/BComandas/bc-front/shared",
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: command === "serve" ? [react(), expressDevPlugin()] : [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressDevPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Lazy import to avoid resolution during build
      import("./server/index.ts").then(({ createServer }) => {
        const app = createServer();
        server.middlewares.use(app);
      }).catch(() => {
        // Fallback: no-op if server code missing in dev container
      });
    },
  };
}
