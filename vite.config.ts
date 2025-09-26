import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import only in dev using dynamic require inside plugin to avoid build resolution

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // lazy import to avoid resolution during build
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServer } = require("./server");
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
