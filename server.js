import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const parser = new Parser({ timeout: 10000 });
const PORT = process.env.PORT || 3000;
const REFRESH_MINUTES = Number(process.env.NEWS_REFRESH_MINUTES || 15);

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public")));

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

let cache = {
  updatedAt: null,
  items: []
};

function cleanHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeItem(item, feed) {
  return {
    id: Buffer.from(
      `${feed.name}|${item.guid || item.link || item.title}`
    ).toString("base64url"),

    title: cleanHtml(item.title),

    description: cleanHtml(
      item.contentSnippet ||
      item.content ||
      ""
    ),

    link: item.link,

    source: feed.name,

    category: feed.category,

    publishedAt:
      item.isoDate ||
      item.pubDate ||
      new Date().toISOString(),

    image: item.enclosure?.url || null
  };
}

async function refreshNews() {
  const results = await Promise.allSettled(
    FEEDS.map(async feed => {
      const data = await parser.parseURL(feed.url);

      return data.items
        .slice(0, 25)
        .map(item => makeItem(item, feed));
    })
  );

  const items = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value)
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

  if (unique.length) {
    cache = {
      updatedAt: new Date().toISOString(),
      items: unique
    };
  }

  return cache;
}

app.get("/api/news", async (req, res) => {
  try {
    if (!cache.items.length) {
      await refreshNews();
    }

    const category =
      String(req.query.category || "All");

    const q =
      String(req.query.q || "")
        .toLowerCase()
        .trim();

    let items = cache.items;

    if (category !== "All") {
      items = items.filter(
        item => item.category === category
      );
    }

    if (q) {
      items = items.filter(item =>
        `${item.title} ${item.description} ${item.source}`
          .toLowerCase()
          .includes(q)
      );
    }

    res.json({
      updatedAt: cache.updatedAt,
      count: items.length,
      items: items.slice(0, 80)
    });

  } catch (error) {
    res.status(500).json({
      error: "News refresh failed",
      details: error.message
    });
  }
});

app.post("/api/refresh", async (req, res) => {
  try {
    const data = await refreshNews();

    res.json({
      ok: true,
      updatedAt: data.updatedAt,
      count: data.items.length
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/assistant", async (req, res) => {

  const question =
    String(req.body?.question || "").trim();

  if (!question) {
    return res.status(400).json({
      error: "Question is required."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      answer:
        "Gemini AI is not connected yet. Please add GEMINI_API_KEY."
    });
  }

  try {

    const model =
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const prompt =
      `You are the AI News India assistant.
Answer clearly and concisely.

User question:
${question}`;

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
                text: prompt
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
        "Gemini request failed"
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "No answer returned.";

    res.json({
      answer
    });

  } catch (error) {

    res.status(500).json({
      error: "AI assistant failed",
      details: error.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

setInterval(
  () => refreshNews().catch(console.error),
  REFRESH_MINUTES * 60 * 1000
);

refreshNews().catch(console.error);

app.listen(PORT, () => {
  console.log(
    `AI News India running at http://localhost:${PORT}`
  );
});
