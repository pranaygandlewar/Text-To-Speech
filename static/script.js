/* ==========================================================================
   NEUROVOICE AI - CLIENT-SIDE LOGIC
   static/script.js
   ========================================================================== */

// Global state variables
let historyData = [];

// DOM Elements
const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const progressArea = document.querySelector(".progress-area");
const visualizer = document.getElementById("visualizer");
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.getElementById("volumeSlider");
const loopBtn = document.getElementById("loopBtn");
const speedBtn = document.getElementById("speedBtn");
const speedContainer = document.querySelector(".speed-container");
const textInput = document.getElementById("text");
const charCountSpan = document.getElementById("charCount");
const downloadBtn = document.getElementById("downloadBtn");
const playerDock = document.getElementById("playerDock");

/* --------------------------------------------------------------------------
   1. APP INITIALIZATION & LOCALSTORAGE
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Load past voice generations
  initHistory();
  
  // Set default character count
  updateCharCount();

  // Set default volume
  audio.volume = volumeSlider.value;

  // Global click listeners
  window.addEventListener("click", handleOutsideClicks);
});

// Load history items from localStorage
function initHistory() {
  const savedHistory = localStorage.getItem("tts_history");
  if (savedHistory) {
    try {
      historyData = JSON.parse(savedHistory);
      renderHistoryList();
    } catch (e) {
      console.error("Failed to parse history data from localStorage", e);
      historyData = [];
    }
  }
}

// Save history items to localStorage
function saveHistory() {
  localStorage.setItem("tts_history", JSON.stringify(historyData));
}

/* --------------------------------------------------------------------------
   2. SPEECH GENERATION & POST API
   -------------------------------------------------------------------------- */
async function generateSpeech() {
  const text = textInput.value.trim();
  const language = document.getElementById("language").value;
  const voice = document.getElementById("voice").value;
  const loadingScreen = document.getElementById("loadingScreen");

  if (!text) {
    showToast("Input Required", "Please enter some text to convert to speech.", "error");
    return;
  }

  if (text.length > 1000) {
    showToast("Limit Exceeded", "Text exceeds the 1000 character limit.", "error");
    return;
  }

  // Show full-screen loader
  loadingScreen.style.display = "flex";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        language: language,
        voice: voice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Generation failed");
    }

    const data = await response.json();
    
    // Hide loader
    loadingScreen.style.display = "none";
    showToast("Success", "Audio generated successfully using VITS neural network.", "success");

    // Slide open the floating player dock and set preview text
    playerDock.classList.add("show");
    document.getElementById("dockTextPreview").innerText = text.length > 60 ? (text.substring(0, 60) + "...") : text;

    // Load new audio URL into play controls
    const audioUrl = data.audio_url + "?t=" + new Date().getTime();
    audio.src = audioUrl;
    
    // Play immediately
    audio.play()
      .then(() => {
        playBtn.innerHTML = "❚❚";
        visualizer.classList.add("playing");
        animateProgress();
      })
      .catch((e) => console.log("Auto-play blocked or failed", e));

    downloadBtn.href = data.audio_url;

    // Convert audio file to Base64 to persist the specific generation in history
    try {
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        addHistoryItem(text, base64Audio, language, voice);
      };
    } catch (e) {
      console.warn("Could not convert audio to base64 for history caching", e);
      addHistoryItem(text, data.audio_url, language, voice);
    }

  } catch (error) {
    loadingScreen.style.display = "none";
    showToast("Generation Error", error.message || "An unexpected error occurred.", "error");
    console.error("Speech generation error:", error);
  }
}

/* --------------------------------------------------------------------------
   3. SPEECH PERSISTED HISTORY LOGS
   -------------------------------------------------------------------------- */
