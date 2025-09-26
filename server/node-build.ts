import { createServer } from "./index";
import express from "express";
import path from "path";

const app = createServer?.() || express();

app.use(express.static(path.resolve("dist/spa")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve("dist/spa/index.html"));
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] listening on :${port}`);
});
