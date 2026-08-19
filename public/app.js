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


// ===============================
// HTML SAFETY
// ===============================

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// SAFE LINK
// ===============================

function safeUrl(url) {

    try {

        const link = new URL(url);

        if (
            link.protocol === "http:" ||
            link.protocol === "https:"
        ) {
            return link.href;
        }

    } catch (error) {
        console.error(error);
    }

    return "#";
}


// ===============================
// LOAD NEWS
// ===============================

async function loadNews() {

    if (!newsGrid) return;

    statusEl.textContent =
        "Loading news...";

    try {

        const params =
            new URLSearchParams();

        if (
            currentCategory !== "All"
        ) {

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


        const response =
            await fetch(
                "/api/news?" +
                params.toString(),
                {
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


        statusEl.textContent =
            "Updated " +
            new Date(
                data.updatedAt
            ).toLocaleTimeString();


    } catch (error) {

        console.error(
            "NEWS ERROR:",
            error
        );


        statusEl.textContent =
            "News loading failed";


        newsGrid.innerHTML = `
            <div class="empty">
                <h3>News could not be loaded</h3>
                <p>Please try again later.</p>
            </div>
        `;

    }

}


// ===============================
// RENDER NEWS
// ===============================

function renderNews(items) {

    if (countEl) {

        countEl.textContent =
            `${items.length} stories`;

    }


    if (!items.length) {

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>No news found</h3>
                <p>Try another category.</p>
            </div>
        `;

        return;
    }


    newsGrid.innerHTML =
        items.map(item => {

            const title =
                escapeHtml(
                    item.title
                );


            const description =
                escapeHtml(
                    item.description
                );


            const category =
                escapeHtml(
                    item.category
                );


            const source =
                escapeHtml(
                    item.source
                );


            const link =
                safeUrl(
                    item.link
                );


            const date =
                item.publishedAt
                    ? new Date(
                        item.publishedAt
                    ).toLocaleString()
                    : "";


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


// ===============================
// CATEGORY
// ===============================

document
    .querySelectorAll(".navitem")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                document
                    .querySelectorAll(
                        ".navitem"
                    )
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                this.classList.add(
                    "active"
                );


                currentCategory =
                    this.dataset.cat ||
                    "All";


                loadNews();

            }
        );

    });


// ===============================
// SEARCH
// ===============================

if (searchEl) {

    let searchTimer;


    searchEl.addEventListener(
        "input",
        function () {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    loadNews,
                    500
                );

        }
    );

}


// ===============================
// REFRESH
// ===============================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async function () {

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

                console.error(
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


// ===============================
// AI ASSISTANT OPEN
// ===============================

window.openAssistant =
    function () {

        if (!assistant) return;

        assistant.classList.remove(
            "hidden"
        );

        if (questionInput) {

            questionInput.focus();

        }

    };


// ===============================
// AI ASSISTANT CLOSE
// ===============================

window.closeAssistant =
    function () {

        if (!assistant) return;

        assistant.classList.add(
            "hidden"
        );

    };


// ===============================
// AI CHAT
// ===============================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async function (event) {

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


            const loading =
                addMessage(
                    "AI is thinking...",
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

                console.error(
                    "AI ERROR:",
                    error
                );


                loading.remove();


                addMessage(
                    "AI Error: " +
                    error.message,
                    "bot"
                );

            }

        }
    );

}


// ===============================
// ADD CHAT MESSAGE
// ===============================

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
        type;


    message.textContent =
        text;


    chat.appendChild(
        message
    );


    chat.scrollTop =
        chat.scrollHeight;


    return message;

}


// ===============================
// INITIAL LOAD
// ===============================

loadNews();
