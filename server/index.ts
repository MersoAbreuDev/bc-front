import express from "express";

export function createServer() {
  const app = express();

  app.get("/api/ping", (req, res) => res.send("pong"));

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  return app;
}
