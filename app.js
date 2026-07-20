// app.js (GAME ENGINE v2.0 - PERSISTENT SESSION & GLOBAL TOPPER)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, collection, getDocs, query, where, setDoc, getDoc, updateDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
        authScreen.style.display = 'block';
    }

    setupEventListeners();
});

// 👑 SAFE GLOBAL TOPPER FETCH (No Stream/Query Lock Errors)
async function fetchGlobalTopper() {
    try {
        const querySnapshot = await getDocs(collection(db, "students"));

        if (!querySnapshot.empty) {
            let topStudent = null;
            let maxScore = -1;

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const score = parseInt(data.highScore) || 0;
                if (score > maxScore) {
                    maxScore = score;
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
    // Auth Form
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

    // Switch User Button
    if (btnSwitchUser) {
        btnSwitchUser.addEventListener('click', () => {
            localStorage.removeItem('ms_parent_phone');
            localStorage.removeItem('ms_active_student');
            location.reload();
        });
    }

    // Submit Answer
    document.getElementById('btn-submit-ans')?.addEventListener('click', checkAnswer);
    document.getElementById('user-answer')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });

    // Play Again Button (Direct Restart - No Phone Prompt!)
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        showGameArena();
    });
}

// 👨‍👩‍👧 3. LOAD STUDENT PROFILES
async function loadStudentProfiles(phone) {
    authScreen.style.display = 'none';
    studentSelectScreen.style.display = 'block';
    btnSwitchUser.style.display = 'inline-block';

    const studentListContainer = document.getElementById('student-list');
    studentListContainer.innerHTML = 'Loading students...';

    try {
        const q = query(collection(db, "students"), where("parentId", "==", phone));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            studentListContainer.innerHTML = '<p>No student profile found for this phone number. Please contact your field agent.</p>';
            return;
        }

        let html = '';
        snapshot.forEach((docSnap) => {
            const s = docSnap.data();
            html += `
                <div class="profile-card" onclick="selectStudent('${s.id}', '${s.name}', ${s.highScore || 0})">
                    <h3>${s.name}</h3>
                    <p>Class: ${s.class} | High Score: ${s.highScore || 0}</p>
                </div>`;
        });
        studentListContainer.innerHTML = html;
    } catch (err) {
        studentListContainer.innerHTML = 'Failed to load profiles.';
    }
}

// Global scope attachment for onclick event
window.selectStudent = (id, name, highScore) => {
    activeStudent = { id, name, highScore };
    localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
    studentSelectScreen.style.display = 'none';
    showGameArena();
};

// 🎮 4. GAME ENGINE & TIMER
function showGameArena() {
    authScreen.style.display = 'none';
    studentSelectScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameArena.style.display = 'block';
    btnSwitchUser.style.display = 'inline-block';

    score = 0;
    timeLeft = 30;
    document.getElementById('game-score').innerText = score;
    document.getElementById('game-timer').innerText = timeLeft;

    generateEquation();
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('game-timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function generateEquation() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    currentEquation = { num1, num2, ans: num1 + num2 };
    document.getElementById('equation-box').innerText = `${num1} + ${num2} = ?`;
    const inputField = document.getElementById('user-answer');
    inputField.value = '';
    inputField.focus();
}

function checkAnswer() {
    const userAns = parseInt(document.getElementById('user-answer').value);
    if (userAns === currentEquation.ans) {
        score += 10;
        document.getElementById('game-score').innerText = score;
    }
    generateEquation();
}

// 🏁 5. END GAME & HIGH SCORE SYNC
async function endGame() {
    clearInterval(timerInterval);
    gameArena.style.display = 'none';
    gameOverScreen.style.display = 'block';

    document.getElementById('final-score').innerText = score;

    let isNewHighScore = false;
    if (score > (activeStudent.highScore || 0)) {
        activeStudent.highScore = score;
        localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
        isNewHighScore = true;
    }

    document.getElementById('personal-high-score').innerText = activeStudent.highScore;

    // Update Firestore
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
        // Refresh topper in case this student broke the global record
        fetchGlobalTopper();
    } catch (err) {
        console.error("Score sync error:", err);
    }
}
