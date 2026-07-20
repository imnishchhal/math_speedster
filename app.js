// app.js (GAME ENGINE v3.0 - STABLE BUNDLE)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, collection, getDocs, query, where, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "math-speedster.firebaseapp.com",
    projectId: "math-speedster",
    storageBucket: "math-speedster.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Variables
let activeParentPhone = localStorage.getItem('ms_parent_phone') || null;
let activeStudent = JSON.parse(localStorage.getItem('ms_active_student')) || null;
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let currentEquation = {};

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const studentSelectScreen = document.getElementById('student-select-screen');
const gameArena = document.getElementById('game-arena');
const gameOverScreen = document.getElementById('game-over-screen');
const globalTopperBadge = document.getElementById('global-topper-badge');
const btnSwitchUser = document.getElementById('btn-switch-user');

document.addEventListener('DOMContentLoaded', () => {
    fetchGlobalTopper();

    // Check existing login session
    if (activeParentPhone && activeStudent) {
        showGameArena();
    } else if (activeParentPhone) {
        loadStudentProfiles(activeParentPhone);
    } else {
        if (authScreen) authScreen.style.display = 'block';
    }

    setupEventListeners();
});

// 👑 SAFE GLOBAL TOPPER FETCH
async function fetchGlobalTopper() {
    if (!globalTopperBadge) return;

    try {
        const querySnapshot = await getDocs(collection(db, "students"));

        if (!querySnapshot.empty) {
            let topStudent = null;
            let maxScore = -1;

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const scoreVal = parseInt(data.highScore) || 0;
                if (scoreVal > maxScore) {
                    maxScore = scoreVal;
                    topStudent = data;
                }
            });

            if (topStudent && maxScore >= 0) {
                const topperName = topStudent.name || "Anonymous";
                const topperClass = topStudent.class ? `(${topStudent.class})` : '';
                globalTopperBadge.innerHTML = `👑 <b>Topper:</b> ${topperName} ${topperClass} - <span style="color: #38bdf8;">${maxScore} pts</span>`;
            } else {
                globalTopperBadge.innerHTML = `👑 <b>Topper:</b> No scores yet! Be first!`;
            }
        } else {
            globalTopperBadge.innerHTML = `👑 <b>Topper:</b> No scores yet! Be first!`;
        }
    } catch (err) {
        console.warn("Topper fetch bypassed:", err);
        globalTopperBadge.innerHTML = `👑 <b>Topper:</b> Math Speedster Arena 🚀`;
    }
}

// 🔐 2. AUTH & SESSION LOGIC
function setupEventListeners() {
    const authForm = document.getElementById('mobile-auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('user-mobile').value.trim();
            if (phone.length === 10) {
                activeParentPhone = phone;
                localStorage.setItem('ms_parent_phone', phone);
                await loadStudentProfiles(phone);
            }
        });
    }

    if (btnSwitchUser) {
        btnSwitchUser.addEventListener('click', () => {
            localStorage.removeItem('ms_parent_phone');
            localStorage.removeItem('ms_active_student');
            location.reload();
        });
    }

    document.getElementById('btn-submit-ans')?.addEventListener('click', checkAnswer);
    document.getElementById('user-answer')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        showGameArena();
    });
}

// 👨‍👩‍👧 3. LOAD STUDENT PROFILES
async function loadStudentProfiles(phone) {
    if (authScreen) authScreen.style.display = 'none';
    if (studentSelectScreen) studentSelectScreen.style.display = 'block';
    if (btnSwitchUser) btnSwitchUser.style.display = 'inline-block';

    const studentListContainer = document.getElementById('student-list');
    if (!studentListContainer) return;
    
    studentListContainer.innerHTML = 'Loading students...';

    try {
        const q = query(collection(db, "students"), where("parentId", "==", phone));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            studentListContainer.innerHTML = '<p style="color: #f87171;">No student profile found for this number. Please contact your field agent.</p>';
            return;
        }

        let html = '';
        snapshot.forEach((docSnap) => {
            const s = docSnap.data();
            const studentClass = s.class || 'N/A';
            html += `
                <div class="profile-card" onclick="selectStudent('${s.id}', '${s.name}', '${studentClass}', ${s.highScore || 0})">
                    <h3>${s.name}</h3>
                    <p>Class: ${studentClass} | High Score: ${s.highScore || 0}</p>
                </div>`;
        });
        studentListContainer.innerHTML = html;
    } catch (err) {
        studentListContainer.innerHTML = '<p style="color: #f87171;">Failed to load profiles.</p>';
    }
}

// Fixed: Preserving 'class' attribute in activeStudent session
window.selectStudent = (id, name, studentClass, highScore) => {
    activeStudent = { id, name, class: studentClass, highScore };
    localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
    if (studentSelectScreen) studentSelectScreen.style.display = 'none';
    showGameArena();
};

// 🎮 4. GAME ENGINE & TIMER
function showGameArena() {
    if (authScreen) authScreen.style.display = 'none';
    if (studentSelectScreen) studentSelectScreen.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (gameArena) gameArena.style.display = 'block';
    if (btnSwitchUser) btnSwitchUser.style.display = 'inline-block';

    score = 0;
    timeLeft = 30;
    
    const scoreElem = document.getElementById('game-score');
    const timerElem = document.getElementById('game-timer');
    if (scoreElem) scoreElem.innerText = score;
    if (timerElem) timerElem.innerText = timeLeft;

    generateEquation();
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timerElem) timerElem.innerText = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function generateEquation() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    currentEquation = { num1, num2, ans: num1 + num2 };
    
    const eqBox = document.getElementById('equation-box');
    if (eqBox) eqBox.innerText = `${num1} + ${num2} = ?`;
    
    const inputField = document.getElementById('user-answer');
    if (inputField) {
        inputField.value = '';
        inputField.focus();
    }
}

function checkAnswer() {
    const inputField = document.getElementById('user-answer');
    if (!inputField) return;

    const userAns = parseInt(inputField.value);
    if (!isNaN(userAns) && userAns === currentEquation.ans) {
        score += 10;
        const scoreElem = document.getElementById('game-score');
        if (scoreElem) scoreElem.innerText = score;
    }
    generateEquation();
}

// 🏁 5. END GAME & HIGH SCORE SYNC
async function endGame() {
    clearInterval(timerInterval);
    if (gameArena) gameArena.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'block';

    const finalScoreElem = document.getElementById('final-score');
    if (finalScoreElem) finalScoreElem.innerText = score;

    if (activeStudent && score > (activeStudent.highScore || 0)) {
        activeStudent.highScore = score;
        localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
    }

    const personalHighElem = document.getElementById('personal-high-score');
    if (personalHighElem) personalHighElem.innerText = activeStudent?.highScore || score;

    // Update Firestore
    if (activeStudent?.id) {
        try {
            const studentRef = doc(db, "students", activeStudent.id);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const currentData = studentSnap.data();
                const gamesCompleted = (currentData.gamesCompleted || 0) + 1;

                await updateDoc(studentRef, {
                    lastScore: score,
                    highScore: Math.max(score, currentData.highScore || 0),
                    gamesCompleted: gamesCompleted
                });
            }
            fetchGlobalTopper();
        } catch (err) {
            console.error("Score sync error:", err);
        }
    }
}
