const chatForm = document.getElementById("chatForm");
const question = document.getElementById("question");
const chat = document.getElementById("chat");

window.openAssistant = function () {
  document.getElementById("assistant").classList.remove("hidden");
};

window.closeAssistant = function () {
  document.getElementById("assistant").classList.add("hidden");
};

chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const text = question.value.trim();

  if (!text) return;

  chat.innerHTML += `<div class="user">${text}</div>`;

  question.value = "";

  chat.innerHTML += `<div class="bot" id="loading">Thinking...</div>`;

  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: text
      })
    });

    const data = await response.json();

    document.getElementById("loading").remove();

    chat.innerHTML += `
      <div class="bot">
        ${data.answer || data.error || "No response"}
      </div>
    `;

  } catch (error) {

    document.getElementById("loading").remove();

    chat.innerHTML += `
      <div class="bot">
        AI Assistant connection failed.
      </div>
    `;

  }

  chat.scrollTop = chat.scrollHeight;
});
