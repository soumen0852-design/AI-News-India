"use strict";

// ========================================
// AI NEWS INDIA - APP.JS
// ========================================

const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");
const themeBtn = document.getElementById("themeBtn");

let currentCategory = "All";
let allNews = [];

// ========================================
// SAFE HTML
// ========================================

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ========================================
// SAFE URL
// ========================================

function safeURL(url) {
    try {
        if (!url) return "#";

        const parsed = new URL(url);

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

// ========================================
// LOAD NEWS
// ========================================

async function loadNews() {

    if (!newsGrid) return;

    if (statusEl) {
        statusEl.textContent = "Loading latest news...";
    }

    newsGrid.innerHTML = `
        <div class="empty">
            <h3>Loading latest news...</h3>
            <p>Please wait...</p>
        </div>
    `;

    try {

        const params = new URLSearchParams();

        if (
            currentCategory &&
            currentCategory !== "All"
        ) {
            params.set("category", currentCategory);
        }

        if (
            searchEl &&
            searchEl.value.trim()
        ) {
            params.set("q", searchEl.value.trim());
        }

        const apiURL =
            "/api/news" +
            (params.toString()
                ? "?" + params.toString()
                : "");

        const controller =
            new AbortController();

        const timeout =
            setTimeout(() => {
                controller.abort();
            }, 15000);

        const response = await fetch(apiURL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(
                "API Error: " + response.status
            );
        }

        const data = await response.json();

        console.log("NEWS API RESPONSE:", data);

        // Support multiple response formats
        if (Array.isArray(data)) {
            allNews = data;
        } else if (Array.isArray(data.items)) {
            allNews = data.items;
        } else if (Array.isArray(data.news)) {
            allNews = data.news;
        } else if (Array.isArray(data.data)) {
            allNews = data.data;
        } else {
            allNews = [];
        }

        renderNews(allNews);

        if (statusEl) {
            statusEl.textContent =
                allNews.length > 0
                    ? "News updated just now"
                    : "No news available";
        }

    } catch (error) {

        console.error(
            "News loading error:",
            error
        );

        if (newsGrid) {
            newsGrid.innerHTML = `
                <div class="empty">
                    <h3>News could not be loaded</h3>
                    <p>
                        Please try again in a few seconds.
                    </p>

                    <button
                        onclick="loadNews()"
                        class="retry-btn"
                    >
                        ↻ Try Again
                    </button>
                </div>
            `;
        }

        if (statusEl) {
            statusEl.textContent =
                "News loading failed";
        }

        if (countEl) {
            countEl.textContent =
                "0 stories";
        }
    }
}

// ========================================
// RENDER NEWS
// ========================================

function renderNews(items) {

    if (!newsGrid) return;

    if (countEl) {
        countEl.textContent =
            `${items.length} stories`;
    }

    if (!items.length) {

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>No news available right now</h3>
                <p>
                    Please refresh after a few seconds.
                </p>

                <button
                    onclick="loadNews()"
                    class="retry-btn"
                >
                    ↻ Refresh News
                </button>
            </div>
        `;

        return;
    }

    newsGrid.innerHTML = items
        .map((item) => {

            const title = escapeHTML(
                item.title ||
                item.name ||
                "Latest News"
            );

            const description =
                escapeHTML(
                    item.description ||
                    item.content ||
                    item.summary ||
                    "Read the latest news story."
                );

            const source =
                escapeHTML(
                    item.source ||
                    item.publisher ||
                    "AI News India"
                );

            const category =
                escapeHTML(
                    item.category ||
                    "Latest News"
                );

            const link =
                safeURL(
                    item.link ||
                    item.url ||
                    item.href
                );

            const date =
                item.publishedAt ||
                item.pubDate ||
                item.isoDate ||
                item.date ||
                "";

            let dateText = "";

            if (date) {
                const parsedDate =
                    new Date(date);

                if (!isNaN(parsedDate)) {
                    dateText =
                        parsedDate.toLocaleString(
                            "en-IN"
                        );
                }
            }

            return `
                <article class="news-card">

                    <div class="news-card-body">

                        <span class="news-category">
                            ${category}
                        </span>

                        <h2>
                            ${title}
                        </h2>

                        <p>
                            ${description}
                        </p>

                        <div class="news-meta">

                            <span>
                                ${source}
                            </span>

                            <span>
                                ${escapeHTML(dateText)}
                            </span>

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

                    </div>

                </article>
            `;
        })
        .join("");
}

// ========================================
// SEARCH
// ========================================

if (searchEl) {

    let searchTimer;

    searchEl.addEventListener(
        "input",
        () => {

            clearTimeout(searchTimer);

            searchTimer = setTimeout(
                () => {
                    loadNews();
                },
                600
            );
        }
    );
}

// ========================================
// REFRESH
// ========================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        () => {
            loadNews();
        }
    );
}

// ========================================
// CATEGORY
// ========================================

document
    .querySelectorAll("[data-category]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        "[data-category]"
                    )
                    .forEach(btn => {
                        btn.classList.remove(
                            "active"
                        );
                    });

                button.classList.add(
                    "active"
                );

                currentCategory =
                    button.dataset.category ||
                    "All";

                loadNews();
            }
        );
    });

// ========================================
// THEME
// ========================================

if (themeBtn) {

    themeBtn.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            localStorage.setItem(
                "theme",
                document.body.classList.contains(
                    "dark"
                )
                    ? "dark"
                    : "light"
            );
        }
    );
}

if (
    localStorage.getItem("theme") ===
    "dark"
) {
    document.body.classList.add(
        "dark"
    );
}

// ========================================
// AI ASSISTANT
// ========================================

window.openAssistant = function () {

    const assistant =
        document.getElementById(
            "assistant"
        );

    if (assistant) {
        assistant.classList.remove(
            "hidden"
        );
    }
};

window.closeAssistant = function () {

    const assistant =
        document.getElementById(
            "assistant"
        );

    if (assistant) {
        assistant.classList.add(
            "hidden"
        );
    }
};

const chatForm =
    document.getElementById(
        "chatForm"
    );

const chat =
    document.getElementById(
        "chat"
    );

const question =
    document.getElementById(
        "question"
    );

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const q =
                question
                    ? question.value.trim()
                    : "";

            if (!q) return;

            if (chat) {
                chat.innerHTML += `
                    <div class="user">
                        ${escapeHTML(q)}
                    </div>
                `;
            }

            if (question) {
                question.value = "";
            }

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
                            body:
                                JSON.stringify({
                                    question: q
                                })
                        }
                    );

                const data =
                    await response.json();

                if (chat) {
                    chat.innerHTML += `
                        <div class="bot">
                            ${escapeHTML(
                                data.answer ||
                                data.error ||
                                "No response"
                            )}
                        </div>
                    `;
                }

            } catch (error) {

                console.error(
                    "Assistant error:",
                    error
                );

                if (chat) {
                    chat.innerHTML += `
                        <div class="bot">
                            Sorry, AI Assistant
                            is temporarily unavailable.
                        </div>
                    `;
                }
            }
        }
    );
}

if (question) {

    question.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (chatForm) {
                    chatForm.requestSubmit();
                }
            }
        }
    );
}

// ========================================
// START APP
// ========================================

window.addEventListener(
    "load",
    () => {
        loadNews();
    }
);

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        loadNews
    );

} else {

    loadNews();
}
