"use strict";

const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");

const assistant = document.getElementById("assistant");
const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("question");

let currentCategory = "All";


function openAssistant() {
    if (assistant) {
        assistant.classList.remove("hidden");
    }
}

window.openAssistant = openAssistant;


function closeAssistant() {
    if (assistant) {
        assistant.classList.add("hidden");
    }
}

window.closeAssistant = closeAssistant;


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
            "/api/news?" + params.toString()
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
            new Date(data.updatedAt).toLocaleTimeString();

    } catch (error) {

        console.error(error);

        statusEl.textContent =
            "News loading failed";

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>News could not be loaded</h3>
                <p>Please try again.</p>
            </div>
        `;
    }
}


function renderNews(items) {

    countEl.textContent =
        `${items.length} stories`;

    if (!items.length) {

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>No news found</h3>
            </div>
        `;

        return;
    }

    newsGrid.innerHTML = items.map(item => {

        const date = item.publishedAt
            ? new Date(item.publishedAt).toLocaleString()
            : "";

        return `
            <article class="card">

                <div class="tag">
                    ${escapeHtml(item.category)}
                </div>

                <h3>
                    ${escapeHtml(item.title)}
                </h3>

                <p>
                    ${escapeHtml(item.description)}
                </p>

                <div class="meta">
                    <span>
                        ${escapeHtml(item.source)}
                    </span>

                    <span>
                        ${date}
                    </span>
                </div>

                <a
                    href="${safeUrl(item.link)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read full story →
                </a>

            </article>
        `;

    }).join("");
}


function escapeHtml(text) {

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function safeUrl(url) {

    try {

        const u = new URL(url);

        if (
            u.protocol === "http:" ||
            u.protocol === "https:"
        ) {
            return u.href;
        }

    } catch (e) {}

    return "#";
}


/* CATEGORY */

document.querySelectorAll(".navitem")
.forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll(".navitem")
            .forEach(btn =>
                btn.classList.remove("active")
            );

        button.classList.add("active");

        currentCategory =
            button.dataset.cat || "All";

        loadNews();
    });

});


/* SEARCH */

if (searchEl) {

    let timer;

    searchEl.addEventListener("input", () => {

        clearTimeout(timer);

        timer = setTimeout(
            loadNews,
            500
        );

    });
}


/* REFRESH */

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async () => {

            refreshBtn.disabled = true;

            refreshBtn.textContent =
                "Refreshing...";

            try {

                await fetch(
                    "/api/refresh",
                    {
                        method: "POST"
                    }
                );

            } catch (e) {

                console.error(e);

            }

            await loadNews();

            refreshBtn.disabled = false;

            refreshBtn.textContent =
                "↻ Refresh now";
        }
    );
}


/* AI ASSISTANT */

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const question =
                questionInput.value.trim();

            if (!question) return;

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
                    "No answer available.",
                    "bot"
                );

            } catch (error) {

                loading.remove();

                addMessage(
                    "AI Error: " +
                    error.message,
                    "bot"
                );

                console.error(error);
            }
        }
    );
}


function addMessage(text, type) {

    const message =
        document.createElement("div");

    message.className = type;

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;

    return message;
}


/* START */

loadNews();
