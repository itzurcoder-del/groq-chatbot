// public/main.js
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const send = document.getElementById("send");
const speakBtn = document.getElementById("speakBtn");
const stopBtn = document.getElementById("stopBtn");

let lastInputType = "text"; // "text" or "voice"

// ---------- Append message ----------
function appendMessage(role, text, speak = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "msg " + (role === "user" ? "user" : "bot");

  const textNode = document.createElement("div");
  textNode.className = "text";
  textNode.innerHTML = formatMarkdown(text);
  wrapper.appendChild(textNode);

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  wrapper.appendChild(meta);

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;

  if (role === "bot" && speak) speakText(text);

  return wrapper;
}

// ---------- Markdown bold parser ----------
function formatMarkdown(text) {
  // turns **word** into <b>word</b>
  return text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
}

// ---------- Add Speak Button ----------
function addSpeakButton(wrapper, text) {
  const speakButton = document.createElement("button");
  speakButton.textContent = "🔊 Speak";
  speakButton.style.marginTop = "8px";
  speakButton.style.border = "none";
  speakButton.style.background = "transparent";
  speakButton.style.cursor = "pointer";
  speakButton.style.fontWeight = "600";
  speakButton.style.color = "#007BFF";
  speakButton.addEventListener("click", () => speakText(text));
  wrapper.appendChild(speakButton);
}

// ---------- Typing Animation ----------
async function typeBotMessage(text, autoSpeak = false) {
  const wrapper = appendMessage("bot", "");
  const textNode = wrapper.querySelector(".text");
  textNode.innerHTML = "";

  let displayed = "";
  for (let i = 0; i < text.length; i++) {
    displayed += text[i];
    textNode.innerHTML = formatMarkdown(displayed);
    chat.scrollTop = chat.scrollHeight;
    await new Promise(r => setTimeout(r, 5)); // fast typing
  }

  textNode.innerHTML = formatMarkdown(text);
  addSpeakButton(wrapper, text);

  if (autoSpeak) speakText(text);
}

// ---------- Send Message ----------
async function sendMessage(message) {
  const text = (message || "").trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";
  appendMessage("bot", "…thinking…");

  try {
    const res = await fetch('/api/chat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    // remove "thinking"
    const last = Array.from(chat.querySelectorAll(".msg.bot")).pop();
    if (last && last.textContent.includes("…thinking…")) last.remove();

    if (data && data.reply) {
      // bot only speaks if user used voice input
      const shouldSpeak = lastInputType === "voice";
      await typeBotMessage(data.reply, shouldSpeak);
    } else {
      appendMessage("bot", "No reply (check server).");
    }
  } catch (err) {
    console.error("sendMessage error:", err);
    const last = Array.from(chat.querySelectorAll(".msg.bot")).pop();
    if (last && last.textContent.includes("…thinking…")) last.remove();
    appendMessage("bot", "Error contacting server.");
  }
}

// ---------- UI Buttons ----------
send.addEventListener("click", () => {
  lastInputType = "text";
  sendMessage(input.value);
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    lastInputType = "text";
    sendMessage(input.value);
  }
});

// ---------- Text-to-Speech ----------
let synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth.getVoices() || [];
}
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

function speakText(text) {
  if (!synth) return;
  if (synth.speaking) synth.cancel();

  const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
  utter.rate = 1;
  utter.pitch = 1;
  const google = voices.find(v => v.name && v.name.includes("Google US English"));
  if (google) utter.voice = google;
  synth.speak(utter);
}

stopBtn.addEventListener("click", () => {
  if (synth && synth.speaking) synth.cancel();
});

// ---------- Speech Recognition ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  speakBtn.addEventListener("click", () => {
    try {
      lastInputType = "voice";
      recognition.start();
    } catch (err) {
      console.error("recognition.start error", err);
    }
  });

  recognition.onresult = (event) => {
    const voiceText = event.results[0][0].transcript;
    input.value = voiceText;
    sendMessage(voiceText);
  };

  recognition.onerror = (err) => {
    console.warn("Speech recognition problem:", err.error);
    const status = document.getElementById("status");
    if (status) {
      status.textContent = "🎙️ Mic issue or no speech detected";
      setTimeout(() => (status.textContent = "Ready"), 3000);
    }
  };
} else {
  speakBtn.disabled = true;
  speakBtn.title = "Speech not supported in this browser";
}
