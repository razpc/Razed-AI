const STORAGE_KEY = "razed-ai-settings";
const CHAT_KEY = "razed-ai-chat";

const PROMPTS = {
  assistant: `You are Razed AI, a practical and friendly assistant.
Made by OroLabs.
- Be direct, accurate, and concise.
- Ask clarifying questions only when needed.
- Use markdown when it improves readability.
- If a request is unsafe or disallowed, refuse briefly and offer a safer alternative.`,
  coder: `You are Razed AI, made by OroLabs.
You are an expert software engineer.
- Write clear, production-minded code.
- Explain tradeoffs briefly.
- Prefer safe defaults and tests when possible.`,
  founder: `You are Razed AI, made by OroLabs.
You are a startup strategy copilot.
- Prioritize practical execution.
- Suggest concise step-by-step plans.
- Focus on growth, positioning, and product velocity.`,
};

const el = {
  model: document.getElementById("model"),
  temperature: document.getElementById("temperature"),
  systemPrompt: document.getElementById("systemPrompt"),
  chatLog: document.getElementById("chatLog"),
  chatForm: document.getElementById("chatForm"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  clearChat: document.getElementById("clearChat"),
  exportChat: document.getElementById("exportChat"),
  statusBadge: document.getElementById("statusBadge"),
  messageTemplate: document.getElementById("messageTemplate"),
  promptChips: Array.from(document.querySelectorAll(".chip")),
};

let messages = [];

initialize();

function initialize() {
  loadSettings();
  loadChat();
  checkServerHealth();

  el.chatForm.addEventListener("submit", onSendMessage);
  el.clearChat.addEventListener("click", clearChat);
  el.exportChat.addEventListener("click", exportChat);

  [el.model, el.temperature, el.systemPrompt].forEach((input) => {
    input.addEventListener("input", saveSettings);
  });

  el.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      el.chatForm.requestSubmit();
    }
  });

  el.promptChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = PROMPTS[chip.dataset.prompt];
      if (preset) {
        el.systemPrompt.value = preset;
        saveSettings();
      }
    });
  });

  if (messages.length === 0) {
    appendMessage(
      "assistant",
      "Hi, I’m **Razed AI** (made by OroLabs). Ask me anything and I’ll help step-by-step."
    );
  }
}

async function checkServerHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();

    if (!data.ok) {
      setStatus("Server unavailable", "bad");
      return;
    }

    if (!data.apiConfigured) {
      setStatus("Missing OPENAI_API_KEY in .env", "warn");
      return;
    }

    setStatus("Server online + key loaded", "ok");
  } catch (_error) {
    setStatus("Cannot reach server", "bad");
  }
}

function setStatus(text, type) {
  el.statusBadge.textContent = text;
  el.statusBadge.className = `status-badge ${type}`;
}

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  el.model.value = saved.model || "gpt-4o-mini";
  el.temperature.value = typeof saved.temperature === "number" ? saved.temperature : 0.6;
  el.systemPrompt.value = saved.systemPrompt || PROMPTS.assistant;
}

function saveSettings() {
  const settings = {
    model: el.model.value,
    temperature: Number(el.temperature.value),
    systemPrompt: el.systemPrompt.value.trim() || PROMPTS.assistant,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadChat() {
  messages = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  messages.forEach((msg) => appendMessage(msg.role, msg.content, false));
}

function persistChat() {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
}

function appendMessage(role, content, persist = true) {
  const node = el.messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(role);

  const avatar = node.querySelector(".avatar");
  const bubble = node.querySelector(".bubble");
  const copyBtn = node.querySelector(".copy-btn");

  avatar.textContent = role === "user" ? "You" : "AI";
  bubble.textContent = content;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 900);
    } catch (_error) {
      copyBtn.textContent = "Failed";
      setTimeout(() => (copyBtn.textContent = "Copy"), 900);
    }
  });

  el.chatLog.appendChild(node);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;

  if (persist) {
    messages.push({ role, content });
    persistChat();
  }
}

function addTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "typing";
  indicator.id = "typing-indicator";
  indicator.textContent = "Razed AI is thinking…";
  el.chatLog.appendChild(indicator);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById("typing-indicator")?.remove();
}

async function onSendMessage(event) {
  event.preventDefault();

  const text = el.messageInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  el.messageInput.value = "";
  el.sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: el.model.value,
        temperature: Number(el.temperature.value),
        messages: [
          {
            role: "system",
            content: el.systemPrompt.value.trim() || PROMPTS.assistant,
          },
          ...messages.map(({ role, content }) => ({ role, content })),
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unknown API error");
    }

    if (!data.reply) {
      throw new Error("The model returned an empty response.");
    }

    appendMessage("assistant", data.reply);
  } catch (error) {
    appendMessage("assistant", `Sorry, something went wrong: ${error.message}`);
  } finally {
    removeTypingIndicator();
    el.sendBtn.disabled = false;
  }
}

function clearChat() {
  messages = [];
  el.chatLog.innerHTML = "";
  localStorage.removeItem(CHAT_KEY);
  appendMessage("assistant", "Chat cleared. How can I help?");
}

function exportChat() {
  const payload = {
    exportedAt: new Date().toISOString(),
    model: el.model.value,
    temperature: Number(el.temperature.value),
    systemPrompt: el.systemPrompt.value,
    messages,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `razed-ai-chat-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
