const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    apiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Server is missing OPENAI_API_KEY. Add it to .env before chatting.",
      });
    }

    const { model, messages, temperature } = req.body || {};

    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Invalid payload. Expected { model, messages }.",
      });
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: Number.isFinite(temperature) ? temperature : 0.6,
        messages,
      }),
    });

    if (!openAIResponse.ok) {
      const text = await openAIResponse.text();
      return res.status(openAIResponse.status).json({
        error: `OpenAI API error: ${text}`,
      });
    }

    const data = await openAIResponse.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: "Model returned an empty response." });
    }

    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`Razed AI server running on http://localhost:${port}`);
});
