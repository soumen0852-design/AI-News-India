// api/assistant.js

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed"
    });
  }

  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not configured"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "You are the AI News India Assistant. Answer clearly and briefly. Help users with AI, technology, India, West Bengal, world news and general questions. Do not claim that you have live information unless it is provided in the conversation.",
          input: question,
          max_output_tokens: 500
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(500).json({
        success: false,
        error: "AI service is temporarily unavailable"
      });
    }

    const answer =
      data.output_text ||
      "Sorry, I could not generate an answer.";

    return res.status(200).json({
      success: true,
      answer
    });

  } catch (error) {
    console.error("Assistant error:", error);

    return res.status(500).json({
      success: false,
      error: "Assistant temporarily unavailable"
    });
  }
}
<script>
  const chatForm = document.getElementById("chatForm");
  const questionInput = document.getElementById("question");
  const chat = document.getElementById("chat");

  if (chatForm) {
    chatForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const question = questionInput.value.trim();

      if (!question) return;

      // User message
      const userMessage = document.createElement("div");
      userMessage.className = "user";
      userMessage.textContent = question;
      chat.appendChild(userMessage);

      questionInput.value = "";

      // Loading
      const loading = document.createElement("div");
      loading.className = "bot";
      loading.textContent = "Thinking...";
      chat.appendChild(loading);

      chat.scrollTop = chat.scrollHeight;

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: question
          })
        });

        const data = await response.json();

        loading.remove();

        const botMessage = document.createElement("div");
        botMessage.className = "bot";

        if (data.success) {
          botMessage.textContent = data.answer;
        } else {
          botMessage.textContent =
            "Sorry, AI Assistant এখন কাজ করছে না।";
        }

        chat.appendChild(botMessage);

      } catch (error) {
        console.error(error);

        loading.remove();

        const errorMessage = document.createElement("div");
        errorMessage.className = "bot";
        errorMessage.textContent =
          "Connection error. Please try again.";

        chat.appendChild(errorMessage);
      }

      chat.scrollTop = chat.scrollHeight;
    });
  }
</script>

<script src="/app.js"></script>
<script src="/app.js"></script>
