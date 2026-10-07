
let current = 0;
 const savedQuestions = localStorage.getItem("questions");
 
if (savedQuestions) {
questions = JSON.parse(savedQuestions);
}
function showQuestion(index) {
document.getElementById("answer").style.display = "none";
document.getElementById("answer").innerText = "";
document.getElementById("question").textContent =
questions[index].question;
 
document.getElementById("counter").textContent =
`Question ${index + 1} of ${questions.length}`;
}
 
function nextQuestion() {
current++;
if (current >= questions.length) {
current = 0;
}
showQuestion(current);
}
 
function previousQuestion() {
current--;
if (current < 0) {
current = questions.length - 1;
}
showQuestion(current);
}
 
function randomQuestion() {
current = Math.floor(Math.random() * questions.length);
showQuestion(current);
}
 
window.onload = function () {
showQuestion(0);
localStorage.setItem(
"questions",
JSON.stringify(questions)
);
};
console.log("Saved to localStorage");
function toggleAnswer() {
const answer = document.getElementById("answer");
 
answer.style.display = "block";
let formattedAnswer = questions[current].answer
.replace(/\n/g, "<br>")
.replace(/(Scenario:|Example:|Configuration:|Steps:|Note:)/gi,
"<b>$1</b>")
.replace(/(\d+\.\s.*?)(<br>|$)/g,
"<b>$1</b>$2");
 
answer.innerHTML = formattedAnswer;
}
document.getElementById("uploadBtn").addEventListener("click", function () {
 
const fileInput = document.getElementById("excelFile");
 
if (!fileInput.files.length) {
alert("Please select an Excel file first");
return;
}
 
const file = fileInput.files[0];
const reader = new FileReader();
 
reader.onload = function (e) {
 
const data = new Uint8Array(e.target.result);
 
const workbook = XLSX.read(data, {
type: "array"
});
 
const sheet =
workbook.Sheets[workbook.SheetNames[0]];
 
const rows = XLSX.utils.sheet_to_json(sheet, {
header: 1
});
 
questions = rows
.filter(row => row[0])
.map((row, index) => ({
id: index + 1,
question: row[0] || "",
answer: row[1] || ""
}));

 localStorage.setItem(
"questions",
JSON.stringify(questions)
);
current = 0;
showQuestion(0);
 
current = 0;
 
showQuestion(0);
 
alert(
questions.length +
" questions loaded successfully"
);
 
console.log("Saved to localStorage");
};
 
reader.readAsArrayBuffer(file);
});
if (questions.length > 0) {
showQuestion(0);
}
function searchQuestion() {
 
const searchText = document
.getElementById("searchInput")
.value
.toLowerCase()
.trim();
 
if (searchText === "") {
alert("Please enter a question");
return;
}
 
const foundIndex = questions.findIndex(q =>
q.question &&
q.question.toLowerCase().includes(searchText)
);
 
if (foundIndex >= 0) {
 
current = foundIndex;
 
showQuestion(current);
 
} else {
 
alert("Question not found");
 
}
}
document.getElementById("searchInput")
.addEventListener("keypress", function(event) {
 
if (event.key === "Enter") {
searchQuestion();
}
 
});
let favorites = [];
 
function markFavorite() {
 
const favoriteQuestion = questions[current];
 
favorites.push(favoriteQuestion);
 
localStorage.setItem(
"favorites",
JSON.stringify(favorites)
);
 
alert("Question added to Favorites ⭐");
}
function showFI() {
 
document.getElementById("blogEditor").style.display = "block";
 
document.getElementById("blogHeading").innerText =
"SAP FI Blog";
 
document.getElementById("blogText").value = "";
}
 
function showCO() {
 
document.getElementById("blogEditor").style.display = "block";
 
document.getElementById("blogHeading").innerText =
"SAP CO Blog";
 
document.getElementById("blogText").value = "";
}
 
function saveBlog() {
 
alert("Notes Saved Successfully ✅");
}