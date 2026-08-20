// public/app.js

let currentCategory = "All";

const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchInput = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function formatDate(date) {
  try {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "";
  }
}

async function loadNews() {
  if (!newsGrid) return;

  const query = searchInput
    ? searchInput.value.trim()
    : "";

  newsGrid.innerHTML = `
    <div class="empty">
      Loading latest stories...
    </div>
  `;

  if (statusEl) {
    statusEl.textContent = "Loading news...";
  }

  try {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (currentCategory && currentCategory !== "All") {
      params.set("category", currentCategory);
    }

    const url =
      "/api/news" +
      (params.toString()
        ? "?" + params.toString()
        : "");

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "News API error: " + response.status
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.error || "News unavailable"
      );
    }

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    renderNews(items);

    if (statusEl) {
      statusEl.textContent =
        "Updated just now";
    }

  } catch (error) {
    console.error("NEWS ERROR:", error);

    newsGrid.innerHTML = `
      <div class="empty">
        <h3>News temporarily unavailable</h3>
        <p style="margin-top:8px;">
          Please try again in a moment.
        </p>
      </div>
    `;

    if (statusEl) {
      statusEl.textContent =
        "Unable to load news";
    }

    if (countEl) {
      countEl.textContent = "0 stories";
    }
  }
}

function renderNews(items) {
  if (!newsGrid) return;

  if (!items.length) {
    newsGrid.innerHTML = `
      <div class="empty">
        No news found.
      </div>
    `;

    if (countEl) {
      countEl.textContent = "0 stories";
    }

    return;
  }

  newsGrid.innerHTML = items
    .map(item => {
      const title =
        escapeHTML(item.title);

      const description =
        escapeHTML(
          item.description ||
          "Read the latest news and updates."
        );

      const category =
        escapeHTML(
          item.category || "News"
        );

      const source =
        escapeHTML(
          item.source || "News"
        );

      const date =
        formatDate(item.publishedAt);

      const link =
        typeof item.link === "string" &&
        /^https?:\/\//i.test(item.link)
          ? item.link
          : "#";

      return `
        <article class="news-card">

          <h3>
            ${title}
          </h3>

          <p>
            ${description}
          </p>

          <div class="news-meta">
            ${category}
            •
            ${source}
            ${date ? " • " + date : ""}
          </div>

          ${
            link !== "#"
              ? `
                <a
                  href="${link}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    display:inline-block;
                    margin-top:14px;
                    color:var(--primary);
                    font-weight:800;
                  "
                >
                  Read full story →
                </a>
              `
              : ""
          }

        </article>
      `;
    })
    .join("");

  if (countEl) {
    countEl.textContent =
      `${items.length} ${
        items.length === 1
          ? "story"
          : "stories"
      }`;
  }
}

// Category function
function setCategory(category) {
  currentCategory = category || "All";
  loadNews();
}

window.setCategory = setCategory;
window.loadNews = loadNews;

// Search
if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        loadNews();
      }
    }
  );
}

// Search button
const searchBtn =
  document.getElementById("searchBtn");

if (searchBtn) {
  searchBtn.addEventListener(
    "click",
    loadNews
  );
}

// Refresh
if (refreshBtn) {
  refreshBtn.addEventListener(
    "click",
    loadNews
  );
}

// Hero refresh
const refreshHero =
  document.getElementById("refreshHero");

if (refreshHero) {
  refreshHero.addEventListener(
    "click",
    loadNews
  );
}

// First load
document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadNews();
  }
);
