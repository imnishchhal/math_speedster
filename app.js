// app.js (GAME ENGINE v6.0 - GRADE ADAPTIVE PG-CLASS 8)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, memoryLocalCache, doc, collection, getDocs, query, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "math-speed-web.firebaseapp.com",
    projectId: "math-speed-web",
    storageBucket: "math-speed-web.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

// State Variables
let activeParentPhone = localStorage.getItem('ms_parent_phone') || null;
let activeStudent = JSON.parse(localStorage.getItem('ms_active_student')) || null;
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let currentEquation = {};

// Visual Emojis for Early Years (PG - UKG)
const visualIcons = ['🍎', '🎈', '🐱', '⭐', '🚗', '🐶', '⚽', '🍦'];

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const studentSelectScreen = document.getElementById('student-select-screen');
const gameArena = document.getElementById('game-arena');
const gameOverScreen = document.getElementById('game-over-screen');
const globalTopperBadge = document.getElementById('global-topper-badge');
const btnSwitchUser = document.getElementById('btn-switch-user');

document.addEventListener('DOMContentLoaded', () => {
    fetchGlobalTopper();

    if (activeParentPhone && activeStudent) {
        showGameArena();
    } else if (activeParentPhone) {
        loadStudentProfiles(activeParentPhone);
    } else {
        if (authScreen) authScreen.style.display = 'block';
    }

    setupEventListeners();
});

// 👑 1. GLOBAL TOPPER FETCH
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
                globalTopperBadge.innerHTML = `👑 <b>Topper:</b> ${topStudent.name || 'Anonymous'} (${topStudent.class || ''}) - <span style="color: #38bdf8;">${maxScore} pts</span>`;
            }
        }
    } catch (err) {
        console.warn("Topper fetch error:", err);
    }
}

// 🔐 2. AUTH & EVENT LISTENERS
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

    document.getElementById('btn-submit-ans')?.addEventListener('click', checkAnswerDirect);
    document.getElementById('user-answer')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkAnswerDirect();
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        showGameArena();
    });
}

// 👨‍👩‍👧 3. LOAD PROFILES
async function loadStudentProfiles(phone) {
    if (authScreen) authScreen.style.display = 'none';
    if (studentSelectScreen) studentSelectScreen.style.display = 'block';
    if (btnSwitchUser) btnSwitchUser.style.display = 'inline-block';

    const studentListContainer = document.getElementById('student-list');
    if (!studentListContainer) return;
    studentListContainer.innerHTML = 'Loading profiles...';

    try {
        const snapshot = await getDocs(collection(db, "students"));
        let html = '';
        let matchedCount = 0;

        snapshot.forEach((docSnap) => {
            const s = docSnap.data();
            const pId = String(s.parentId || '');
            if (pId.includes(phone)) {
                matchedCount++;
                const studentClass = s.class || 'Class 1';
                html += `
                    <div class="profile-card" onclick="selectStudent('${docSnap.id}', '${s.name}', '${studentClass}', ${s.highScore || 0})">
                        <h3>${s.name}</h3>
                        <p>Class: ${studentClass} | High Score: ${s.highScore || 0}</p>
                    </div>`;
            }
        });

        if (matchedCount === 0) {
            studentListContainer.innerHTML = '<p style="color: #f87171;">No profile found for this number.</p>';
        } else {
            studentListContainer.innerHTML = html;
        }
    } catch (err) {
        studentListContainer.innerHTML = '<p style="color: #f87171;">Error loading profiles.</p>';
    }
}

window.selectStudent = (id, name, studentClass, highScore) => {
    activeStudent = { id, name, class: studentClass, highScore };
    localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
    if (studentSelectScreen) studentSelectScreen.style.display = 'none';
    showGameArena();
};

