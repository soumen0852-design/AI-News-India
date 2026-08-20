export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const q = String(req.query?.q || "").trim().toLowerCase();
  const category = String(req.query?.category || "All").trim();

  const feeds = [
    {
      url: "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en",
      category: "India"
    },
    {
      url: "https://news.google.com/rss/search?q=West+Bengal&hl=en-IN&gl=IN&ceid=IN:en",
      category: "West Bengal"
    },
    {
      url: "https://news.google.com/rss/search?q=world+news&hl=en-IN&gl=IN&ceid=IN:en",
      category: "World"
    },
    {
      url: "https://news.google.com/rss/search?q=technology+AI&hl=en-IN&gl=IN&ceid=IN:en",
      category: "Technology"
    },
    {
      url: "https://news.google.com/rss/search?q=business+India&hl=en-IN&gl=IN&ceid=IN:en",
      category: "Business"
    },
    {
      url: "https://news.google.com/rss/search?q=sports+India&hl=en-IN&gl=IN&ceid=IN:en",
      category: "Sports"
    }
  ];

  const allItems = [];

  for (const feed of feeds) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      const response = await fetch(feed.url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/rss+xml, application/xml, text/xml"
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.log("Feed failed:", response.status, feed.url);
        continue;
      }

      const xml = await response.text();

      const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const item of items.slice(0, 20)) {
        const title = clean(getTag(item, "title"));
        const link = cleanURL(getTag(item, "link"));
        const description = clean(getTag(item, "description"));
        const pubDate = clean(getTag(item, "pubDate"));

        if (!title || link === "#") continue;

        allItems.push({
          title,
          description: description || "Read the latest news and updates.",
          link,
          source: "Google News",
          category: feed.category,
          publishedAt: pubDate || new Date().toISOString()
        });
      }

    } catch (error) {
      console.log("Feed error:", error.message);
    }
  }

  let items = allItems;

  // Search
  if (q) {
    items = items.filter(item =>
      `${item.title} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(q)
    );
  }

  // Category
  if (category && category !== "All") {
    items = items.filter(item =>
      item.category.toLowerCase() === category.toLowerCase()
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
  items.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime() || 0;
    const dateB = new Date(b.publishedAt).getTime() || 0;

    return dateB - dateA;
  });

  return res.status(200).json({
    success: true,
    count: items.length,
    items: items.slice(0, 30),
    updatedAt: new Date().toISOString()
  });
}


// ================================
// XML TAG
// ================================

function getTag(xml, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(regex);

  if (!match) return "";

  return match[1]
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .trim();
}


// ================================
// CLEAN TEXT
// ================================

function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}


// ================================
// SAFE URL
// ================================

function cleanURL(value) {
  try {
    const url = new URL(clean(value));

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }
  } catch (error) {
    return "#";
  }

  return "#";
}
