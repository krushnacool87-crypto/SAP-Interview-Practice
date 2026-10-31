
let current = 0;
let answerVisible = false;
let questions = [];
let allQuestions = [];
let reviewedQuestions = new Set(JSON.parse(localStorage.getItem("reviewedQuestions") || "[]"));
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let activeCommunity = "FI";
const communitySocket = typeof window.io === "function" ? window.io() : null;
let communityJoined = false;
let communityMessages = [];

const defaultQuestions = (window.questions || []).map((item, index) => ({
  id: item.id || index + 1,
  question: item.question || "",
  answer: item.answer || "",
  category: item.category || inferCategory(item.question || "", item.answer || "")
}));

function inferCategory(question, answer) {
  const text = `${question} ${answer}`.toLowerCase();

  if (text.includes("fi") || text.includes("financial accounting") || text.includes("general ledger") || text.includes("accounts payable")) {
    return "FI";
  }

  if (text.includes("co") || text.includes("cost center") || text.includes("controlling") || text.includes("profitability")) {
    return "CO";
  }

  return "General";
}

function normalizeQuestion(item, index) {
  return {
    id: item.id || index + 1,
    question: item.question || "",
    answer: item.answer || "",
    category: item.category || inferCategory(item.question || "", item.answer || "")
  };
}

function setQuestionList(list) {
  allQuestions = Array.isArray(list) ? list.map(normalizeQuestion) : [];
  const categoryFilter = document.getElementById("categoryFilter");
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";

  if (selectedCategory === "all") {
    questions = [...allQuestions];
  } else {
    questions = allQuestions.filter((item) => item.category === selectedCategory);
  }

  updateProgressUI();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const themeButton = document.getElementById("themeToggle");
  const isDark = document.body.classList.contains("dark-mode");
  themeButton.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("themeMode", isDark ? "dark" : "light");
}

function renderFavorites() {
  const panel = document.getElementById("favoritePanel");
  if (!panel) return;

  const favoriteItems = favorites.length
    ? favorites.map((item) => `<div class="favorite-item"><strong>${item.question}</strong></div>`).join("")
    : "<div class='favorite-item'>No favorites saved yet.</div>";

  panel.innerHTML = `<h3>⭐ Favorite Questions</h3>${favoriteItems}`;
}

function setCommunityStatus(text, state) {
  const status = document.getElementById("communityStatus");
  if (!status) return;

  status.textContent = text;
  status.classList.toggle("connected", state === "connected");
  status.classList.toggle("disconnected", state === "disconnected");
}

