"use strict";

/* =========================================
   AI NEWS INDIA - APP.JS
   ========================================= */

const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");

const themeBtn = document.getElementById("themeBtn");

const assistant = document.getElementById("assistant");
const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const question = document.getElementById("question");

let currentCategory = "All";
let allNews = [];

/* =========================================
   SAFE HTML
   ========================================= */

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================
   FORMAT AI ANSWER
   ========================================= */

function formatAIAnswer(text) {
  let safe = escapeHTML(text);

  // **bold**
  safe = safe.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  // *italic*
  safe = safe.replace(
    /(^|[^*])\*([^*]+)\*(?!\*)/g,
    "$1<em>$2</em>"
  );

  // `code`
  safe = safe.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  // Numbered lists
  safe = safe.replace(
    /^(\d+)\.\s+(.*)$/gm,
    "<div class=\"ai-list-item\"><b>$1.</b> $2</div>"
  );

  // Bullet points
  safe = safe.replace(
    /^[•\-]\s+(.*)$/gm,
    "<div class=\"ai-list-item\">• $1</div>"
  );

  // New lines
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

/* =========================================
   OPEN / CLOSE ASSISTANT
   ========================================= */

window.openAssistant = function () {
  if (assistant) {
    assistant.classList.remove("hidden");
  }
};

window.closeAssistant = function () {
  if (assistant) {
    assistant.classList.add("hidden");
  }
};

/* =========================================
   AI ASSISTANT
   ========================================= */

if (chatForm) {
  chatForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const text = question?.value?.trim();

    if (!text) return;

    /* USER MESSAGE */
    if (chat) {
      chat.innerHTML += `
        <div class="chat-message user-message">
          ${escapeHTML(text)}
        </div>
      `;
    }

    question.value = "";

    /* LOADING */
    const loadingId = "ai-loading-" + Date.now();

    if (chat) {
      chat.innerHTML += `
        <div class="chat-message bot-message" id="${loadingId}">
          <span class="ai-loading">AI is thinking...</span>
        </div>
      `;

      chat.scrollTop = chat.scrollHeight;
    }

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          question: text
        })
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {
          error: "Invalid server response."
        };
      }

      /* REMOVE LOADING */
      const loading = document.getElementById(loadingId);

      if (loading) {
        loading.remove();
      }

      /* SERVER ERROR */
      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.details ||
          "AI Assistant request failed."
        );
      }

      const answer =
        data?.answer ||
        "Sorry, I could not generate an answer.";

      /* BOT MESSAGE */
      if (chat) {
        chat.innerHTML += `
          <div class="chat-message bot-message">
            ${formatAIAnswer(answer)}
          </div>
        `;

        chat.scrollTop = chat.scrollHeight;
      }

    } catch (error) {

      console.error("AI Assistant Error:", error);

      const loading = document.getElementById(loadingId);

      if (loading) {
        loading.remove();
      }

      if (chat) {
        chat.innerHTML += `
          <div class="chat-message bot-message error-message">
            ❌ AI Assistant connection failed.
            <br>
            <small>${escapeHTML(error.message)}</small>
          </div>
        `;

        chat.scrollTop = chat.scrollHeight;
      }
    }
  });
}

/* =========================================
   ENTER KEY
   ========================================= */

if (question) {
  question.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (chatForm) {
        chatForm.requestSubmit();
      }
    }
  });
}

/* =========================================
   LOAD NEWS
   ========================================= */

async function loadNews() {

  if (!newsGrid) return;

  if (statusEl) {
    statusEl.textContent = "Loading news...";
  }

  newsGrid.innerHTML = `
    <div class="news-loading">
      Loading latest news...
    </div>
  `;

  try {

    const params = new URLSearchParams();

    if (currentCategory !== "All") {
      params.set("category", currentCategory);
    }

    if (searchEl && searchEl.value.trim()) {
      params.set("q", searchEl.value.trim());
    }

    const url =
      "/api/news" +
      (params.toString()
        ? "?" + params.toString()
        : "");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "News API failed."
      );
    }

    allNews =
      Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];

    renderNews(allNews);

    if (statusEl) {
      statusEl.textContent =
        "Updated " +
        new Date().toLocaleTimeString();
    }

  } catch (error) {

    console.error("News Error:", error);

    if (statusEl) {
      statusEl.textContent = "News loading failed";
    }

    newsGrid.innerHTML = `
      <div class="news-error">
        <h3>Unable to load news</h3>
        <p>Please try again.</p>
        <button onclick="loadNews()">
          Retry
        </button>
      </div>
    `;
  }
}

/* =========================================
   RENDER NEWS
   ========================================= */

function renderNews(items) {

  if (!newsGrid) return;

  if (countEl) {
    countEl.textContent =
      `${items.length} stories`;
  }

  if (!items.length) {
    newsGrid.innerHTML = `
      <div class="news-empty">
        <h3>No news found</h3>
        <p>Try another category or search.</p>
      </div>
    `;

    return;
  }

  newsGrid.innerHTML = items
    .map((item) => {

      const title =
        escapeHTML(item.title || "Untitled News");

      const description =
        escapeHTML(
          item.description ||
          item.content ||
          "Read the full story."
        );

      const source =
        escapeHTML(
          item.source ||
          item.sourceName ||
          "News"
        );

      const category =
        escapeHTML(
          item.category ||
          "India"
        );

      const link =
        safeURL(item.link);

      const date =
        item.publishedAt ||
        item.pubDate ||
        item.isoDate ||
        "";

      return `
        <article class="news-card">

          <div class="news-category">
            ${category}
          </div>

          <h2>
            ${title}
          </h2>

          <p>
            ${description}
          </p>

          <div class="news-meta">
            <span>${source}</span>
            ${
              date
                ? `<span>${escapeHTML(
                    new Date(date).toLocaleString()
                  )}</span>`
                : ""
            }
          </div>

          ${
            link !== "#"
              ? `
                <a
                  href="${link}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="read-more"
                >
                  Read Full Story →
                </a>
              `
              : ""
          }

        </article>
      `;
    })
    .join("");
}

/* =========================================
   SAFE URL
   ========================================= */

function safeURL(value) {

  try {

    const url = new URL(
      value,
      window.location.origin
    );

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }

  } catch (error) {
    console.warn("Invalid URL:", value);
  }

  return "#";
}

/* =========================================
   SEARCH
   ========================================= */

if (searchEl) {

  let timer;

  searchEl.addEventListener("input", function () {

    clearTimeout(timer);

    timer = setTimeout(() => {
      loadNews();
    }, 500);

  });

}

/* =========================================
   REFRESH
   ========================================= */

if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    function () {
      loadNews();
    }
  );

}

/* =========================================
   THEME
   ========================================= */

if (themeBtn) {

  themeBtn.addEventListener(
    "click",
    function () {

      document.body.classList.toggle(
        "dark-mode"
      );

      localStorage.setItem(
        "ai-news-theme",
        document.body.classList.contains(
          "dark-mode"
        )
          ? "dark"
          : "light"
      );

    }
  );

}

/* Restore theme */

if (
  localStorage.getItem("ai-news-theme") ===
  "dark"
) {
  document.body.classList.add("dark-mode");
}

/* =========================================
   START APP
   ========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadNews();

  }
);
