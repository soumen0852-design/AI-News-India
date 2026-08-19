const SOURCES = [
  "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=West+Bengal&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=World&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=Technology&hl=en-IN&gl=IN&ceid=IN:en"
];

async function getRSS(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AI-News-India/1.0" }
    });

    if (!r.ok) throw new Error("RSS failed");

    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

function clean(text = "") {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parse(xml) {
  const items = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of matches) {
    const title = clean(
      (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]
    );

    const link = clean(
      (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [,""])[1]
    );

    const date = clean(
      (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [,""])[1]
    );

    if (title && link) {
      items.push({
        title,
        link,
        pubDate: date
      });
    }
  }

  return items;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      items: []
    });
  }

  try {
    const results = await Promise.allSettled(
      SOURCES.map(getRSS)
    );

    let items = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        items.push(...parse(result.value));
      }
    }

    const seen = new Set();

    items = items.filter(item => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    });

    items.sort(
      (a, b) =>
        new Date(b.pubDate || 0) -
        new Date(a.pubDate || 0)
    );

    return res.status(200).json({
      success: true,
      count: items.length,
      items: items.slice(0, 30),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      count: 0,
      items: [],
      error: "News unavailable"
    });
  }
};
