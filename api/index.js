import express from "express";
import Parser from "rss-parser";

const app = express();
const parser = new Parser();

app.use(express.json());

const feeds = [
  "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
  "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml"
];

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "AI News India API is working!"
  });
});

app.get("/api/news", async (req, res) => {
  try {
    let news = [];

    for (const url of feeds) {
      try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items || []) {
          news.push({
            title: item.title || "Untitled",
            description: item.contentSnippet || "",
            link: item.link || "#",
            pubDate: item.pubDate || item.isoDate || "",
            source: feed.title || "News"
          });
        }
      } catch (e) {
        console.log("RSS error:", e.message);
      }
    }

    const seen = new Set();

    news = news.filter(item => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    });

    res.json({
      success: true,
      items: news.slice(0, 50),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      items: [],
      error: "News loading failed"
    });
  }
});

app.post("/api/assistant", (req, res) => {
  const question = String(req.body?.question || "").trim();

  res.json({
    answer: question
      ? `You asked: ${question}`
      : "Please enter a question."
  });
});

export default app;
