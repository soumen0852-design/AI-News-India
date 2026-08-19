export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=West+Bengal&hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=World+News&hl=en-IN&gl=IN&ceid=IN:en"
    ];

    const fetchFeed = async (url) => {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 AI-News-India/1.0"
          }
        });

        if (!response.ok) {
          throw new Error(`RSS request failed: ${response.status}`);
        }

        return await response.text();
      } finally {
        clearTimeout(timeout);
      }
    };

    // Fetch all feeds
    const results = await Promise.allSettled(
      feeds.map((url) => fetchFeed(url))
    );

    const xmlFeeds = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (xmlFeeds.length === 0) {
      return res.status(200).json({
        success: false,
        count: 0,
        items: [],
        error: "News source temporarily unavailable"
      });
    }

    const decodeHTML = (text = "") => {
      return text
        .replace(/<!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
    };

    const extract = (xml, tag) => {
      const regex = new RegExp(
        `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );

      const match = xml.match(regex);
      return match ? decodeHTML(match[1]) : "";
    };

    const allItems = [];

    for (const xml of xmlFeeds) {
      const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const item of matches) {
        const title = extract(item, "title");
        const link = extract(item, "link");
        const pubDate = extract(item, "pubDate");

        if (title && link) {
          allItems.push({
            title,
            link,
            pubDate: pubDate || new Date().toISOString()
          });
        }
      }
    }

    // Remove duplicate news
    const unique = [];
    const seen = new Set();

    for (const item of allItems) {
      const key = item.title.toLowerCase().trim();

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Latest 50 stories
    unique.sort((a, b) => {
      return new Date(b.pubDate) - new Date(a.pubDate);
    });

    const items = unique.slice(0, 50);

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("News API Error:", error);

    return res.status(200).json({
      success: false,
      count: 0,
      items: [],
      error: "Unable to load news right now"
    });
  }
}