function addHistoryItem(text, url, language, voice) {
  const languageNames = {
    eng: "English", hin: "Hindi", spa: "Spanish", fra: "French",
    deu: "German", jpn: "Japanese", por: "Portuguese", ita: "Italian",
    ara: "Arabic", rus: "Russian"
  };
  const voiceNames = {
    orion: "Orion", vega: "Vega", capella: "Capella",
    puck: "Puck", eclipse: "Eclipse"
  };

  const newItem = {
    id: Date.now(),
    text: text,
    url: url,
    language: languageNames[language] || language,
    voice: voiceNames[voice] || voice || "Default",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  // Add to top of list
  historyData.unshift(newItem);
  
  // Cap at 15 items to save storage size
  if (historyData.length > 15) {
    historyData.pop();
  }

  saveHistory();
  renderHistoryList();
}

function renderHistoryList() {
  const historyList = document.getElementById("historyList");
  
  if (historyData.length === 0) {
    historyList.innerHTML = `<div class="no-history">No voice generations yet. Try creating one above!</div>`;
    return;
  }

  historyList.innerHTML = historyData.map((item, index) => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-details">
        <div class="history-text" title="${escapeHtml(item.text)}">
          🎵 ${escapeHtml(item.text)}
        </div>
        <div class="history-meta">
          <span class="history-badge">${item.language}</span>
          <span class="history-badge" style="background: rgba(139,92,246,0.15); color: #c084fc;">${item.voice}</span>
          <span>${item.timestamp}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="hist-btn hist-play" onclick="playHistoryItem(${index})" title="Play Generation">▶</button>
        <a class="hist-btn hist-download" href="${item.url}" download="generation-${item.id}.wav" title="Download Audio">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </a>
        <button class="hist-btn hist-delete" onclick="deleteHistoryItem(${item.id})" title="Delete item">🗑️</button>
      </div>
    </div>
  `).join("");
}

function playHistoryItem(index) {
  const item = historyData[index];
  if (!item) return;

  // Slide open the floating player dock and set preview text
  playerDock.classList.add("show");
  document.getElementById("dockTextPreview").innerText = item.text.length > 60 ? (item.text.substring(0, 60) + "...") : item.text;

  // Load target audio path: avoid appending query string to base64 Data URLs
  const isDataUrl = item.url.startsWith("data:");
  audio.src = isDataUrl ? item.url : (item.url + "?t=" + new Date().getTime());
  downloadBtn.href = item.url;
  
  // Start playback
  audio.play()
    .then(() => {
      playBtn.innerHTML = "❚❚";
      visualizer.classList.add("playing");
      animateProgress();
      showToast("Playing Record", "Loaded historical generation from storage.", "info");
    })
    .catch((e) => console.log("Play failed", e));
}

function deleteHistoryItem(id) {
  historyData = historyData.filter(item => item.id !== id);
  saveHistory();
  renderHistoryList();
  showToast("Record Removed", "Item deleted from history list.", "info");
}

function clearHistory() {
  if (confirm("Are you sure you want to clear all generation logs?")) {
    historyData = [];
    saveHistory();
    renderHistoryList();
    showToast("History Cleared", "All generation records removed.", "info");
  }
}

// Utility to escape HTML strings safely
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* --------------------------------------------------------------------------
   4. ADVANCED AUDIO PLAYER ACTIONS
   -------------------------------------------------------------------------- */
playBtn.addEventListener("click", () => {
  if (!audio.src) return;

  if (audio.paused) {
    audio.play()
      .then(() => {
        playBtn.innerHTML = "❚❚";
        visualizer.classList.add("playing");
        animateProgress();
      })
      .catch((e) => console.error("Playback failed:", e));
  } else {
    audio.pause();
    playBtn.innerHTML = "▶";
    visualizer.classList.remove("playing");
  }
});

function animateProgress() {
  if (!audio.paused && audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = progress + "%";
    currentTimeEl.innerText = formatTime(audio.currentTime);
    durationEl.innerText = formatTime(audio.duration);
    requestAnimationFrame(animateProgress);
  }
}

// Click to Seek audio position
progressArea.addEventListener("click", (e) => {
  if (!audio.src || !audio.duration) return;
  const width = progressArea.clientWidth;
  const clickX = e.offsetX;
  const duration = audio.duration;
  audio.currentTime = (clickX / width) * duration;
  if (audio.paused) {
    progressBar.style.width = (clickX / width) * 100 + "%";
    currentTimeEl.innerText = formatTime(audio.currentTime);
  }
});

// Volume control logic
volumeSlider.addEventListener("input", (e) => {
  const volVal = e.target.value;
  audio.volume = volVal;
  updateVolumeIcon(volVal);
});

volumeBtn.addEventListener("click", () => {
  if (audio.volume > 0) {
    // Save current volume level for restore
    volumeBtn.dataset.prevVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
    volumeBtn.innerText = "🔇";
  } else {
    const restoredVol = volumeBtn.dataset.prevVolume || 0.8;
    audio.volume = restoredVol;
    volumeSlider.value = restoredVol;
    updateVolumeIcon(restoredVol);
  }
});

function updateVolumeIcon(val) {
  if (val == 0) {
    volumeBtn.innerText = "🔇";
  } else if (val < 0.4) {
    volumeBtn.innerText = "🔉";
  } else {
    volumeBtn.innerText = "🔊";
  }
}

// Playback Speed dropdown logic
function toggleSpeedOptions() {
  speedContainer.classList.toggle("active");
}

function setPlaybackSpeed(speed) {
  audio.playbackRate = speed;
  speedBtn.innerText = speed === 1.0 ? "1.0x" : `${speed}x`;
  speedContainer.classList.remove("active");
  showToast("Playback Speed", `Playback rate set to ${speed}x.`, "info");
}

// Loop logic
loopBtn.addEventListener("click", () => {
  audio.loop = !audio.loop;
  loopBtn.classList.toggle("active", audio.loop);
  showToast("Loop State", audio.loop ? "Looping enabled." : "Looping disabled.", "info");
});

// HTML5 Audio Listeners
audio.addEventListener("ended", () => {
  if (!audio.loop) {
    playBtn.innerHTML = "▶";
    progressBar.style.width = "0%";
    currentTimeEl.innerText = "0:00";
    visualizer.classList.remove("playing");
  }
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.innerText = formatTime(audio.duration);
});

function formatTime(time) {
  if (isNaN(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/* --------------------------------------------------------------------------
   5. TEXT AREA ACTIONS & UTILITIES
   -------------------------------------------------------------------------- */
function updateCharCount() {
  const text = textInput.value;
  charCountSpan.innerText = text.length;

  if (text.length > 1000) {
    charCountSpan.style.color = "var(--error-color)";
  } else {
    charCountSpan.style.color = "#6b7280";
  }
}

function clearText() {
  textInput.value = "";
  updateCharCount();
  showToast("Cleared", "Input text area cleared successfully.", "info");
}

async function copyText() {
  const text = textInput.value;
  if (!text) {
    showToast("Nothing to Copy", "Text input is currently empty.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Text", "Input copied to system clipboard.", "success");
  } catch (err) {
    showToast("Copy Failed", "System clipboard block or permissions denied.", "error");
  }
}

async function pasteText() {
  try {
    const text = await navigator.clipboard.readText();
    textInput.value = text;
    updateCharCount();
    showToast("Clipboard Pasted", "Text successfully pasted from clipboard.", "success");
  } catch (err) {
    // Fallback message for browsers rejecting direct script clipboard read
    showToast("Paste Blocked", "Please use keyboard shortcut Ctrl+V instead.", "error");
  }
}

/* --------------------------------------------------------------------------
   6. CUSTOM LANGUAGE SELECT & PROMPTS
   -------------------------------------------------------------------------- */
function toggleDropdown(dropdownId) {
  const dropdowns = ["customSelect", "voiceSelect"];
  dropdowns.forEach(id => {
    if (id !== dropdownId) {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    }
  });
  
  const target = document.getElementById(dropdownId);
  if (target) {
    target.classList.toggle("active");
  }
}

function selectLanguage(value, text) {
  document.getElementById("language").value = value;
  document.getElementById("selectedText").innerText = text;
  document.getElementById("customSelect").classList.remove("active");
  updateExamples();
}

function selectVoice(value, text, card) {
  document.getElementById("voice").value = value;
  
  if (card) {
    const cards = document.querySelectorAll(".voice-card");
    cards.forEach(c => c.classList.remove("active"));
    card.classList.add("active");
  }

  showToast("Voice Selected", `Switched to ${text} profile.`, "info");
}

function loadPrompt(type) {
  const language = document.getElementById("language").value;
  
  const prompts = {
    eng: {
      demo: `Hello everyone.\n\nThis project demonstrates an AI-powered Text-to-Speech system.\n\nThe application converts written text into natural human-like speech using neural voice synthesis.\n\nUsers can select a language, enter text, and instantly generate audio output.\n\nThank you for listening.`,
      presentation: `Artificial Intelligence is transforming the world.\n\nAI enables machines to learn, reason, and make decisions.\n\nToday, AI is widely used in healthcare, finance, education, and transportation.`,
      support: `Welcome to NeuroVoice AI.\n\nYour request has been received successfully.\n\nOur system is currently processing your input.\n\nPlease wait while we generate your audio response.`,
      education: `Photosynthesis is the process by which green plants convert sunlight into chemical energy.\n\nThis process is essential for life on Earth because it produces oxygen and food.`
    },
    hin: {
      demo: `नमस्कार।\n\nयह परियोजना कृत्रिम बुद्धिमत्ता आधारित टेक्स्ट-टू-स्पीच प्रणाली का प्रदर्शन करती है।\n\nयह एप्लिकेशन लिखित पाठ को प्राकृतिक मानव जैसी आवाज़ में परिवर्तित करता है।\n\nउपयोगकर्ता भाषा का चयन करके तुरंत ऑडियो उत्पन्न कर सकते हैं।\n\nधन्यवाद।`,
      presentation: `कृत्रिम बुद्धिमत्ता दुनिया को बदल रही है।\n\nएआई मशीनों को सीखने, सोचने और निर्णय लेने में सक्षम बनाती है।\n\nआज एआई का उपयोग स्वास्थ्य, शिक्षा, वित्त और परिवहन में किया जा रहा है।`,
      support: `न्यूरोवॉइस एआई में आपका स्वागत है।\n\nका अनुरोध सफलतापूर्वक प्राप्त हो गया है।\n\nहमारी प्रणाली आपके इनपुट को संसाधित कर रही है।\n\nकृपया कुछ क्षण प्रतीक्षा करें।`,
      education: `प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा हरे पौधे सूर्य के प्रकाश को रासायनिक ऊर्जा में परिवर्तित करते हैं।\n\nयह प्रक्रिया पृथ्वी पर जीवन के लिए अत्यंत महत्वपूर्ण है।`
    }
  };

  // Fallback to English templates for languages without dedicated translated templates
  const activeLang = prompts[language] ? language : 'eng';
  textInput.value = prompts[activeLang][type];
  updateCharCount();
  textInput.focus();

  textInput.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  textInput.classList.add("active-prompt");
  setTimeout(() => {
    textInput.classList.remove("active-prompt");
  }, 1500);

  const langLabel = document.getElementById("selectedText").innerText;
  showToast("Template Loaded", `Loaded prompt demo in ${langLabel}.`, "info");
}

function updateExamples() {
  const language = document.getElementById("language").value;
  const cards = document.querySelectorAll(".prompt-card");
  
  if (cards.length < 4) return;

  if (language === "hin") {
    cards[0].querySelector("h3").innerText = "प्रोजेक्ट डेमो";
    cards[0].querySelector("p").innerText = "कॉलेज प्रोजेक्ट और विवा प्रदर्शन के लिए।";
    cards[1].querySelector("h3").innerText = "एआई प्रस्तुति";
    cards[1].querySelector("p").innerText = "कृत्रिम बुद्धिमत्ता की पेशेवर प्रस्तुति।";
    cards[2].querySelector("h3").innerText = "ग्राहक सहायता";
    cards[2].querySelector("p").innerText = "स्वचालित ग्राहक सेवा प्रतिक्रियाएँ।";
    cards[3].querySelector("h3").innerText = "शैक्षिक सामग्री";
    cards[3].querySelector("p").innerText = "सीखने और शिक्षण से संबंधित उदाहरण।";
  } else {
    cards[0].querySelector("h3").innerText = "Project Demo";
    cards[0].querySelector("p").innerText = "Perfect for college projects and viva demonstrations.";
    cards[1].querySelector("h3").innerText = "AI Presentation";
    cards[1].querySelector("p").innerText = "Explain Artificial Intelligence professionally.";
    cards[2].querySelector("h3").innerText = "Customer Support";
    cards[2].querySelector("p").innerText = "Generate automated customer responses.";
    cards[3].querySelector("h3").innerText = "Education";
    cards[3].querySelector("p").innerText = "Convert educational content into speech.";
  }
}

/* --------------------------------------------------------------------------
   7. INTERACTIVE FEEDBACK (TOAST SYSTEM)
   -------------------------------------------------------------------------- */
function showToast(title, message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  // Create toast DOM node
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon selector based on type
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation frame entry
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Auto remove toast after 4s
  setTimeout(() => {
    toast.classList.remove("show");
    // Remove element after transition ends
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 4000);
}

/* --------------------------------------------------------------------------
   8. MISC HELPER FUNCTIONS
   -------------------------------------------------------------------------- */
function handleOutsideClicks(e) {
  // Dropdown collapses
  const select = document.getElementById("customSelect");
  const voiceSelect = document.getElementById("voiceSelect");
  
  if (select && !select.contains(e.target)) {
    select.classList.remove("active");
  }
  
  if (voiceSelect && !voiceSelect.contains(e.target)) {
    voiceSelect.classList.remove("active");
  }

  // Playback speed dropdown collapse
  if (speedContainer && !speedContainer.contains(e.target)) {
    speedContainer.classList.remove("active");
  }
}