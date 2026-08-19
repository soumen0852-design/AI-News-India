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

const assistant = document.getElementById("assistant");
const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const question = document.getElementById("question");

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
// LOAD NEWS
// ========================================

async function loadNews() {
    if (!newsGrid) return;

    if (statusEl) {
        statusEl.textContent = "Loading news...";
    }

    newsGrid.innerHTML = `
        <div class="empty">
            Loading latest news...
        </div>
    `;

    try {
        const params = new URLSearchParams();

        if (currentCategory && currentCategory !== "All") {
            params.set("category", currentCategory);
        }

        if (searchEl && searchEl.value.trim()) {
            params.set("q", searchEl.value.trim());
        }

        const response = await fetch(`/api/news?${params.toString()}`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("News API failed");
        }

        const data = await response.json();

        allNews = Array.isArray(data.items)
            ? data.items
            : Array.isArray(data)
                ? data
                : [];

        renderNews(allNews);

        if (statusEl) {
            statusEl.textContent =
                "Updated " + new Date().toLocaleTimeString();
        }

    } catch (error) {
        console.error("News error:", error);

        newsGrid.innerHTML = `
            <div class="empty">
                <h3>News could not be loaded</h3>
                <p>Please try again.</p>
            </div>
        `;

        if (statusEl) {
            statusEl.textContent = "News loading failed";
        }

        if (countEl) {
            countEl.textContent = "0 stories";
        }
    }
}

// ========================================
// RENDER NEWS
// ========================================

function renderNews(items) {
    if (!newsGrid) return;

    if (countEl) {
        countEl.textContent = `${items.length} stories`;
    }

    if (!items.length) {
        newsGrid.innerHTML = `
            <div class="empty">
                <h3>No news found</h3>
                <p>Try another search or category.</p>
            </div>
        `;
        return;
    }

    newsGrid.innerHTML = items.map((item, index) => {

        const title =
            escapeHTML(item.title || "Untitled News");

        const description =
            escapeHTML(
                item.description ||
                item.content ||
                "Read the latest news."
            );

        const source =
            escapeHTML(item.source || "AI News India");

        const category =
            escapeHTML(item.category || "News");

        const link =
            safeURL(item.link || item.url);

        const date =
            item.publishedAt ||
            item.pubDate ||
            item.isoDate ||
            "";

        const dateText = date
            ? new Date(date).toLocaleString()
            : "";

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
                        <span>${source}</span>
                        <span>${escapeHTML(dateText)}</span>
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
    }).join("");
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
// SEARCH
// ========================================

if (searchEl) {
    let searchTimer;

    searchEl.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            loadNews();
        }, 500);
    });
}

// ========================================
// REFRESH
// ========================================

if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        loadNews();
    });
}

// ========================================
// CATEGORY BUTTONS
// ========================================

document.querySelectorAll("[data-category]").forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll("[data-category]")
            .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        currentCategory =
            button.dataset.category || "All";

        loadNews();
    });

});

// ========================================
// THEME
// ========================================

if (themeBtn) {

    themeBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        localStorage.setItem(
            "theme",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );

    });

}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

// ========================================
// AI ASSISTANT
// ========================================

// 7 LINE AI ASSISTANT CODE

const $=id=>document.getElementById(id);
window.openAssistant=()=>$( "assistant").classList.remove("hidden");
window.closeAssistant=()=>$( "assistant").classList.add("hidden");
$("chatForm").onsubmit=async e=>{e.preventDefault();let q=$("question").value.trim();if(!q)return;$("chat").innerHTML+=`<div class="user">${escapeHTML(q)}</div>`;$("question").value="";let r=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q})});let d=await r.json();$("chat").innerHTML+=`<div class="bot">${escapeHTML(d.answer||d.error||"No response")}</div>`};
$("question").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("chatForm").requestSubmit()}});
window.addEventListener("load",()=>{if(newsGrid)loadNews()});

// ========================================
// START
// ========================================

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadNews);
} else {
    loadNews();
}
