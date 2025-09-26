import express from "express";

export function createServer() {
  const app = express();
  app.get("/api/ping", (req, res) => res.send("pong"));
  return app;
}
