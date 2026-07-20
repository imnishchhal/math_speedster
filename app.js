// app.js (GAME ENGINE v7.0 - PG TO CLASS 8 GRADE ADAPTIVE)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    memoryLocalCache, 
    doc, 
    collection, 
    getDocs, 
    getDoc, 
    updateDoc, 
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔥 FIREBASE CONFIG
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

// 👨‍👩‍👧 3. LOAD STUDENT PROFILES
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
                const studentClass = s.class || 'UKG';
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

    const studentClass = (activeStudent?.class || 'UKG').trim().toUpperCase();
    const isEarlyYears = ['PG', 'PLAYGROUP', 'NURSERY', 'LKG', 'UKG'].includes(studentClass);

    score = 0;
    timeLeft = isEarlyYears ? 45 : 30; // 45s for PG-UKG, 30s for Class 1-8
    
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

// 🧠 5. GRADE-BASED QUESTION ENGINE (PG to Class 8)
function generateEquationByGrade() {
    const studentClass = (activeStudent?.class || 'UKG').trim().toUpperCase();
    const isEarlyYears = ['PG', 'PLAYGROUP', 'NURSERY', 'LKG', 'UKG'].includes(studentClass);
    const isPrimary12 = ['CLASS 1', '1', '1ST', 'CLASS 2', '2', '2ND'].includes(studentClass);

    const eqBox = document.getElementById('equation-box');
    const visualBox = document.getElementById('visual-image-box');
    const mcqContainer = document.getElementById('mcq-options-container');
    const directInputArea = document.getElementById('direct-input-area');

    if (isEarlyYears) {
        // --- 🐣 PG TO UKG: VISUAL EMOJI MCQ MODE ---
        if (directInputArea) directInputArea.style.display = 'none';
        if (visualBox) visualBox.style.display = 'block';
        if (mcqContainer) mcqContainer.style.display = 'grid';

        const randomIcon = visualIcons[Math.floor(Math.random() * visualIcons.length)];
        const isCount = Math.random() > 0.4;

        if (isCount) {
            const count = Math.floor(Math.random() * 5) + 1; // 1 to 5
            currentEquation = { ans: count };
            if (eqBox) eqBox.innerText = "Count the objects:";
            if (visualBox) visualBox.innerText = randomIcon.repeat(count);
        } else {
            const num1 = Math.floor(Math.random() * 3) + 1;
            const num2 = Math.floor(Math.random() * 3) + 1;
            currentEquation = { ans: num1 + num2 };
            if (eqBox) eqBox.innerText = "How many in total?";
            if (visualBox) visualBox.innerText = `${randomIcon.repeat(num1)}  +  ${randomIcon.repeat(num2)}`;
        }

        renderMCQOptions(currentEquation.ans);

    } else if (isPrimary12) {
        // --- ✏️ CLASS 1 & 2: SIMPLE MCQ ARITHMETIC ---
        if (directInputArea) directInputArea.style.display = 'none';
        if (visualBox) visualBox.style.display = 'none';
        if (mcqContainer) mcqContainer.style.display = 'grid';

        let num1 = Math.floor(Math.random() * 10) + 1;
        let num2 = Math.floor(Math.random() * 10) + 1;
        const op = Math.random() > 0.5 ? '+' : '-';
        
        if (op === '-' && num1 < num2) [num1, num2] = [num2, num1];
        const ans = op === '+' ? num1 + num2 : num1 - num2;

        currentEquation = { ans };
        if (eqBox) eqBox.innerText = `${num1} ${op} ${num2} = ?`;

        renderMCQOptions(ans);

    } else {
        // --- 🎒 CLASS 3 TO CLASS 8: DIRECT INPUT ARITHMETIC ---
        if (visualBox) visualBox.style.display = 'none';
        if (mcqContainer) mcqContainer.style.display = 'none';
        if (directInputArea) directInputArea.style.display = 'flex';

        let num1, num2, op = '+', ans;

        if (studentClass.includes('3') || studentClass.includes('4')) {
            const ops = ['+', '-', '×'];
            op = ops[Math.floor(Math.random() * ops.length)];
            if (op === '×') {
                num1 = Math.floor(Math.random() * 9) + 2;
                num2 = Math.floor(Math.random() * 9) + 1;
                ans = num1 * num2;
            } else {
                num1 = Math.floor(Math.random() * 40) + 10;
                num2 = Math.floor(Math.random() * 30) + 1;
                if (op === '-' && num1 < num2) [num1, num2] = [num2, num1];
                ans = op === '+' ? num1 + num2 : num1 - num2;
            }

        } else if (studentClass.includes('5') || studentClass.includes('6')) {
            const ops = ['+', '-', '×', '÷'];
            op = ops[Math.floor(Math.random() * ops.length)];
            if (op === '÷') {
                num2 = Math.floor(Math.random() * 8) + 2;
                ans = Math.floor(Math.random() * 9) + 1;
                num1 = num2 * ans;
            } else if (op === '×') {
                num1 = Math.floor(Math.random() * 12) + 2;
                num2 = Math.floor(Math.random() * 12) + 2;
                ans = num1 * num2;
            } else {
                num1 = Math.floor(Math.random() * 80) + 10;
                num2 = Math.floor(Math.random() * 50) + 10;
                if (op === '-' && num1 < num2) [num1, num2] = [num2, num1];
                ans = op === '+' ? num1 + num2 : num1 - num2;
            }

        } else { // Class 7 & Class 8 (Integers & Squares)
            const type = Math.floor(Math.random() * 3);
            if (type === 0) { // Square Root / Square
                const base = Math.floor(Math.random() * 10) + 2;
                ans = base * base;
                eqBox.innerText = `${base}² = ?`;
                op = 'square';
            } else if (type === 1) { // Negative Integer Multiplication
                num1 = (Math.floor(Math.random() * 8) + 1) * -1;
                num2 = Math.floor(Math.random() * 8) + 1;
                ans = num1 * num2;
                eqBox.innerText = `(${num1}) × ${num2} = ?`;
                op = 'integer';
            } else { // Mixed Division
                num2 = Math.floor(Math.random() * 12) + 2;
                ans = Math.floor(Math.random() * 12) + 1;
                num1 = num2 * ans;
                eqBox.innerText = `${num1} ÷ ${num2} = ?`;
                op = '÷';
            }
        }

        if (op !== 'square' && op !== 'integer') {
            if (eqBox) eqBox.innerText = `${num1} ${op} ${num2} = ?`;
        }

        currentEquation = { ans };
        
        const inputField = document.getElementById('user-answer');
        if (inputField) {
            inputField.value = '';
            inputField.focus();
        }
    }
}

