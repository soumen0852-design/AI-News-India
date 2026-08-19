const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "AI News India API is working"
  });
});

app.post("/assistant", (req, res) => {
  const question = req.body?.question || "";

  res.json({
    answer: `You asked: ${question}`
  });
});

module.exports = app;
