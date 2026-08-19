const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "AI News India API is working!"
  });
});

app.get("/api/news", (req, res) => {
  res.json({
    items: [],
    updatedAt: new Date().toISOString()
  });
});

app.post("/api/assistant", (req, res) => {
  res.json({
    answer: "AI Assistant API is connected successfully."
  });
});

module.exports = app;
