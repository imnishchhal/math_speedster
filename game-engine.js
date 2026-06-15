// game-engine.js
import { db } from "./firebase-config.js";
import { doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const parentLoginForm = document.getElementById('parent-login-form');
const parentPortalStatus = document.getElementById('parent-portal-status');
const panelLogin = document.getElementById('panel-login');
const panelGame = document.getElementById('panel-game');
const gamePlayerTag = document.getElementById('game-player-tag');
const gameScoreCounter = document.getElementById('game-score-counter');
const gameTimerClock = document.getElementById('game-timer-clock');
const visualEmojiDisplay = document.getElementById('visual-emoji-display');

let activeStudent = null;
let currentCorrectAnswer = 0;
let currentSessionScore = 0;
let secondsRemaining = 30;
let gameTimerInterval = null;

if (parentLoginForm) {
    parentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('parent-portal-phone').value.trim();
        if (parentPortalStatus) parentPortalStatus.style.display = "block";
        
        try {
            const parentKey = "parent_" + phone;
            const parentSnap = await getDoc(doc(db, "users", parentKey));
            if (!parentSnap.exists()) { parentPortalStatus.innerHTML = "❌ Profile not found."; return; }

            const querySnap = await getDocs(collection(db, "students"));
            let student = null;
            querySnap.forEach(d => { if (d.data().parentId === parentKey) student = { id: d.id, ...d.data() }; });

            if (student) {
                activeStudent = student;
                if (panelLogin) panelLogin.classList.remove('active');
                if (panelGame) panelGame.classList.add('active');
                launchGameRuntime();
            }
        } catch (err) { console.error(err); }
    });
}

function launchGameRuntime() {
    currentSessionScore = 0; secondsRemaining = 30;
    if (gamePlayerTag) gamePlayerTag.innerText = `Player: ${activeStudent.name}`;
    generateQuestion();
    
    clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        secondsRemaining--;
        if (gameTimerClock) gameTimerClock.innerText = `⏱️ ${secondsRemaining}s`;
        if (secondsRemaining <= 0) { clearInterval(gameTimerInterval); alert("🏁 Session Over! Score: " + currentSessionScore); location.reload(); }
    }, 1000);
}

function generateQuestion() {
    if (!visualEmojiDisplay) return;
    currentCorrectAnswer = Math.floor(Math.random() * 5) + 1;
    visualEmojiDisplay.innerText = "🍏".repeat(currentCorrectAnswer);
}

document.querySelectorAll('.arcade-key').forEach(key => {
    key.addEventListener('click', () => {
        if (parseInt(key.getAttribute('data-val')) === currentCorrectAnswer) {
            currentSessionScore++;
            if (gameScoreCounter) gameScoreCounter.innerText = `Score: ${currentSessionScore}`;
            generateQuestion();
        }
    });
});
