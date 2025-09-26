import { createServer } from "./index";
import express from "express";

const app = createServer();

app.use(express.static("dist/spa"));
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/dist/spa/index.html");
});

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  console.log(`[server] listening on :${port}`);
});