function setCommunityPanelOpen(isOpen) {
  const panel = document.getElementById("communitySidebar");
  const toggle = document.getElementById("communityToggle");
  if (!panel || !toggle) return;

  panel.hidden = !isOpen;
  toggle.hidden = isOpen;
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function renderCommunityMembers(members = []) {
  const membersBox = document.getElementById("communityMembers");
  if (!membersBox) return;

  membersBox.replaceChildren();
  members.forEach((member) => {
    const badge = document.createElement("span");
    badge.className = "community-member";
    badge.textContent = member;
    membersBox.appendChild(badge);
  });
}

function renderCommunityMessages() {
  const messagesBox = document.getElementById("communityMessages");
  if (!messagesBox) return;

  messagesBox.replaceChildren();
  communityMessages.forEach((message) => {
    const item = document.createElement("div");
    item.className = `community-message${message.username === localStorage.getItem("communityUsername") ? " user" : " bot"}`;

    const metadata = document.createElement("strong");
    const sentAt = new Date(message.sentAt);
    metadata.textContent = `${message.username} · ${Number.isNaN(sentAt.getTime()) ? "" : sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const text = document.createElement("span");
    text.textContent = message.text;
    item.append(metadata, text);
    messagesBox.appendChild(item);
  });

  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function joinCommunityRoom() {
  if (!communitySocket || !communitySocket.connected) {
    setCommunityStatus("Server unavailable", "disconnected");
    return;
  }

  const nameInput = document.getElementById("communityName");
  const username = (nameInput.value || "").trim();
  if (username.length < 2 || username.length > 24) {
    setCommunityStatus("Name must be 2-24 characters", "disconnected");
    nameInput.focus();
    return;
  }

  localStorage.setItem("communityUsername", username);
  communitySocket.emit("community:join", { module: activeCommunity, username }, (response) => {
    if (!response || !response.ok) {
      communityJoined = false;
      setCommunityStatus(response?.error || "Could not join room", "disconnected");
      return;
    }

    communityJoined = true;
    communityMessages = response.messages || [];
    renderCommunityMessages();
    renderCommunityMembers(response.members || []);
    setCommunityStatus(`${response.count} online in ${activeCommunity}`, "connected");
    document.getElementById("communityInput").disabled = false;
    document.getElementById("communityInput").placeholder = `Message ${activeCommunity}...`;
    document.getElementById("communitySendBtn").disabled = false;
  });
}

function sendCommunityMessage() {
  const input = document.getElementById("communityInput");
  const text = input.value.trim();
  if (!text || !communityJoined || !communitySocket) return;

  communitySocket.emit("community:message", { text }, (response) => {
    if (!response || !response.ok) {
      setCommunityStatus(response?.error || "Message could not be sent", "disconnected");
      return;
    }

    input.value = "";
  });
}

function connectCommunityChat() {
  const savedName = localStorage.getItem("communityUsername") || "";
  document.getElementById("communityName").value = savedName;

  if (!communitySocket) {
    setCommunityStatus("Start the Node server to enable chat", "disconnected");
    return;
  }

  communitySocket.on("connect", () => {
    setCommunityStatus("Connected · join a module", "connected");
    if (document.getElementById("communityName").value.trim()) {
      joinCommunityRoom();
    }
  });

  communitySocket.on("disconnect", () => {
    communityJoined = false;
    renderCommunityMembers([]);
    setCommunityStatus("Disconnected · reconnecting...", "disconnected");
    document.getElementById("communityInput").disabled = true;
    document.getElementById("communitySendBtn").disabled = true;
  });

  communitySocket.on("connect_error", () => {
    setCommunityStatus("Server unavailable", "disconnected");
  });

  communitySocket.on("community:message", (message) => {
    communityMessages.push(message);
    renderCommunityMessages();
  });

  communitySocket.on("community:presence", (presence) => {
    if (presence.module !== activeCommunity) return;
    renderCommunityMembers(presence.members || []);
    setCommunityStatus(`${presence.count} online in ${activeCommunity}`, "connected");
  });

  communitySocket.on("community:error", (error) => {
    setCommunityStatus(error.message || "Chat error", "disconnected");
  });
}

function toggleFavoritesPanel() {
  const panel = document.getElementById("favoritePanel");
  if (!panel) return;

  panel.classList.toggle("hidden");
  renderFavorites();
}

function updateAnswerButton() {
  const answerBtn = document.querySelector("button[onclick='toggleAnswer()']");
  if (!answerBtn) return;
  answerBtn.textContent = answerVisible ? "Hide Answer" : "Show Answer";
}

function updateProgressUI() {
  const progressText = document.getElementById("progressText");
  if (!progressText) return;

  const total = questions.length || 0;
  const reviewedCount = questions.filter((item) => reviewedQuestions.has(item.question)).length;
  progressText.textContent = `Progress: ${reviewedCount} / ${total}`;
}

function showQuestion(index) {
  const answerBox = document.getElementById("answer");
  const questionBox = document.getElementById("question");
  const counterBox = document.getElementById("counter");

  if (!questions.length) {
    questionBox.textContent = "No questions available";
    answerBox.style.display = "none";
    answerBox.innerHTML = "";
    counterBox.textContent = "0 of 0";
    answerVisible = false;
    updateAnswerButton();
    updateProgressUI();
    return;
  }

  current = (index + questions.length) % questions.length;
  const currentQuestion = questions[current];

  questionBox.textContent = currentQuestion.question || "Untitled question";
  counterBox.textContent = `Question ${current + 1} of ${questions.length}`;
  answerBox.style.display = "none";
  answerBox.innerHTML = "";
  answerVisible = false;
  updateAnswerButton();
  updateProgressUI();

  const reviewBtn = document.getElementById("reviewBtn");
  if (reviewBtn) {
    reviewBtn.textContent = reviewedQuestions.has(currentQuestion.question) ? "✅ Reviewed" : "✅ Mark Reviewed";
  }
}

function nextQuestion() {
  if (!questions.length) return;
  showQuestion(current + 1);
}

function previousQuestion() {
  if (!questions.length) return;
  showQuestion(current - 1);
}

function randomQuestion() {
  if (!questions.length) return;
  const randomIndex = Math.floor(Math.random() * questions.length);
  showQuestion(randomIndex);
}

function formatAnswer(text) {
  const answerText = text || "No answer available yet.";
  const lines = answerText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const trimmed = line.trim();

    if (/^(Scenario|Example|Configuration|Steps|Note)\s*:/i.test(trimmed)) {
      return `<p class="answer-label"><strong>${trimmed}</strong></p>`;
    }

    if (/^\d+\./.test(trimmed)) {
      return `<p class="answer-number"><strong>${trimmed}</strong></p>`;
    }

    return `<p class="answer-text">${trimmed}</p>`;
  }).join("");
}

function toggleAnswer() {
  if (!questions.length) return;

  const answer = document.getElementById("answer");
  const currentQuestion = questions[current];

  answerVisible = !answerVisible;
  answer.style.display = answerVisible ? "block" : "none";

  if (answerVisible) {
    answer.innerHTML = formatAnswer(currentQuestion.answer);
  } else {
    answer.innerHTML = "";
  }

  updateAnswerButton();
}

function searchQuestion() {
  const searchText = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!searchText) {
    alert("Please enter a question");
    return;
  }

  const foundIndex = questions.findIndex((q) =>
    q.question && q.question.toLowerCase().includes(searchText)
  );

  if (foundIndex >= 0) {
    showQuestion(foundIndex);
  } else {
    alert("Question not found");
  }
}

function markFavorite() {
  if (!questions.length) return;

  const currentQuestion = questions[current];
  const alreadyAdded = favorites.some((item) => item.question === currentQuestion.question);

  if (alreadyAdded) {
    alert("This question is already in Favorites ⭐");
    return;
  }

  favorites.push(currentQuestion);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
  alert("Question added to Favorites ⭐");
}

function copyQuestion() {
  if (!questions.length) return;

  const currentQuestion = questions[current];
  const valueToCopy = `${currentQuestion.question}\n\n${currentQuestion.answer || "No answer available yet."}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(valueToCopy)
      .then(() => alert("Question copied to clipboard ✅"))
      .catch(() => alert("Copy failed. Please try again."));
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = valueToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  alert("Question copied to clipboard ✅");
}

function saveBlog() {
  const blogHeading = document.getElementById("blogHeading");
  const blogText = document.getElementById("blogText");

  if (!blogHeading || !blogText) {
    return;
  }

  const blogKey = blogHeading.innerText.includes("FI") ? "fiBlogNotes" : "coBlogNotes";
  localStorage.setItem(blogKey, blogText.value);
  alert("Notes Saved Successfully ✅");
}

function showFI() {
  const blogEditor = document.getElementById("blogEditor");
  const blogHeading = document.getElementById("blogHeading");
  const blogText = document.getElementById("blogText");

  if (!blogEditor || !blogHeading || !blogText) {
    return;
  }

  blogEditor.style.display = "block";
  blogHeading.innerText = "SAP FI Blog";
  blogText.value = localStorage.getItem("fiBlogNotes") || "";
}

function showCO() {
  const blogEditor = document.getElementById("blogEditor");
  const blogHeading = document.getElementById("blogHeading");
  const blogText = document.getElementById("blogText");

  if (!blogEditor || !blogHeading || !blogText) {
    return;
  }

  blogEditor.style.display = "block";
  blogHeading.innerText = "SAP CO Blog";
  blogText.value = localStorage.getItem("coBlogNotes") || "";
}

function applyCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const selectedCategory = categoryFilter.value;
  if (selectedCategory === "all") {
    questions = [...allQuestions];
  } else {
    questions = allQuestions.filter((item) => item.category === selectedCategory);
  }

  if (!questions.length) {
    document.getElementById("question").textContent = "No questions in this category";
    document.getElementById("answer").style.display = "none";
    document.getElementById("counter").textContent = "0 of 0";
  } else {
    showQuestion(0);
  }

  updateProgressUI();
}

function markReviewed() {
  if (!questions.length) return;

  const currentQuestion = questions[current];
  if (!currentQuestion) return;

  if (reviewedQuestions.has(currentQuestion.question)) {
    alert("This question is already reviewed ✅");
    return;
  }

  reviewedQuestions.add(currentQuestion.question);
  localStorage.setItem("reviewedQuestions", JSON.stringify([...reviewedQuestions]));
  updateProgressUI();

  const reviewBtn = document.getElementById("reviewBtn");
  if (reviewBtn) {
    reviewBtn.textContent = "✅ Reviewed";
  }

  alert("Question marked as reviewed ✅");
}

function startRandomTest() {
  if (!questions.length) return;
  const index = Math.floor(Math.random() * questions.length);
  showQuestion(index);
  toggleAnswer();
}

window.addEventListener("load", function () {
  const savedQuestions = JSON.parse(localStorage.getItem("questions") || "null");
  const savedTheme = localStorage.getItem("themeMode");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("themeToggle").textContent = "☀️ Light Mode";
  }

  if (savedQuestions && Array.isArray(savedQuestions) && savedQuestions.length) {
    allQuestions = savedQuestions.map(normalizeQuestion);
  } else {
    allQuestions = defaultQuestions;
    localStorage.setItem("questions", JSON.stringify(allQuestions));
  }

  questions = [...allQuestions];
  renderFavorites();
  showQuestion(0);
  connectCommunityChat();
});

document.getElementById("themeToggle").addEventListener("click", toggleDarkMode);
document.getElementById("favoriteToggle").addEventListener("click", toggleFavoritesPanel);
document.getElementById("categoryFilter").addEventListener("change", applyCategoryFilter);
document.getElementById("randomTestBtn").addEventListener("click", startRandomTest);
document.getElementById("reviewBtn").addEventListener("click", markReviewed);
document.getElementById("communitySendBtn").addEventListener("click", sendCommunityMessage);
document.getElementById("communityInput").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    sendCommunityMessage();
  }
});
document.getElementById("communityJoinBtn").addEventListener("click", joinCommunityRoom);
document.getElementById("communityToggle").addEventListener("click", () => setCommunityPanelOpen(true));
document.getElementById("communityClose").addEventListener("click", () => setCommunityPanelOpen(false));
document.getElementById("communityName").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    joinCommunityRoom();
  }
});

