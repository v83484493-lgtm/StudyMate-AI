const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMMA_API_KEY;
const MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(API_KEY) });
});

app.post("/api/study", async (req, res) => {
  try {
    const topic = String(req.body.topic || "").trim().slice(0, 5000);
    const mode = String(req.body.mode || "explain");

    if (!topic) {
      return res.status(400).json({ error: "Pehle apna topic ya question likho." });
    }
    if (!API_KEY) {
      return res.status(503).json({
        error: "Gemma API key set nahi hai. Project folder mein .env file banao aur GEMMA_API_KEY add karo."
      });
    }

    const instructions = {
      explain: "Explain the topic in simple beginner-friendly language. Use a short explanation, 3 key points, and one example.",
      summary: "Create concise study notes. Use a title, bullet points, and a short recap.",
      quiz: "Create 5 beginner-friendly multiple-choice questions. Give 4 options per question and show the correct answer with a short explanation."
    };
    const prompt = `You are StudyMate, a helpful study assistant. Reply in simple English or Hinglish depending on the user's input. Be accurate and clear.\nTask: ${instructions[mode] || instructions.explain}\nStudent's topic/question:\n${topic}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message || `Gemma request failed (HTTP ${response.status}).`;
      return res.status(response.status).json({ error: message });
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({ error: "Gemma ne empty response diya. Dobara try karo." });
    }
    res.json({ answer, model: MODEL });
  } catch (error) {
    console.error("StudyMate request error:", error.message);
    res.status(500).json({
      error: "Request complete nahi hua. Internet check karo aur dobara try karo."
    });
  }
});

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
  console.log(`Gemma model: ${MODEL}`);
  if (!API_KEY) console.log("Setup needed: .env file mein GEMMA_API_KEY add karo.");
});