// api/news.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const category = String(req.query?.category || "All");
    const search = String(req.query?.q || "").trim().toLowerCase();

    const feeds = [
      {
        name: "Google News India",
        url: "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
      },
      {
        name: "Google News World",
        url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
      },
      {
        name: "Google News Technology",
        url: "https://news.google.com/rss/search?q=technology&hl=en-IN&gl=IN&ceid=IN:en"
      },
      {
        name: "Google News AI",
        url: "https://news.google.com/rss/search?q=artificial%20intelligence&hl=en-IN&gl=IN&ceid=IN:en"
      }
    ];

    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 AI-News-India"
          }
        });

        if (!response.ok) {
          throw new Error(`${feed.name} failed`);
        }

        return {
          source: feed.name,
          xml: await response.text()
        };
      })
    );

    const items = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      const { source, xml } = result.value;

      const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const item of matches.slice(0, 20)) {
        const title = getTag(item, "title");
        const link = getTag(item, "link");
        const pubDate = getTag(item, "pubDate");
        const description = getTag(item, "description");

        if (!title || !link) continue;

        let cleanTitle = cleanHTML(title);
        let cleanDescription = cleanHTML(description);

        let itemCategory = categoryFromText(
          cleanTitle + " " + cleanDescription,
          source
        );

        items.push({
          title: cleanTitle,
          description:
            cleanDescription || "Read the latest news and updates.",
          link: cleanURL(link),
          source,
          category: itemCategory,
          publishedAt: pubDate || new Date().toISOString()
        });
      }
    }

    let filtered = items;

    if (category && category !== "All") {
      filtered = filtered.filter(
        item =>
          item.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      filtered = filtered.filter(item =>
        `${item.title} ${item.description} ${item.category}`
          .toLowerCase()
          .includes(search)
      );
    }

    // Remove duplicate headlines
    const unique = [];
    const seen = new Set();

    for (const item of filtered) {
      const key = item.title.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Sort newest first
    unique.sort(
      (a, b) =>
        new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    return res.status(200).json({
      success: true,
      count: unique.slice(0, 30).length,
      items: unique.slice(0, 30),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("NEWS API ERROR:", error);

    // Website should NOT crash if news source fails
    return res.status(200).json({
      success: false,
      count: 0,
      items: [],
      error: "News temporarily unavailable",
      updatedAt: new Date().toISOString()
    });
  }
}


// -----------------------------
// Helpers
// -----------------------------

function getTag(xml, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(regex);

  if (!match) return "";

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}


function cleanHTML(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}


function cleanURL(value) {
  const url = cleanHTML(value);

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    ) {
      return parsed.href;
    }

    return "#";
  } catch {
    return "#";
  }
}


function categoryFromText(text, source) {
  const value = text.toLowerCase();

  if (
    value.includes("ai") ||
    value.includes("artificial intelligence") ||
    value.includes("machine learning")
  ) {
    return "Technology";
  }

  if (
    value.includes("technology") ||
    value.includes("tech") ||
    value.includes("software") ||
    value.includes("google") ||
    value.includes("apple") ||
    value.includes("microsoft")
  ) {
    return "Technology";
  }

  if (
    value.includes("business") ||
    value.includes("stock") ||
    value.includes("market") ||
    value.includes("economy")
  ) {
    return "Business";
  }

  if (
    value.includes("sport") ||
    value.includes("cricket") ||
    value.includes("football") ||
    value.includes("olympic")
  ) {
    return "Sports";
  }

  if (
    value.includes("entertainment") ||
    value.includes("movie") ||
    value.includes("actor") ||
    value.includes("actress")
  ) {
    return "Entertainment";
  }

  if (
    value.includes("india") ||
    value.includes("delhi") ||
    value.includes("kolkata") ||
    value.includes("mumbai") ||
    value.includes("west bengal")
  ) {
    return "India";
  }

  return source.includes("World")
    ? "World"
    : "India";
    }
