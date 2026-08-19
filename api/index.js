// AI News India - Fast News API
// Vercel Serverless Function
// No API key required

const SOURCES = {
  ALL: [
    "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
    "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
  ],

  INDIA: [
    "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  "WEST BENGAL": [
    "https://news.google.com/rss/search?q=West+Bengal&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  WORLD: [
    "https://news.google.com/rss/search?q=World+News&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  TECHNOLOGY: [
    "https://news.google.com/rss/search?q=Technology&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  BUSINESS: [
    "https://news.google.com/rss/search?q=Business&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  SPORTS: [
    "https://news.google.com/rss/search?q=Sports&hl=en-IN&gl=IN&ceid=IN:en"
  ],

  ENTERTAINMENT: [
    "https://news.google.com/rss/search?q=Entertainment&hl=en-IN&gl=IN&ceid=IN:en"
  ]
};

// Fetch with timeout
async function fetchWithTimeout(url, ms = 7000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, ms);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AI-News-India/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

// Decode basic HTML entities
function decodeHTML(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();
}

// Extract XML tag
function getTag(xml, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(regex);

  return match ? decodeHTML(match[1]) : "";
}

// Parse RSS
function parseRSS(xml) {
  const items = [];

  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of matches) {
    const title = getTag(item, "title");
    const link = getTag(item, "link");
    const description = getTag(item, "description");
    const pubDate = getTag(item, "pubDate");

    if (!title || !link) continue;

    items.push({
      title,
      description: description.slice(0, 300),
      link,
      pubDate,
      source: "News Source"
    });
  }

  return items;
}

// Remove duplicate news
function removeDuplicates(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.title
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// Main API
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const category = String(
      req.query?.category || "ALL"
    )
      .trim()
      .toUpperCase();

    const search = String(
      req.query?.q || ""
    ).trim();

    let urls = SOURCES[category] || SOURCES.ALL;

    // Search news
    if (search) {
      const searchURL =
        "https://news.google.com/rss/search?q=" +
        encodeURIComponent(search) +
        "&hl=en-IN&gl=IN&ceid=IN:en";

      urls = [searchURL];
    }

    // Fetch all sources simultaneously
    const results = await Promise.allSettled(
      urls.map((url) => fetchWithTimeout(url, 7000))
    );

    let news = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        news.push(...parseRSS(result.value));
      }
    }

    // Remove duplicate stories
    news = removeDuplicates(news);

    // Search filter
    if (search) {
      const q = search.toLowerCase();

      news = news.filter((item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Latest first
    news.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();

      return dateB - dateA;
    });

    // Maximum 30 stories
    news = news.slice(0, 30);

    return res.status(200).json({
      success: true,
      category,
      count: news.length,
      updatedAt: new Date().toISOString(),
      items: news
    });

  } catch (error) {
    console.error("News API Error:", error);

    return res.status(200).json({
      success: false,
      category: "ALL",
      count: 0,
      items: [],
      error: "News temporarily unavailable"
    });
  }
};
