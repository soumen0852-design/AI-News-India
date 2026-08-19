import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parser = new Parser({ timeout: 10000 });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.static("public"));

const FEEDS = [
  {
    category: "India",
    name: "Google News India",
    url: "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
  },
  {
    category: "World",
    name: "Google News World",
    url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
  },
  {
    category: "Technology",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/"
  },
  {
    category: "AI",
    name: "Google AI",
    url: "https://blog.google/technology/ai/rss/"
  },
  {
    category: "Science",
    name: "ScienceDaily",
    url: "https://www.sciencedaily.com/rss/top/science.xml"
  }
];

let newsCache = [];
let lastUpdate = 0;

function cleanText(text = "") {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getNews() {
  const now = Date.now();

  // Refresh every 15 minutes when the app receives traffic
  if (newsCache.length && now - lastUpdate < 15 * 60 * 1000) {
    return newsCache;
  }

  const results = await Promise.allSettled(
    FEEDS.map(async feed => {
      const data = await parser.parseURL(feed.url);

      return data.items.slice(0, 20).map(item => ({
        title: cleanText(item.title),
        description: cleanText(
          item.contentSnippet || item.content || ""
        ),
        link: item.link,
        source: feed.name,
        category: feed.category,
        publishedAt:
          item.isoDate ||
          item.pubDate ||
          new Date().toISOString()
      }));
    })
  );

  const items = results
    .filter(x => x.status === "fulfilled")
    .flatMap(x => x.value)
    .sort(
      (a, b) =>
        new Date(b.publishedAt) -
        new Date(a.publishedAt)
    );

  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const key = item.title.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  newsCache = unique;
  lastUpdate = now;

  return newsCache;
}


// News API
app.get("/api/news", async (req, res) => {
  try {
    const category = req.query.category || "All";
    const search = (req.query.q || "").toLowerCase();

    let news = await getNews();

    if (category !== "All") {
      news = news.filter(
        item => item.category === category
      );
    }

    if (search) {
      news = news.filter(item =>
        `${item.title} ${item.description} ${item.source}`
          .toLowerCase()
          .includes(search)
      );
    }

    res.json({
      success: true,
      updatedAt: new Date(lastUpdate).toISOString(),
      count: news.length,
      items: news.slice(0, 80)
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Unable to load news"
    });
  }
});


// Manual refresh
app.post("/api/refresh", async (req, res) => {
  try {
    lastUpdate = 0;

    const news = await getNews();

    res.json({
      success: true,
      count: news.length,
      message: "News refreshed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Gemini AI Assistant
app.post("/api/assistant", async (req, res) => {

  const question = String(
    req.body?.question || ""
  ).trim();

  if (!question) {
    return res.status(400).json({
      error: "Question is required"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      answer:
        "Gemini AI is not connected yet. Please add your Gemini API key in Vercel Environment Variables."
    });
  }

  try {

    const model =
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `You are the AI News India Assistant.
Answer the user's question clearly and simply.

Question:
${question}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        "Gemini API error"
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "No answer available.";

    res.json({
      answer
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "AI Assistant failed",
      details: error.message
    });
  }
});


// Export for Vercel
export default app;
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
