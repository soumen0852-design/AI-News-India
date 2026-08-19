"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================================
// NEWS API
// ================================

app.get("/api/news", async (req, res) => {
  try {
    const feeds = [
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

    const results = await Promise.all(
      feeds.map(async feed => {
        try {
          const response = await fetch(feed.url);

          if (!response.ok) return [];

          const xml = await response.text();

          const items = [];
          const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

          matches.slice(0, 10).forEach(item => {
            const title =
              item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ||
              item.match(/<title>(.*?)<\/title>/i)?.[1] ||
              "News";

            const link =
              item.match(/<link>(.*?)<\/link>/i)?.[1] || "#";

            const description =
              item.match(
                /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i
              )?.[1] ||
              item.match(
                /<description>([\s\S]*?)<\/description>/i
              )?.[1] ||
              "";

            const pubDate =
              item.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || "";

            items.push({
              title: title.replace(/<[^>]+>/g, "").trim(),
              description: description
                .replace(/<[^>]+>/g, "")
                .trim()
                .slice(0, 300),
              link,
              source: feed.name,
              category: feed.category,
              publishedAt: pubDate
            });
          });

          return items;
        } catch {
          return [];
        }
      })
    );

    let news = results.flat();

    const search = String(req.query.q || "").toLowerCase();
    const category = String(req.query.category || "All");

    if (category !== "All") {
      news = news.filter(
        item =>
          String(item.category).toLowerCase() ===
          category.toLowerCase()
      );
    }

    if (search) {
      news = news.filter(item =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(search)
      );
    }

    res.json({
      items: news.slice(0, 30),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("News error:", error);

    res.status(500).json({
      error: "News API failed",
      items: []
    });
  }
});

// ================================
// GEMINI AI ASSISTANT
// ================================

app.post("/api/assistant", async (req, res) => {
  const question = String(req.body?.question || "").trim();

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
                    "You are the AI News India Assistant. " +
                    "Answer the user's question clearly and simply.\n\n" +
                    "Question:\n" +
                    question
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("Gemini status:", response.status);

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(500).json({
        error:
          data?.error?.message ||
          "Gemini API request failed"
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return res.status(500).json({
        error: "Gemini returned no answer"
      });
    }

    return res.json({
      answer
    });

  } catch (error) {
    console.error("Assistant error:", error);

    return res.status(500).json({
      error: "AI Assistant failed",
      details: error.message
    });
  }
});

// ================================
// HOME
// ================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ================================
// VERCEL
// ================================

module.exports = app;
