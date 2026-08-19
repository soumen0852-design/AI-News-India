export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const url =
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error("News source failed");
    }

    const xml = await response.text();

    const matches =
      xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    const items = matches.slice(0, 30).map(item => {
      const title =
        (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || ["", ""])[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .trim();

      const link =
        (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || ["", ""])[1]
          .trim();

      const pubDate =
        (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || ["", ""])[1]
          .trim();

      return {
        title,
        link,
        pubDate
      };
    }).filter(x => x.title && x.link);

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });

  } catch (error) {
    console.error(error);

    return res.status(200).json({
      success: false,
      count: 0,
      items: [],
      error: "News temporarily unavailable"
    });
  }
}
