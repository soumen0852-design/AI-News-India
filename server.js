import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const parser = new Parser();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// NEWS
// ===============================

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
    category: "Science",
    name: "ScienceDaily",
    url: "https://www.sciencedaily.com/rss/top/science.xml"
  }
];

app.get("/api/news", async (req, res) => {
  try {
    const category = req.query.category || "All";
    const search = (req.query.q || "").toLowerCase();

    const results = await Promise.all(
      FEEDS.map(async feed => {
        try {
          const data = await parser.parseURL(feed.url);

          return data.items.slice(0, 10).map(item => ({
            title: item.title || "Untitled",
            description: item.contentSnippet || "",
            link: item.link || "#",
            source: feed.name,
            category: feed.category,
            publishedAt: item.isoDate || item.pubDate || ""
          }));
        } catch (error) {
          console.error("Feed error:", feed.name, error.message);
          return [];
        }
      })
    );

    let items = results.flat();

    if (category !== "All") {
      items = items.filter(
        item =>
          item.category.toLowerCase() ===
          String(category).toLowerCase()
      );
    }

    if (search) {
      items = items.filter(item =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(search)
      );
    }

    res.json({
      items: items.slice(0, 30),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("News API error:", error);

    res.status(500).json({
      error: "News API failed",
      items: []
    });
  }
});

// ===============================
// GEMINI AI ASSISTANT
// ===============================

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
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing"
    });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "You are AI News India Assistant. " +
                    "Answer clearly and simply.\n\n" +
                    "User question:\n" +
                    question
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(500).json({
        error:
          data?.error?.message ||
          "Gemini API error"
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return res.status(500).json({
        error: "No answer received from Gemini"
      });
    }

    res.json({ answer });

  } catch (error) {
    console.error("AI error:", error);

    res.status(500).json({
      error: "AI Assistant failed",
      details: error.message
    });
  }
});

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ===============================
// VERCEL
// ===============================

export default app;
