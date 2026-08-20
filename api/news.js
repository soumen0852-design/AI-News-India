// api/news.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const q = String(req.query?.q || "").trim().toLowerCase();
    const category = String(req.query?.category || "All");

    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=technology&hl=en-IN&gl=IN&ceid=IN:en"
    ];

    const allItems = [];

    for (const url of feeds) {
      try {
        const controller = new AbortController();

        const timer = setTimeout(() => {
          controller.abort();
        }, 5000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        clearTimeout(timer);

        if (!response.ok) continue;

        const xml = await response.text();

        const matches =
          xml.match(/<item[\s\S]*?<\/item>/gi) || [];

        for (const item of matches.slice(0, 15)) {
          const title = getTag(item, "title");
          const link = getTag(item, "link");
          const description = getTag(item, "description");
          const pubDate = getTag(item, "pubDate");

          if (!title || !link) continue;

          allItems.push({
            title: clean(title),
            description:
              clean(description) ||
              "Read the latest news and updates.",
            link: cleanURL(link),
            source: "Google News",
            category: detectCategory(title),
            publishedAt:
              pubDate || new Date().toISOString()
          });
        }
      } catch (error) {
        console.log("Feed skipped:", error.message);
      }
    }

    let items = allItems;

    // Search
    if (q) {
      items = items.filter(item =>
        (
          item.title +
          " " +
          item.description
        )
          .toLowerCase()
          .includes(q)
      );
    }

    // Category
    if (category !== "All") {
      items = items.filter(item =>
        item.category.toLowerCase() ===
        category.toLowerCase()
      );
    }

    // Remove duplicate titles
    const seen = new Set();

    items = items.filter(item => {
      const key = item.title.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    // Newest first
    items.sort(
      (a, b) =>
        new Date(b.publishedAt) -
        new Date(a.publishedAt)
    );

    return res.status(200).json({
      success: true,
      count: items.length,
      items: items.slice(0, 30),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {

    console.error("NEWS API ERROR:", error);

    return res.status(200).json({
      success: false,
      count: 0,
      items: [],
      error: "News temporarily unavailable"
    });
  }
}


// ----------------------
// Get XML tag
// ----------------------

function getTag(xml, tag) {

  const regex = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(regex);

  if (!match) return "";

  return match[1]
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}


// ----------------------
// Clean HTML
// ----------------------

function clean(value) {

  return String(value || "")
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


// ----------------------
// Safe URL
// ----------------------

function cleanURL(value) {

  try {

    const url = new URL(clean(value));

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }

  } catch {}

  return "#";
}


// ----------------------
// Category
// ----------------------

function detectCategory(title) {

  const text = title.toLowerCase();

  if (
    text.includes("technology") ||
    text.includes("tech") ||
    text.includes("ai") ||
    text.includes("artificial intelligence") ||
    text.includes("google") ||
    text.includes("apple") ||
    text.includes("microsoft")
  ) {
    return "Technology";
  }

  if (
    text.includes("business") ||
    text.includes("market") ||
    text.includes("stock") ||
    text.includes("economy")
  ) {
    return "Business";
  }

  if (
    text.includes("sport") ||
    text.includes("cricket") ||
    text.includes("football")
  ) {
    return "Sports";
  }

  if (
    text.includes("movie") ||
    text.includes("actor") ||
    text.includes("actress") ||
    text.includes("entertainment")
  ) {
    return "Entertainment";
  }

  if (
    text.includes("india") ||
    text.includes("delhi") ||
    text.includes("kolkata") ||
    text.includes("mumbai") ||
    text.includes("west bengal")
  ) {
    return "India";
  }

  return "World";
}
