import { createServer } from "./index";
import express from "express";
import path from "path";

const app = createServer();

const spaPath = path.resolve(process.cwd(), "dist/spa");
app.use(express.static(spaPath));

app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && req.method === "GET") {
    res.sendFile(path.join(spaPath, "index.html"));
  } else {
    next();
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] listening on :${port}`);
});