// 🎮 4. GAME ARENA
function showGameArena() {
    if (authScreen) authScreen.style.display = 'none';
    if (studentSelectScreen) studentSelectScreen.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (gameArena) gameArena.style.display = 'block';
    if (btnSwitchUser) btnSwitchUser.style.display = 'inline-block';

    score = 0;
    timeLeft = 30;
    
    document.getElementById('game-score').innerText = score;
    document.getElementById('game-timer').innerText = timeLeft;

    generateEquationByGrade();
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('game-timer').innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

// 🧠 5. GRADE-BASED QUESTION GENERATOR (PG to Class 8)
function generateEquationByGrade() {
    const studentClass = (activeStudent?.class || 'Class 1').trim().toUpperCase();
    const isEarlyYears = ['PG', 'PLAYGROUP', 'NURSERY', 'LKG', 'UKG'].includes(studentClass);

    const eqBox = document.getElementById('equation-box');
    const visualBox = document.getElementById('visual-image-box');
    const mcqContainer = document.getElementById('mcq-options-container');
    const directInputArea = document.getElementById('direct-input-area');

    if (isEarlyYears) {
        // --- 🐣 PG TO UKG: VISUAL MCQ MODE ---
        directInputArea.style.display = 'none';
        visualBox.style.display = 'block';
        mcqContainer.style.display = 'grid';

        const randomIcon = visualIcons[Math.floor(Math.random() * visualIcons.length)];
        const questionType = Math.random() > 0.5 ? 'count' : 'add';

        if (questionType === 'count') {
            const count = Math.floor(Math.random() * 6) + 1; // 1 to 6
            currentEquation = { ans: count };
            
            eqBox.innerText = "Count the objects:";
            visualBox.innerText = randomIcon.repeat(count);
        } else {
            const num1 = Math.floor(Math.random() * 3) + 1;
            const num2 = Math.floor(Math.random() * 3) + 1;
            currentEquation = { ans: num1 + num2 };

            eqBox.innerText = "How many in total?";
            visualBox.innerText = `${randomIcon.repeat(num1)}  +  ${randomIcon.repeat(num2)}`;
        }

        // Generate MCQ Options (4 Choices)
        const options = generateMCQOptions(currentEquation.ans);
        mcqContainer.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'mcq-btn';
            btn.innerText = opt;
            btn.onclick = () => handleMCQAnswer(opt);
            mcqContainer.appendChild(btn);
        });

    } else {
        // --- 🎒 CLASS 1 TO CLASS 8: ARITHMETIC MODE ---
        visualBox.style.display = 'none';
        mcqContainer.style.display = 'none';
        directInputArea.style.display = 'flex';

        let num1, num2, op = '+', ans;

        if (studentClass.includes('1') || studentClass.includes('2')) {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            op = Math.random() > 0.5 ? '+' : '-';
            if (op === '-' && num1 < num2) [num1, num2] = [num2, num1]; // Keep positive
            ans = op === '+' ? num1 + num2 : num1 - num2;

        } else if (studentClass.includes('3') || studentClass.includes('4')) {
            const ops = ['+', '-', '×'];
            op = ops[Math.floor(Math.random() * ops.length)];
            if (op === '×') {
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 9) + 1;
                ans = num1 * num2;
            } else {
                num1 = Math.floor(Math.random() * 50) + 10;
                num2 = Math.floor(Math.random() * 30) + 1;
                if (op === '-' && num1 < num2) [num1, num2] = [num2, num1];
                ans = op === '+' ? num1 + num2 : num1 - num2;
            }

        } else { // Class 5 to Class 8
            const ops = ['+', '-', '×', '÷'];
            op = ops[Math.floor(Math.random() * ops.length)];
            if (op === '÷') {
                num2 = Math.floor(Math.random() * 9) + 2;
                ans = Math.floor(Math.random() * 10) + 1;
                num1 = num2 * ans; // Ensure clean integer division
            } else if (op === '×') {
                num1 = Math.floor(Math.random() * 15) + 2;
                num2 = Math.floor(Math.random() * 12) + 2;
                ans = num1 * num2;
            } else {
                num1 = Math.floor(Math.random() * 100) + 10;
                num2 = Math.floor(Math.random() * 100) + 10;
                ans = op === '+' ? num1 + num2 : num1 - num2;
            }
        }

        currentEquation = { ans };
        eqBox.innerText = `${num1} ${op} ${num2} = ?`;
        
        const inputField = document.getElementById('user-answer');
        if (inputField) {
            inputField.value = '';
            inputField.focus();
        }
    }
}

// Generate 4 Unique Options for Early Years MCQ
function generateMCQOptions(correctAns) {
    const opts = new Set([correctAns]);
    while (opts.size < 4) {
        let wrong = correctAns + (Math.floor(Math.random() * 5) - 2);
        if (wrong > 0 && wrong !== correctAns) opts.add(wrong);
        else opts.add(correctAns + opts.size);
    }
    return Array.from(opts).sort(() => Math.random() - 0.5);
}

// Answer Handlers
function handleMCQAnswer(selectedVal) {
    if (selectedVal === currentEquation.ans) {
        score += 10;
        document.getElementById('game-score').innerText = score;
    }
    generateEquationByGrade();
}

function checkAnswerDirect() {
    const inputField = document.getElementById('user-answer');
    if (!inputField) return;
    const userAns = parseInt(inputField.value);
    if (!isNaN(userAns) && userAns === currentEquation.ans) {
        score += 10;
        document.getElementById('game-score').innerText = score;
    }
    generateEquationByGrade();
}

// 🏁 6. END GAME & SYNC
async function endGame() {
    clearInterval(timerInterval);
    if (gameArena) gameArena.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'block';

    document.getElementById('final-score').innerText = score;

    if (activeStudent && score > (activeStudent.highScore || 0)) {
        activeStudent.highScore = score;
        localStorage.setItem('ms_active_student', JSON.stringify(activeStudent));
    }

    document.getElementById('personal-high-score').innerText = activeStudent?.highScore || score;

    if (activeStudent?.id) {
        try {
            const studentRef = doc(db, "students", activeStudent.id);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const currentData = studentSnap.data();
                await updateDoc(studentRef, {
                    lastScore: score,
                    highScore: Math.max(score, currentData.highScore || 0),
                    gamesCompleted: (currentData.gamesCompleted || 0) + 1,
                    mathSpeedScores: arrayUnion(score)
                });
            }
            fetchGlobalTopper();
        } catch (err) {
            console.error("Score sync error:", err);
        }
    }
}