// Generate 4 Unique Options for MCQ
function renderMCQOptions(correctAns) {
    const mcqContainer = document.getElementById('mcq-options-container');
    if (!mcqContainer) return;

    const opts = new Set([correctAns]);
    while (opts.size < 4) {
        let wrong = correctAns + (Math.floor(Math.random() * 5) - 2);
        if (wrong >= 0 && wrong !== correctAns) opts.add(wrong);
        else opts.add(correctAns + opts.size);
    }
    
    const sortedOptions = Array.from(opts).sort(() => Math.random() - 0.5);

    mcqContainer.innerHTML = '';
    sortedOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mcq-btn';
        btn.innerText = opt;
        btn.onclick = () => handleMCQAnswer(opt);
        mcqContainer.appendChild(btn);
    });
}

// Answer Handlers
function handleMCQAnswer(selectedVal) {
    if (selectedVal === currentEquation.ans) {
        score += 10;
        const scoreElem = document.getElementById('game-score');
        if (scoreElem) scoreElem.innerText = score;
    }
    generateEquationByGrade();
}

function checkAnswerDirect() {
    const inputField = document.getElementById('user-answer');
    if (!inputField) return;
    const userAns = parseInt(inputField.value);
    if (!isNaN(userAns) && userAns === currentEquation.ans) {
        score += 10;
        const scoreElem = document.getElementById('game-score');
        if (scoreElem) scoreElem.innerText = score;
    }
    generateEquationByGrade();
}

// 🏁 6. END GAME & SYNC
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
