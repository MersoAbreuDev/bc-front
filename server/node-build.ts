import express from "express";
import { createServer } from "./index";

const app = createServer?.() || express();

// Serve SPA build (dist/spa) quando em produção
app.use(express.static("dist/spa"));
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/dist/spa/index.html");
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
});


