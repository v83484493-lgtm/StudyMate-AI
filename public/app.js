// StudyMate AI — Client Application
// Frozen Glass & ChatGPT-Style Multimodal Study Assistant

(function () {
  "use strict";

  // State
  let currentMode = "explain";
  let attachedFile = null; // { name, type, base64, size, isImage, previewUrl }
  let currentUtterance = null;

  // DOM Elements
  const topicInput = document.getElementById("topic");
  const askBtn = document.getElementById("ask");
  const modeTabs = document.querySelectorAll(".mode-tab");
  const quickChips = document.querySelectorAll(".glass-chip");
  const fileInput = document.getElementById("file-input");
  const attachBtn = document.getElementById("btn-attach");
  const filePreviewCard = document.getElementById("file-preview-card");
  const filePreviewName = document.getElementById("file-preview-name");
  const filePreviewBox = document.getElementById("preview-media-box");
  const filePreviewSize = document.getElementById("file-preview-size");
  const removeFileBtn = document.getElementById("btn-remove-file");
  const dropZone = document.getElementById("drop-zone");
  const statusBar = document.getElementById("status-bar");
  const statusText = document.getElementById("status-text");
  const charCount = document.getElementById("char-count");
  const chatTimeline = document.getElementById("chat-timeline");
  const emptyState = document.getElementById("empty-state");
  const clearChatBtn = document.getElementById("btn-clear-chat");
  const modelTag = document.getElementById("model-tag");
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");

  // Format bytes helper
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Toast notification
  let toastTimer = null;
  function showToast(message, icon = "✓") {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toastIcon.textContent = icon;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  // Check backend health
  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        if (data.model) {
          modelTag.textContent = `${data.model} · Ready`;
        }
      }
    } catch {
      modelTag.textContent = "Offline Mode";
    }
  }
  checkHealth();

  // Mode Selection
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      modeTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      currentMode = tab.dataset.mode || "explain";
    });
  });

  // Quick prompt chips
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        topicInput.value = prompt;
        updateCharCount();
        topicInput.focus();
      }
    });
  });

  // Character counter
  function updateCharCount() {
    const len = topicInput.value.length;
    charCount.textContent = `${len} / 8000`;
  }
  topicInput.addEventListener("input", updateCharCount);

  // File Attachment Handling
  attachBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleSelectedFile(file);
  });

  function handleSelectedFile(file) {
    const maxSize = 22 * 1024 * 1024; // 22MB limit
    if (file.size > maxSize) {
      showToast("File is too large (max 20MB)", "⚠");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx = file.name.toLowerCase().endsWith(".docx");

    const reader = new FileReader();
    reader.onload = function (event) {
      const result = event.target.result;
      const base64Data = result.split(",")[1];

      attachedFile = {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        base64: base64Data,
        isImage: isImage,
        previewUrl: isImage ? result : null
      };

      renderFilePreview(attachedFile);
      showToast(`Attached: ${file.name}`, "📎");
    };

    reader.readAsDataURL(file);
  }

  function renderFilePreview(fileObj) {
    filePreviewName.textContent = fileObj.name;
    filePreviewSize.textContent = `${formatBytes(fileObj.size)} · Ready for Gemma`;
    filePreviewBox.innerHTML = "";

    if (fileObj.isImage && fileObj.previewUrl) {
      const img = document.createElement("img");
      img.src = fileObj.previewUrl;
      img.alt = fileObj.name;
      filePreviewBox.appendChild(img);
    } else {
      const ext = fileObj.name.split(".").pop().toUpperCase();
      const badge = document.createElement("span");
      badge.className = "doc-badge-icon";
      if (ext === "PDF") badge.textContent = "📄";
      else if (ext === "DOCX" || ext === "DOC") badge.textContent = "📝";
      else if (["JS", "PY", "JSON", "CSV", "HTML", "CSS"].includes(ext)) badge.textContent = "💻";
      else badge.textContent = "📑";
      filePreviewBox.appendChild(badge);
    }

    filePreviewCard.hidden = false;
  }

  function detachFile() {
    attachedFile = null;
    fileInput.value = "";
    filePreviewCard.hidden = true;
    filePreviewBox.innerHTML = "";
  }

  removeFileBtn.addEventListener("click", () => {
    detachFile();
    showToast("Attachment removed", "✕");
  });

  // Drag and Drop support
  ["dragenter", "dragover"].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drag-active");
    });
  });

  ["dragleave", "dragend"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-active");
    });
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drag-active");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  // Clipboard Paste support (e.g. screenshots)
  window.addEventListener("paste", (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleSelectedFile(file);
          break;
        }
      }
    }
  });

  // Reset / Clear Conversation
  clearChatBtn.addEventListener("click", () => {
    chatTimeline.innerHTML = "";
    emptyState.hidden = false;
    detachFile();
    topicInput.value = "";
    updateCharCount();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    statusText.textContent = "Timeline reset. Ready to study.";
    showToast("Study session reset", "✨");
  });

  // Escape HTML helper
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Time formatter
  function getFormattedTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Ask Gemma Main Action
  askBtn.addEventListener("click", handleAsk);
  topicInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAsk();
    }
  });

  async function handleAsk() {
    const text = topicInput.value.trim();
    if (!text && !attachedFile) {
      showToast("Please enter a question or attach a file", "💡");
      topicInput.focus();
      return;
    }

    // Save prompt reference & current file reference
    const submittedText = text;
    const submittedFile = attachedFile;
    const submittedMode = currentMode;

    // Reset input fields
    topicInput.value = "";
    updateCharCount();
    detachFile();

    // Hide empty state
    emptyState.hidden = true;

    // Append User Turn to Timeline
    appendUserTurn(submittedText, submittedFile);

    // Disable ask button & show thinking state
    askBtn.disabled = true;
    askBtn.innerHTML = '<span class="btn-text">Gemma Thinking…</span><span class="btn-sparkle">❄</span>';
    statusText.textContent = "Analyzing study material with Gemma...";

    // Create Assistant Placeholder Card in Timeline
    const assistantTurn = createAssistantPlaceholder(submittedMode);
    chatTimeline.appendChild(assistantTurn);
    assistantTurn.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const payload = {
        topic: submittedText,
        mode: submittedMode
      };

      if (submittedFile) {
        payload.file = {
          name: submittedFile.name,
          type: submittedFile.type,
          base64: submittedFile.base64,
          size: submittedFile.size
        };
      }

      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      // Populate Assistant Card with Response
      populateAssistantResponse(assistantTurn, data.answer, data.thought, data.model, submittedMode);
      statusText.textContent = `Completed with ${data.model}.`;
    } catch (err) {
      console.error(err);
      populateAssistantError(assistantTurn, err.message);
      statusText.textContent = "Error: " + err.message;
      showToast("Request failed: " + err.message, "⚠");
    } finally {
      askBtn.disabled = false;
      askBtn.innerHTML = '<span class="btn-text">Ask Gemma</span><span class="btn-sparkle">✦</span>';
    }
  }

  // Append User Message to Timeline
  function appendUserTurn(text, file) {
    const turnEl = document.createElement("div");
    turnEl.className = "chat-turn user-turn";

    let fileHtml = "";
    if (file) {
      if (file.isImage && file.previewUrl) {
        fileHtml = `
          <div class="user-attachment-chip">
            <img class="user-attachment-thumb" src="${file.previewUrl}" alt="${escapeHtml(file.name)}">
            <span class="user-attachment-name">Attached Image: ${escapeHtml(file.name)} (${formatBytes(file.size)})</span>
          </div>
        `;
      } else {
        const ext = file.name.split(".").pop().toUpperCase();
        fileHtml = `
          <div class="user-attachment-chip">
            <span style="font-size: 18px;">📄</span>
            <span class="user-attachment-name">Attached ${escapeHtml(ext)}: ${escapeHtml(file.name)} (${formatBytes(file.size)})</span>
          </div>
        `;
      }
    }

    turnEl.innerHTML = `
      <div class="user-message-card">
        <div class="user-header">
          <span class="user-badge">👤 You</span>
          <span class="user-timestamp">${getFormattedTime()}</span>
        </div>
        <div class="user-text">${escapeHtml(text || (file ? `Analyze this attached file: ${file.name}` : ""))}</div>
        ${fileHtml}
      </div>
    `;

    chatTimeline.appendChild(turnEl);
  }

  // Create Assistant Card Placeholder
  function createAssistantPlaceholder(mode) {
    const turnEl = document.createElement("div");
    turnEl.className = "chat-turn assistant-turn";

    turnEl.innerHTML = `
      <div class="assistant-card glass-card">
        <div class="assistant-header">
          <div class="assistant-identity">
            <div class="assistant-avatar">✦</div>
            <div class="assistant-name">StudyMate AI</div>
            <span class="mode-indicator-tag">${mode}</span>
          </div>
          <span class="user-timestamp">${getFormattedTime()}</span>
        </div>
        <div class="assistant-body">
          <div class="generating-shimmer">
            <span class="status-dot"></span> Generating study guide with Gemma…
            <span class="typing-cursor"></span>
          </div>
        </div>
      </div>
    `;
    return turnEl;
  }

  // Populate Assistant Card with Response (ChatGPT Format)
  function populateAssistantResponse(turnEl, answerText, thoughtText, model, mode) {
    const cardEl = turnEl.querySelector(".assistant-card");
    const bodyEl = turnEl.querySelector(".assistant-body");
    bodyEl.innerHTML = "";

    // 1. ChatGPT-Style Thought Accordion (if thought process present)
    if (thoughtText && thoughtText.trim().length > 0) {
      const thoughtDetails = document.createElement("details");
      thoughtDetails.className = "thought-accordion";
      const lineCount = thoughtText.split("\n").filter(Boolean).length;

      thoughtDetails.innerHTML = `
        <summary class="thought-summary">
          <span class="thought-label">
            <span>💭</span>
            <span>Thinking Process (${lineCount} lines)</span>
          </span>
          <span class="thought-arrow">▶</span>
        </summary>
        <div class="thought-content">${escapeHtml(thoughtText)}</div>
      `;
      bodyEl.appendChild(thoughtDetails);
    }

    // 2. Markdown Container
    const markdownContainer = document.createElement("div");
    markdownContainer.className = "markdown-body";
    bodyEl.appendChild(markdownContainer);

    // 3. Render Markdown via Marked
    let renderedHtml = "";
    if (window.marked && typeof window.marked.parse === "function") {
      renderedHtml = window.marked.parse(answerText);
    } else {
      renderedHtml = escapeHtml(answerText).replace(/\n/g, "<br>");
    }
    markdownContainer.innerHTML = renderedHtml;

    // 4. Enhance Code Blocks (ChatGPT style: header with language tag + copy button)
    enhanceCodeBlocks(markdownContainer);

    // 5. Action Toolbar below the answer
    const actionsEl = document.createElement("div");
    actionsEl.className = "assistant-actions";

    // Copy Button
    const copyBtn = document.createElement("button");
    copyBtn.className = "action-pill-btn";
    copyBtn.innerHTML = `<span>📋</span><span>Copy Answer</span>`;
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(answerText);
        showToast("Answer copied to clipboard!", "✓");
      } catch {
        showToast("Clipboard copy failed", "⚠");
      }
    });

    // Read Aloud (TTS) Button
    const speakBtn = document.createElement("button");
    speakBtn.className = "action-pill-btn";
    speakBtn.innerHTML = `<span>🔊</span><span>Read Aloud</span>`;
    speakBtn.addEventListener("click", () => {
      handleSpeech(answerText, speakBtn);
    });

    // Download as Markdown Note Button
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "action-pill-btn";
    downloadBtn.innerHTML = `<span>📥</span><span>Export Note</span>`;
    downloadBtn.addEventListener("click", () => {
      downloadAsNote(answerText, mode);
    });

    actionsEl.appendChild(copyBtn);
    actionsEl.appendChild(speakBtn);
    actionsEl.appendChild(downloadBtn);
    cardEl.appendChild(actionsEl);

    // Scroll smoothly to answer
    turnEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Populate Assistant Error Card
  function populateAssistantError(turnEl, errorMsg) {
    const bodyEl = turnEl.querySelector(".assistant-body");
    bodyEl.innerHTML = `
      <div style="color: var(--frost-rose); padding: 12px 16px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px;">
        <strong>⚠ Generation Error:</strong> ${escapeHtml(errorMsg)}
      </div>
    `;
  }

  // Enhance Code Blocks with header, language badge, copy code button, and syntax highlighting
  function enhanceCodeBlocks(container) {
    const preBlocks = container.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;

      // Detect language
      let lang = "code";
      const classes = Array.from(code.classList);
      for (const cls of classes) {
        if (cls.startsWith("language-")) {
          lang = cls.replace("language-", "");
          break;
        }
      }

      // Syntax highlight via hljs if available
      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        try {
          window.hljs.highlightElement(code);
        } catch (e) {
          console.warn("Highlight error:", e);
        }
      }

      // Wrap in custom ChatGPT-like code block
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langSpan = document.createElement("span");
      langSpan.className = "code-language";
      langSpan.textContent = lang;

      const copyCodeBtn = document.createElement("button");
      copyCodeBtn.className = "copy-code-btn";
      copyCodeBtn.innerHTML = `<span>📋</span><span>Copy</span>`;

      copyCodeBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          copyCodeBtn.innerHTML = `<span>✓</span><span>Copied!</span>`;
          showToast("Code copied to clipboard!", "📋");
          setTimeout(() => {
            copyCodeBtn.innerHTML = `<span>📋</span><span>Copy</span>`;
          }, 2000);
        } catch {
          showToast("Failed to copy code", "⚠");
        }
      });

      header.appendChild(langSpan);
      header.appendChild(copyCodeBtn);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  // Text-To-Speech (Read Aloud)
  function handleSpeech(text, btn) {
    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis not supported in this browser", "⚠");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.classList.remove("active-speech");
      btn.innerHTML = `<span>🔊</span><span>Read Aloud</span>`;
      return;
    }

    // Clean markdown symbols for cleaner speech
    const cleanText = text
      .replace(/[*_#`~>\[\]\(\)]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    btn.classList.add("active-speech");
    btn.innerHTML = `<span>⏹</span><span>Stop Reading</span>`;

    currentUtterance.onend = () => {
      btn.classList.remove("active-speech");
      btn.innerHTML = `<span>🔊</span><span>Read Aloud</span>`;
    };

    currentUtterance.onerror = () => {
      btn.classList.remove("active-speech");
      btn.innerHTML = `<span>🔊</span><span>Read Aloud</span>`;
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  // Export Note as .md file
  function downloadAsNote(content, mode) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `StudyMate-${mode}-notes-${timestamp}.md`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Saved note as ${fileName}`, "📥");
  }

})();