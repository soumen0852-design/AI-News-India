const express = require("express");
const Parser = require("rss-parser");

const app = express();
const parser = new Parser();

app.use(express.json());

const RSS_FEEDS = [
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
    const category = req.query.category || "All";
    const search = (req.query.q || "").toLowerCase().trim();

    let allNews = [];

    for (const feedUrl of RSS_FEEDS) {
      try {
        const feed = await parser.parseURL(feedUrl);

        const stories = (feed.items || []).map(item => ({
          title: item.title || "Untitled",
          description: item.contentSnippet || item.content || "",
          link: item.link || "#",
          pubDate: item.pubDate || item.isoDate || "",
          source: feed.title || "News"
        }));

        allNews.push(...stories);
      } catch (error) {
        console.error("RSS error:", error.message);
      }
    }

    if (search) {
      allNews = allNews.filter(item =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(search)
      );
    }

    const uniqueNews = [];
    const seen = new Set();

    for (const item of allNews) {
      if (!seen.has(item.title)) {
        seen.add(item.title);
        uniqueNews.push(item);
      }
    }

    res.json({
      success: true,
      items: uniqueNews.slice(0, 50),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("News API error:", error);

    res.status(500).json({
      success: false,
      items: [],
      error: "News loading failed"
    });
  }
});

app.post("/api/assistant", async (req, res) => {
  const question = String(req.body?.question || "").trim();

  if (!question) {
    return res.status(400).json({
      error: "Question is required"
    });
  }

  res.json({
    answer:
      "AI Assistant is connected. Your question was: " + question
  });
});

module.exports = app;
