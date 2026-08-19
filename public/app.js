const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");

let currentCategory = "All";

// =========================
// NEWS
// =========================

async function loadNews() {
  statusEl.textContent = "Loading news...";

  try {
    const params = new URLSearchParams();

    if (currentCategory !== "All") {
      params.set("category", currentCategory);
    }

    if (searchEl && searchEl.value.trim()) {
      params.set("q", searchEl.value.trim());
    }

    const response = await fetch(
      `/api/news?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "News API failed"
      );
    }

    renderNews(data.items || []);

    statusEl.textContent =
      "Updated " +
      new Date(
        data.updatedAt
      ).toLocaleTimeString();

  } catch (error) {
    console.error(error);

    statusEl.textContent =
      "News loading failed";

    newsGrid.innerHTML = `
      <p class="empty">
        News could not be loaded.
      </p>
    `;
  }
}


// =========================
// RENDER NEWS
// =========================

function renderNews(items) {

  if (countEl) {
    countEl.textContent =
      `${items.length} stories`;
  }

  if (!items.length) {

    newsGrid.innerHTML = `
      <p class="empty">
        No news found.
      </p>
    `;

    return;
  }

  newsGrid.innerHTML = items
    .map(item => {

      const title =
        escapeHtml(item.title || "");

      const description =
        escapeHtml(
          item.description ||
          "Latest news update."
        );

      const category =
        escapeHtml(
          item.category || "News"
        );

      const source =
        escapeHtml(
          item.source || ""
        );

      const link =
        safeUrl(item.link);

      let date = "";

      if (item.publishedAt) {
        try {
          date = new Date(
            item.publishedAt
          ).toLocaleString();
        } catch {}
      }

      return `
        <article class="card">

          <div class="tag">
            ${category}
          </div>

          <h3>
            ${title}
          </h3>

          <p>
            ${description}
          </p>

          <div class="meta">

            <span>
              ${source}
            </span>

            <span>
              ${date}
            </span>

          </div>

          <a
            href="${link}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read full story →
          </a>

        </article>
      `;

    })
    .join("");
}


// =========================
// SECURITY
// =========================

function escapeHtml(value = "") {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function safeUrl(url = "") {

  try {

    const parsed =
      new URL(url);

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


// =========================
// CATEGORY BUTTONS
// =========================

document
  .querySelectorAll(".navitem")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".navitem")
          .forEach(btn => {
            btn.classList.remove(
              "active"
            );
          });

        button.classList.add(
          "active"
        );

        currentCategory =
          button.dataset.cat ||
          "All";

        loadNews();

      }
    );

  });


// =========================
// SEARCH
// =========================

if (searchEl) {

  let searchTimer;

  searchEl.addEventListener(
    "input",
    () => {

      clearTimeout(
        searchTimer
      );

      searchTimer = setTimeout(
        loadNews,
        500
      );

    }
  );

}


// =========================
// REFRESH NEWS
// =========================

if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    async () => {

      refreshBtn.disabled =
        true;

      refreshBtn.textContent =
        "Refreshing...";

      try {

        await fetch(
          "/api/refresh",
          {
            method: "POST"
          }
        );

      } catch (error) {

        console.error(error);

      }

      await loadNews();

      refreshBtn.disabled =
        false;

      refreshBtn.textContent =
        "↻ Refresh now";

    }
  );

}


// =========================
// DARK MODE
// =========================

const themeBtn =
  document.getElementById(
    "themeBtn"
  );

if (themeBtn) {

  themeBtn.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );

      themeBtn.textContent =
        document.body.classList.contains(
          "dark"
        )
          ? "☀️"
          : "🌙";

    }
  );

}


// =========================
// AI ASSISTANT
// =========================

function openAssistant() {

  const assistant =
    document.getElementById(
      "assistant"
    );

  if (assistant) {

    assistant.classList.remove(
      "hidden"
    );

  }

  const question =
    document.getElementById(
      "question"
    );

  if (question) {

    question.focus();

  }

}


function closeAssistant() {

  const assistant =
    document.getElementById(
      "assistant"
    );

  if (assistant) {

    assistant.classList.add(
      "hidden"
    );

  }

}


window.openAssistant =
  openAssistant;

window.closeAssistant =
  closeAssistant;


// =========================
// AI CHAT
// =========================

const chatForm =
  document.getElementById(
    "chatForm"
  );

const questionInput =
  document.getElementById(
    "question"
  );

const chat =
  document.getElementById(
    "chat"
  );


if (chatForm) {

  chatForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const question =
        questionInput.value.trim();

      if (!question) {
        return;
      }

      addMessage(
        question,
        "user"
      );

      questionInput.value = "";

      const loading =
        addMessage(
          "Thinking...",
          "bot"
        );

      try {

        const response =
          await fetch(
            "/api/assistant",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                question:
                  question
              })
            }
          );

        const data =
          await response.json();

        loading.remove();

        if (!response.ok) {

          throw new Error(
            data.error ||
            data.details ||
            "AI Assistant failed"
          );

        }

        addMessage(
          data.answer ||
          "No answer received.",
          "bot"
        );

      } catch (error) {

        console.error(error);

        loading.remove();

        addMessage(
          "AI Assistant error: " +
          error.message,
          "bot"
        );

      }

    }
  );

}


// =========================
// CHAT MESSAGE
// =========================

function addMessage(
  text,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  div.className = type;

  div.textContent = text;

  if (chat) {

    chat.appendChild(
      div
    );

    chat.scrollTop =
      chat.scrollHeight;

  }

  return div;

}


// =========================
// START WEBSITE
// =========================

loadNews();
