"use strict";

// ==========================================
// AI NEWS INDIA - FRONTEND JAVASCRIPT
// ==========================================

const newsGrid = document.getElementById("newsGrid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");

const themeBtn = document.getElementById("themeBtn");

const assistant = document.getElementById("assistant");
const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("question");

let currentCategory = "All";


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// SAFE URL
// ==========================================

function safeUrl(url) {

    try {

        const parsed = new URL(url);

        if (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        ) {
            return parsed.href;
        }

        return "#";

    } catch (error) {

        return "#";

    }
}


// ==========================================
// LOAD NEWS
// ==========================================

async function loadNews() {

    if (!newsGrid) return;

    statusEl.textContent = "Loading news...";

    try {

        const params = new URLSearchParams();

        if (currentCategory !== "All") {

            params.set(
                "category",
                currentCategory
            );

        }

        if (
            searchEl &&
            searchEl.value.trim()
        ) {

            params.set(
                "q",
                searchEl.value.trim()
            );

        }


        const response = await fetch(
            "/api/news?" +
            params.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "News API failed"
            );

        }


        renderNews(
            data.items || []
        );


        if (data.updatedAt) {

            statusEl.textContent =
                "Updated " +
                new Date(
                    data.updatedAt
                ).toLocaleTimeString();

        } else {

            statusEl.textContent =
                "News updated";

        }


    } catch (error) {

        console.error(
            "NEWS ERROR:",
            error
        );


        statusEl.textContent =
            "News loading failed";


        newsGrid.innerHTML = `
            <div class="empty">
                <h3>Unable to load news</h3>
                <p>Please try again.</p>
            </div>
        `;

    }

}


// ==========================================
// DISPLAY NEWS
// ==========================================

function renderNews(items) {

    if (!newsGrid) return;


    if (countEl) {

        countEl.textContent =
            `${items.length} stories`;

    }


    if (!items.length) {

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>No news found</h3>
                <p>Try another category or search.</p>
            </div>
        `;

        return;

    }


    newsGrid.innerHTML =
        items.map(item => {

            const title =
                escapeHtml(
                    item.title ||
                    "Untitled news"
                );


            const description =
                escapeHtml(
                    item.description ||
                    "Latest news update."
                );


            const category =
                escapeHtml(
                    item.category ||
                    "News"
                );


            const source =
                escapeHtml(
                    item.source ||
                    "News source"
                );


            const link =
                safeUrl(
                    item.link
                );


            let date = "";

            if (item.publishedAt) {

                try {

                    date =
                        new Date(
                            item.publishedAt
                        ).toLocaleString();

                } catch (error) {

                    date = "";

                }

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

        }).join("");

}


// ==========================================
// CATEGORY BUTTONS
// ==========================================

document
    .querySelectorAll(".navitem")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".navitem"
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
                    button.dataset.cat ||
                    "All";


                loadNews();

            }
        );

    });


// ==========================================
// SEARCH
// ==========================================

if (searchEl) {

    let searchTimer;


    searchEl.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {
                        loadNews();
                    },
                    500
                );

        }
    );

}


// ==========================================
// REFRESH NEWS
// ==========================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async () => {

            refreshBtn.disabled =
                true;


            refreshBtn.textContent =
                "Refreshing...";


            try {

                const response =
                    await fetch(
                        "/api/refresh",
                        {
                            method: "POST"
                        }
                    );


                if (!response.ok) {

                    console.warn(
                        "Refresh API failed"
                    );

                }

            } catch (error) {

                console.error(
                    "REFRESH ERROR:",
                    error
                );

            }


            await loadNews();


            refreshBtn.disabled =
                false;


            refreshBtn.textContent =
                "↻ Refresh now";

        }
    );

}


// ==========================================
// DARK MODE
// ==========================================

if (themeBtn) {

    themeBtn.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );


            const isDark =
                document.body.classList.contains(
                    "dark"
                );


            themeBtn.textContent =
                isDark
                    ? "☀️"
                    : "🌙";


            try {

                localStorage.setItem(
                    "ai-news-theme",
                    isDark
                        ? "dark"
                        : "light"
                );

            } catch (error) {}

        }
    );

}


// Restore theme

try {

    const savedTheme =
        localStorage.getItem(
            "ai-news-theme"
        );


    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );


        if (themeBtn) {

            themeBtn.textContent =
                "☀️";

        }

    }

} catch (error) {}


// ==========================================
// OPEN AI ASSISTANT
// ==========================================

function openAssistant() {

    if (!assistant) return;


    assistant.classList.remove(
        "hidden"
    );


    if (questionInput) {

        setTimeout(
            () => {
                questionInput.focus();
            },
            100
        );

    }

}


window.openAssistant =
    openAssistant;


// ==========================================
// CLOSE AI ASSISTANT
// ==========================================

function closeAssistant() {

    if (!assistant) return;


    assistant.classList.add(
        "hidden"
    );

}


window.closeAssistant =
    closeAssistant;


// ==========================================
// AI ASSISTANT CHAT
// ==========================================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!questionInput) {
                return;
            }


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


            const loadingMessage =
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

                            body:
                                JSON.stringify({
                                    question:
                                        question
                                })
                        }
                    );


                let data = {};


                try {

                    data =
                        await response.json();

                } catch (error) {

                    throw new Error(
                        "Server returned an invalid response."
                    );

                }


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.details ||
                        `Server error ${response.status}`
                    );

                }


                loadingMessage.remove();


                const answer =
                    data.answer ||
                    "I could not generate an answer.";


                addMessage(
                    answer,
                    "bot"
                );


            } catch (error) {

                console.error(
                    "AI ASSISTANT ERROR:",
                    error
                );


                loadingMessage.remove();


                addMessage(
                    "AI Assistant error: " +
                    error.message,
                    "bot"
                );

            }

        }
    );

}


// ==========================================
// ADD CHAT MESSAGE
// ==========================================

function addMessage(
    text,
    type
) {

    if (!chat) {
        return null;
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        type === "user"
            ? "user"
            : "bot";


    message.textContent =
        text;


    chat.appendChild(
        message
    );


    chat.scrollTop =
        chat.scrollHeight;


    return message;

}


// ==========================================
// CLOSE ASSISTANT WITH ESC
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeAssistant();

        }

    }
);


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadNews();

    }
);