document.querySelectorAll(".community-module-btn").forEach((button) => {
  button.addEventListener("click", function () {
    activeCommunity = this.dataset.module;
    document.querySelectorAll(".community-module-btn").forEach((btn) => btn.classList.toggle("active", btn === this));
    communityMessages = [];
    renderCommunityMessages();
    renderCommunityMembers([]);
    communityJoined = false;
    document.getElementById("communityInput").disabled = true;
    document.getElementById("communitySendBtn").disabled = true;
    if (communitySocket && communitySocket.connected && document.getElementById("communityName").value.trim()) {
      joinCommunityRoom();
    } else {
      setCommunityStatus(`Join ${activeCommunity} to chat`, "connected");
    }
  });
});

document.getElementById("searchInput").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    searchQuestion();
  }
});

document.getElementById("searchBtn")?.addEventListener("click", searchQuestion);

document.getElementById("uploadBtn").addEventListener("click", function () {
  const fileInput = document.getElementById("excelFile");

  if (!fileInput.files.length) {
    alert("Please select an Excel file first");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const importedQuestions = rows
      .filter((row) => row && row[0])
      .map((row, index) => ({
        id: index + 1,
        question: row[0] || "",
        answer: row[1] || "",
        category: row[2] || inferCategory(row[0] || "", row[1] || "")
      }));

    allQuestions = importedQuestions.map(normalizeQuestion);
    localStorage.setItem("questions", JSON.stringify(allQuestions));
    applyCategoryFilter();
    alert(`${allQuestions.length} questions loaded successfully`);
  };

  reader.readAsArrayBuffer(file);
});

if (typeof allQuestions !== "undefined" && allQuestions.length > 0) {
  questions = [...allQuestions];
  showQuestion(0);
}
