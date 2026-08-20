// public/app.js

let currentCategory = "All";

const API_URL = "/api/news";

document.addEventListener("DOMContentLoaded", () => {
  loadNews();

  const search = document.getElementById("search");
  const searchBtn = document.getElementById("searchBtn");
  const refreshBtn = document.getElementById("refreshBtn");

  if (searchBtn) {
    searchBtn.addEventListener("click", loadNews);
  }

  if (search) {
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        loadNews();
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadNews);
  }

  // AI Assistant
  const chatForm = document.getElementById("chatForm");

  if (chatForm) {
    chatForm.addEventListener("submit", handleAssistant);
  }
});


// ===============================
// CATEGORY
// ===============================

window.setCategory = function (category) {
  currentCategory = category;
  loadNews();
};


// ===============================
// LOAD NEWS
// ===============================

window.loadNews = async function () {

  const grid = document.getElementById("newsGrid");
  const status = document.getElementById("status");
  const count = document.getElementById("count");
  const search = document.getElementById("search");

  if (!grid) return;

  grid.innerHTML = `
    <div class="empty">
      Loading latest stories...
    </div>
  `;

  if (status) {
    status.textContent = "Loading news...";
  }

  try {

    const params = new URLSearchParams();

    const query = search
      ? search.value.trim()
      : "";

    if (query) {
      params.set("q", query);
    }

    if (currentCategory && currentCategory !== "All") {
      params.set("category", currentCategory);
    }

    const url =
      params.toString()
        ? `${API_URL}?${params.toString()}`
        : API_URL;

    console.log("Loading news from:", url);

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `API error: ${response.status}`
      );
    }

    const data = await response.json();

    console.log("News API response:", data);

    if (!data.success) {
      throw new Error(
        data.error || "News unavailable"
      );
    }

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    if (count) {
      count.textContent =
        `${items.length} stories`;
    }

    if (status) {
      status.textContent =
        `Updated ${new Date().toLocaleTimeString()}`;
    }

    renderNews(items);

  } catch (error) {

    console.error("NEWS ERROR:", error);

    if (status) {
      status.textContent =
        "Unable to load news";
    }

    if (count) {
      count.textContent = "0 stories";
    }

    grid.innerHTML = `
      <div class="empty">
        <h3>News could not be loaded</h3>
        <p style="margin-top:10px;">
          Please tap Refresh and try again.
        </p>
        <button
          onclick="loadNews()"
          style="
            margin-top:15px;
            padding:10px 16px;
            border:0;
            border-radius:8px;
            background:#3155e7;
            color:white;
            font-weight:bold;
          "
        >
          ↻ Try Again
        </button>
      </div>
    `;
  }
};


// ===============================
// RENDER NEWS
// ===============================

function renderNews(items) {

  const grid = document.getElementById("newsGrid");

  if (!grid) return;

  if (!items.length) {

    grid.innerHTML = `
      <div class="empty">
        <h3>No news found</h3>
        <p style="margin-top:8px;">
          Try another search or category.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML = items.map(item => {

    const title =
      escapeHTML(item.title || "Untitled News");

    const description =
      escapeHTML(
        item.description ||
        "Read the latest news and updates."
      );

    const source =
      escapeHTML(item.source || "News");

    const category =
      escapeHTML(item.category || "World");

    const date =
      item.publishedAt
        ? new Date(item.publishedAt).toLocaleString()
        : "";

    const link =
      safeURL(item.link);

    return `
      <article class="news-card">

        <h3>
          ${title}
        </h3>

        <p>
          ${description}
        </p>

        <div class="news-meta">
          ${category} • ${source}
          ${date ? ` • ${date}` : ""}
        </div>

        <a
          href="${link}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-block;
            margin-top:14px;
            color:#3155e7;
            font-weight:800;
          "
        >
          Read Full Story →
        </a>

      </article>
    `;

  }).join("");
}


// ===============================
// SAFE URL
// ===============================

function safeURL(value) {

  try {

    const url = new URL(
      String(value || ""),
      window.location.origin
    );

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }

  } catch (e) {}

  return "#";
}


// ===============================
// HTML ESCAPE
// ===============================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ===============================
// AI ASSISTANT
// ===============================

async function handleAssistant(e) {

  e.preventDefault();

  const input =
    document.getElementById("question");

  const chat =
    document.getElementById("chat");

  if (!input || !chat) return;

  const question =
    input.value.trim();

  if (!question) return;

  chat.innerHTML += `
    <div class="user">
      ${escapeHTML(question)}
    </div>
  `;

  input.value = "";

  chat.innerHTML += `
    <div class="bot" id="aiTyping">
      Thinking...
    </div>
  `;

  chat.scrollTop = chat.scrollHeight;

  try {

    const response = await fetch(
      "/api/assistant",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: question
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `Assistant API error: ${response.status}`
      );
    }

    const data =
      await response.json();

    const answer =
      data.answer ||
      data.message ||
      data.response ||
      "Sorry, I could not answer that.";

    const typing =
      document.getElementById("aiTyping");

    if (typing) {
      typing.innerHTML =
        escapeHTML(answer);
      typing.removeAttribute("id");
    }

  } catch (error) {

    console.error(
      "ASSISTANT ERROR:",
      error
    );

    const typing =
      document.getElementById("aiTyping");

    if (typing) {

      typing.innerHTML =
        "AI Assistant is temporarily unavailable. Please try again.";

      typing.removeAttribute("id");
    }
  }

  chat.scrollTop = chat.scrollHeight;
}
