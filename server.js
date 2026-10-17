const express = require("express");
const path = require("path");
const mammoth = require("mammoth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMMA_API_KEY;
const MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

// Support uploads of images and documents up to 25MB
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(API_KEY) });
});

// Helper to determine if file is text/code based on mime type or extension
function isTextFile(fileName = "", mimeType = "") {
  if (mimeType.startsWith("text/")) return true;
  const textMimes = [
    "application/json",
    "application/javascript",
    "application/x-javascript",
    "application/xml",
    "application/csv"
  ];
  if (textMimes.includes(mimeType)) return true;

  const ext = path.extname(fileName).toLowerCase();
  const textExts = [
    ".txt", ".md", ".json", ".csv", ".js", ".jsx", ".ts", ".tsx",
    ".py", ".html", ".htm", ".css", ".scss", ".java", ".c", ".cpp",
    ".h", ".hpp", ".cs", ".go", ".rs", ".php", ".rb", ".sql", ".sh",
    ".xml", ".yaml", ".yml", ".ini", ".env", ".log"
  ];
  return textExts.includes(ext);
}

app.post("/api/study", async (req, res) => {
  try {
    const rawTopic = String(req.body.topic || "").trim().slice(0, 8000);
    const mode = String(req.body.mode || "explain");
    const file = req.body.file; // { name, type, base64, size }

    if (!rawTopic && !file) {
      return res.status(400).json({
        error: "Please enter a topic or upload a document/image to study."
      });
    }

    if (!API_KEY) {
      return res.status(503).json({
        error: "Gemma API key is not configured. Please check your .env file."
      });
    }

    const instructions = {
      explain: "Explain the concepts in simple, beginner-friendly language. Structure your answer with clear markdown headings, a quick overview, key bullet points, analogies, and a practical real-world example.",
      summary: "Create organized, easy-to-review study notes. Use a clear title, bullet points for key takeaways, formulas/definitions, and a quick recap checklist.",
      quiz: "Create 5 beginner-friendly multiple-choice questions based on the content. For each question, provide 4 options (A, B, C, D). Immediately below each question, reveal the correct answer and a concise explanation."
    };

    const taskInstruction = instructions[mode] || instructions.explain;
    const parts = [];

    // Process file attachment if present
    if (file && file.base64) {
      const fileName = file.name || "uploaded-file";
      const fileType = file.type || "application/octet-stream";
      const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
      const isImage = fileType.startsWith("image/");
      const isDocx = fileType.includes("wordprocessingml") || fileName.toLowerCase().endsWith(".docx");

      if (isImage || isPdf) {
        // Native inlineData support in Gemma
        const normalizedMime = isPdf ? "application/pdf" : fileType;
        parts.push({
          inlineData: {
            mimeType: normalizedMime,
            data: file.base64
          }
        });
      } else if (isDocx) {
        // Parse DOCX via Mammoth
        try {
          const buffer = Buffer.from(file.base64, "base64");
          const extracted = await mammoth.extractRawText({ buffer });
          const docText = extracted.value.slice(0, 45000);
          parts.push({
            text: `[Attached Word Document: "${fileName}"]\n\n${docText}\n\n[End of Document]`
          });
        } catch (docxErr) {
          console.warn("DOCX extraction warning:", docxErr.message);
          parts.push({
            text: `[Attached Word Document: "${fileName}" (Notice: unable to extract text fully)]`
          });
        }
      } else if (isTextFile(fileName, fileType)) {
        // Decode base64 to text
        try {
          const buffer = Buffer.from(file.base64, "base64");
          const textContent = buffer.toString("utf-8").slice(0, 45000);
          parts.push({
            text: `[Attached Text File: "${fileName}"]\n\`\`\`\n${textContent}\n\`\`\`\n[End of File]`
          });
        } catch (txtErr) {
          console.warn("Text decoding warning:", txtErr.message);
        }
      } else {
        // Fallback for other files - try passing as inlineData
        parts.push({
          inlineData: {
            mimeType: fileType,
            data: file.base64
          }
        });
      }
    }

    const defaultPrompt = file
      ? `Please examine the attached document/image and provide a comprehensive ${mode === "quiz" ? "quiz" : mode === "summary" ? "summary" : "explanation"} based on it.`
      : "Please provide a study guide.";

    const promptText = `You are StudyMate AI, an expert, patient, and encouraging study tutor.
Tone: Clear, approachable, and engaging (English or Hinglish depending on the user's input).
Formatting:
- Use rich GitHub-flavored Markdown.
- Use clear headers (##, ###) to organize sections.
- Use bullet points, bold key terms, and formatted tables where helpful.
- For code or mathematical formulas, use proper code blocks with language identifiers.

Study Mode: ${taskInstruction}

Student Question / Topic:
${rawTopic || defaultPrompt}`;

    parts.push({ text: promptText });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2500
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message || `Gemma request failed (HTTP ${response.status}).`;
      return res.status(response.status).json({ error: message });
    }

    const responseParts = data.candidates?.[0]?.content?.parts || [];
    const thoughts = [];
    const answers = [];

    for (const part of responseParts) {
      if (part.thought) {
        thoughts.push(part.text || "");
      } else if (part.text) {
        answers.push(part.text || "");
      }
    }

    const thought = thoughts.join("\n").trim();
    let answer = answers.join("\n").trim();

    // Fallback if model only returned parts without thought flag or only thought
    if (!answer && thought) {
      answer = thought;
    }

    if (!answer) {
      return res.status(502).json({
        error: "Gemma returned an empty response. Please try again."
      });
    }

    res.json({
      answer,
      thought: thought && thought !== answer ? thought : null,
      model: MODEL
    });
  } catch (error) {
    console.error("StudyMate request error:", error);
    res.status(500).json({
      error: "Could not complete request. Please check your connection and try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
  console.log(`Gemma model: ${MODEL}`);
  if (!API_KEY) console.log("Setup needed: Add GEMMA_API_KEY to your .env file.");
});