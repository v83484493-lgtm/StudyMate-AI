const topic = document.querySelector("#topic");
const mode = document.querySelector("#mode");
const ask = document.querySelector("#ask");
const statusLine = document.querySelector("#status");
const answerCard = document.querySelector("#answer-card");
const answer = document.querySelector("#answer");

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    topic.value = button.dataset.prompt;
    topic.focus();
  });
});

ask.addEventListener("click", async () => {
  const text = topic.value.trim();
  if (!text) {
    statusLine.textContent = "Pehle apna topic ya question likho.";
    topic.focus();
    return;
  }

  ask.disabled = true;
  ask.textContent = "Gemma is thinking…";
  statusLine.textContent = "AI se answer aa raha hai. Thoda wait karo.";
  answerCard.hidden = true;

  try {
    const response = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: text, mode: mode.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    answer.textContent = data.answer;
    answerCard.hidden = false;
    statusLine.textContent = `Response generated with ${data.model}.`;
  } catch (error) {
    statusLine.textContent = error.message;
  } finally {
    ask.disabled = false;
    ask.innerHTML = 'Ask Gemma <span aria-hidden="true">↗</span>';
  }
});

document.querySelector("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(answer.textContent);
    statusLine.textContent = "Answer copied!";
  } catch {
    statusLine.textContent = "Copy unavailable. Text select karke copy kar lo.";
  }
});