// Import modules from the core Firebase Web Delivery Stack 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, collection, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your production Firebase cloud configuration matrix block
const firebaseConfig = {
    apiKey: "AIzaSyD2j024emoJTfqfqjRcybS8Ip59qzx5cSs",
    authDomain: "math-speed-web.firebaseapp.com",
    projectId: "math-speed-web",
    storageBucket: "math-speed-web.firebasestorage.app",
    messagingSenderId: "601738228699",
    appId: "1:601738228699:web:741dafc734dd2afb4a2dfe",
    measurementId: "G-PZYC6KSHK2"
};

// Fire up client state engine modules
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// CONFIGURATION: Set your exact system email account right here
const MASTER_ADMIN_EMAIL = "kumarnishchhal175@gmail.com"; 

// Memory cache array stores to support realtime instant filter operations without re-querying firebase
let cachedStudents = [];
let cachedParents = {};
let cachedAgents = {};

// DOM Layout Container Pointers
const authSection = document.getElementById('auth-section');
const workspaceContainer = document.getElementById('workspace-container');
const adminTabsNav = document.getElementById('admin-tabs-nav');
const systemConfigFooter = document.getElementById('system-config-footer');

// Modular Tab Screen View Panel Blocks Pointers
const panelRecords = document.getElementById('panel-records');
const panelAgents = document.getElementById('panel-agents');
const panelOnboard = document.getElementById('panel-onboard');

// Form Input Fields Elements Pointers
const onboardForm = document.getElementById('onboard-form');
const filterSearchInput = document.getElementById('filter-search-input');
const filterClassDropdown = document.getElementById('filter-class-dropdown');

// Dynamic Text Elements and Tables Targets
const userStatus = document.getElementById('user-status');
const recordsTableBody = document.getElementById('admin-table-records-body');
const agentsTableBody = document.getElementById('admin-table-agents-body');
const statTotalStudents = document.getElementById('stat-total-students');
const statTotalAgents = document.getElementById('stat-total-agents');
const statTotalRuns = document.getElementById('stat-total-runs');

// Action Trigger Button Pointers
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const btnExportCSV = document.getElementById('btn-export-csv');

// Game Arena Runtime Engine Core Global Track Variables
let activeStudent = null;
let gameTimerInterval = null;
let currentCorrectAnswer = 0;
let currentSessionScore = 0;
let secondsRemaining = 30;
const assetSprites = ["🍏", "⭐", "🎈", "🚗", "🧸", "🐱", "🍦", "🍕", "🤖"];

const panelLogin = document.getElementById('panel-login');
const panelGame = document.getElementById('panel-game');
const gamePlayerTag = document.getElementById('game-player-tag');
const gameTimerClock = document.getElementById('game-timer-clock');
const gameScoreCounter = document.getElementById('game-score-counter');
const visualEmojiDisplay = document.getElementById('visual-emoji-display');
const gameQuestionBox = document.getElementById('game-question-box');
const btnAbortGame = document.getElementById('btn-abort-game');

// 1. MONITOR CORE USER SECURITY AND ACCESS LEVELS
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const agentDocRef = doc(db, "agents", user.uid);
            const agentCheck = await getDoc(agentDocRef);
            
            if (agentCheck.exists() && agentCheck.data().status === "Suspended" && user.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
                alert("Administrative Notification: This agent account access authorization has been suspended.");
                signOut(auth);
                return;
            }

            if (authSection) authSection.classList.remove('visible');
            if (workspaceContainer) workspaceContainer.style.display = 'block';
            if (btnLogout) btnLogout.style.display = 'inline-block';

            await setDoc(agentDocRef, {
                name: user.displayName || "Field Staff Personnel",
                email: user.email,
                lastActive: new Date()
            }, { merge: true });

            if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
                if (userStatus) userStatus.innerHTML = `<strong>${user.displayName || 'Master'}</strong> <span class="badge badge-success">👑 ADMIN CONSOLE</span>`;
                if (adminTabsNav) adminTabsNav.style.display = 'flex';
                if (systemConfigFooter) systemConfigFooter.style.display = 'block';
                loadComprehensiveSystemData();
            } else {
                if (userStatus) userStatus.innerHTML = `<strong>${user.displayName || 'Agent'}</strong> <span class="badge badge-info">💼 FIELD OPERATIONS</span>`;
                if (adminTabsNav) adminTabsNav.style.display = 'none'; 
                if (systemConfigFooter) systemConfigFooter.style.display = 'none';
                switchActiveTabPanel('panel-onboard'); 
            }
        } catch (err) {
            console.error("Authentication state routing failure:", err);
        }
    } else {
        if (userStatus) userStatus.innerText = "Security System Access: Logged Out Pin Status.";
        if (authSection) authSection.classList.add('visible');
        if (workspaceContainer) workspaceContainer.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
        if (systemConfigFooter) systemConfigFooter.style.display = 'none';
    }
});

// 2. FETCH EVERY RECORD CONCURRENTLY AND LOAD COUNTERS
async function loadComprehensiveSystemData() {
    try {
        if (recordsTableBody) {
            recordsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Streaming database ledger tables...</td></tr>';
        }
        
        const [studentsSnap, usersSnap, agentsSnap] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(collection(db, "users")),
            getDocs(collection(db, "agents"))
        ]);

        cachedStudents = [];
        cachedParents = {};
        cachedAgents = {};

        usersSnap.forEach(doc => { cachedParents[doc.id] = { id: doc.id, ...doc.data() }; });
        agentsSnap.forEach(doc => { cachedAgents[doc.id] = { id: doc.id, ...doc.data() }; });
        studentsSnap.forEach(doc => { cachedStudents.push({ id: doc.id, ...doc.data() }); });

        if (statTotalStudents) statTotalStudents.innerText = cachedStudents.length;
        if (statTotalAgents) statTotalAgents.innerText = Object.keys(cachedAgents).length;
        
        let aggregateRuns = 0;
        cachedStudents.forEach(s => {
            const completed = parseInt(s.gamesCompleted) || 0;
            const aborted = parseInt(s.gamesAborted) || 0;
            aggregateRuns += (completed + aborted);
        });
        if (statTotalRuns) statTotalRuns.innerText = aggregateRuns;

        renderSystemRecordsTable(cachedStudents);
        renderAgentsManagementTable();

    } catch (err) {
        console.error("Central master collection read exception:", err);
    }
}

// 3. RENDER THE STUDENT DB RECORDS LEDGER TABLE (WITH INDIVIDUAL ANALYTICS COLUMNS)
function renderSystemRecordsTable(studentsArray) {
    if (!recordsTableBody) return;
    let rowsHTML = "";
    
    if (studentsArray.length === 0) {
        recordsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No records match your filters.</td></tr>';
        return;
    }

    studentsArray.forEach(student => {
        const parent = cachedParents[student.parentId] || { name: "N/A", phone: "N/A", onboardedBy: "" };
        
        // Extract precise historical performance fields
        const highestScore = student.highScore || 0;
        const lastScore = student.lastScore || 0;
        const gamesCompleted = student.gamesCompleted || 0;
        const gamesAborted = student.gamesAborted || 0;

        rowsHTML += `
    <tr id="row-student-${student.id}">
        <td><span id="txt-pname-${student.id}" style="font-weight:600;">${parent.name}</span></td>
        <td><span id="txt-pphone-${student.id}">${parent.phone}</span></td>
        <td><span id="txt-sname-${student.id}" style="color:#f8fafc;">${student.name}</span></td>
        <td><span class="badge badge-info" id="txt-sclass-${student.id}">${student.class}</span></td>
        <td style="color:#10b981; font-weight:bold; text-align:center;">${highscore}⚡ <span style="color:#94a3b8; font-size:0.8rem; font-weight:normal;">(Last: ${lastScore})</span></td>
        <td style="text-align:center; color:#e2e8f0; font-weight:600;">${completed + aborted} <span style="color:#64748b; font-size:0.75rem; font-weight:normal;">(Aborted: ${aborted})</span></td>
        <td style="text-align: center;">
            <button class="btn btn-secondary btn-xs btn-edit-student" data-id="${student.id}" data-pid="${parent.id}">✏️ Edit</button>
            <button class="btn btn-danger btn-xs btn-delete-student" data-id="${student.id}" data-pid="${parent.id}" style="margin-left:4px;">🗑️ Del</button>
        </td>
    </tr>
`;
    });
    
    recordsTableBody.innerHTML = rowsHTML;
    bindInteractiveRecordActionButtons();
}
// 4. INLINE EDITING AND ROW PURGE EVENT ATTACHMENTS 
function bindInteractiveRecordActionButtons() {
    document.querySelectorAll('.btn-edit-student').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const studentId = btn.getAttribute('data-id');
            const parentId = btn.getAttribute('data-pid');
            
            if (btn.innerText === "✏️ Edit") {
                const parentNameSpan = document.getElementById(`txt-pname-${studentId}`);
                const parentPhoneSpan = document.getElementById(`txt-pphone-${studentId}`);
                const studentNameSpan = document.getElementById(`txt-sname-${studentId}`);
                
                parentNameSpan.innerHTML = `<input type="text" id="inp-pname-${studentId}" value="${parentNameSpan.innerText}" style="padding:4px; font-size:0.85rem; width:100px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
                parentPhoneSpan.innerHTML = `<input type="text" id="inp-pphone-${studentId}" value="${parentPhoneSpan.innerText}" style="padding:4px; font-size:0.85rem; width:100px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
                studentNameSpan.innerHTML = `<input type="text" id="inp-sname-${studentId}" value="${studentNameSpan.innerText}" style="padding:4px; font-size:0.85rem; width:100px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
                
                btn.innerText = "💾 Save";
                btn.classList.replace('btn-secondary', 'btn-primary');
            } else {
                const editParentName = document.getElementById(`inp-pname-${studentId}`).querySelector('input').value;
                const editParentPhone = document.getElementById(`inp-pphone-${studentId}`).querySelector('input').value;
                const editStudentName = document.getElementById(`inp-sname-${studentId}`).querySelector('input').value;

                try {
                    await updateDoc(doc(db, "students", studentId), { name: editStudentName });
                    await updateDoc(doc(db, "users", parentId), { name: editParentName, phone: editParentPhone });
                    
                    btn.innerText = "✏️ Edit";
                    btn.classList.replace('btn-primary', 'btn-secondary');
                    loadComprehensiveSystemData(); 
                } catch (err) {
                    alert("Database write validation exception rejection: " + err.message);
                }
            }
        });
    });

    document.querySelectorAll('.btn-delete-student').forEach(btn => {
        btn.addEventListener('click', async () => {
            const studentId = btn.getAttribute('data-id');
            const parentId = btn.getAttribute('data-pid');
            
            if (confirm("Security Warning: Are you absolutely sure you want to permanently delete this student record profile? This cannot be undone.")) {
                try {
                    await deleteDoc(doc(db, "students", studentId));
                    const checkOtherKids = cachedStudents.filter(s => s.parentId === parentId && s.id !== studentId);
                    if (checkOtherKids.length === 0) {
                        await deleteDoc(doc(db, "users", parentId));
                    }
                    loadComprehensiveSystemData();
                } catch (err) {
                    alert("Delete execution error: " + err.message);
                }
            }
        });
    });
}

// 5. RENDER AGENT LIST AND CALCULATE COMMISSIONS
function renderAgentsManagementTable() {
    if (!agentsTableBody) return;
    let rowsHTML = "";
    
    const rateInput = document.getElementById('config-commission-rate');
    const payoutRate = rateInput ? parseFloat(rateInput.value) || 0 : 50;
    
    Object.keys(cachedAgents).forEach(agentId => {
        const agent = cachedAgents[agentId];
        const leadsCount = Object.values(cachedParents).filter(p => p.onboardedBy === agentId).length;
        
        const totalEarned = leadsCount * payoutRate;
        const totalPaid = agent.amountPaid || 0;
        const balanceDue = totalEarned - totalPaid;
        
        const currentStatus = agent.status || "Active";
        const statusClass = (currentStatus === "Active") ? "status-active" : "status-suspended";

        rowsHTML += `
            <tr>
                <td><strong>${agent.name}</strong></td>
                <td>${agent.email}</td>
                <td style="text-align:center; font-weight:bold; color:#f59e0b;">${leadsCount} families</td>
                <td style="font-weight:600; color:#38bdf8;">₹${totalEarned}</td>
                <td style="font-weight:600; color:#10b981;">₹${totalPaid}</td>
                <td style="font-weight:600; color: ${balanceDue > 0 ? '#ef4444' : '#94a3b8'};">₹${balanceDue}</td>
                <td>
                    <button class="switch-btn ${statusClass} btn-toggle-agent-status" data-id="${agentId}" data-status="${currentStatus}">
                        ${currentStatus}
                    </button>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-primary btn-xs btn-record-payout" data-id="${agentId}" data-balance="${balanceDue}" ${balanceDue <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                        💸 Pay Agent
                    </button>
                </td>
            </tr>
        `;
    });
    
    agentsTableBody.innerHTML = rowsHTML;

    const rateInputEl = document.getElementById('config-commission-rate');
    if (rateInputEl && !rateInputEl.dataset.listenerAttached) {
        rateInputEl.dataset.listenerAttached = true;
        rateInputEl.addEventListener('input', () => {
            renderAgentsManagementTable();
        });
    }

    document.querySelectorAll('.btn-toggle-agent-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const agentId = btn.getAttribute('data-id');
            const currentStatus = btn.getAttribute('data-status');
            const nextStatus = (currentStatus === "Active") ? "Suspended" : "Active";
            
            if (confirm(`Change authorization access for this staff agent to ${nextStatus}?`)) {
                try {
                    await updateDoc(doc(db, "agents", agentId), { status: nextStatus });
                    loadComprehensiveSystemData();
                } catch (err) {
                    console.error("Agent privilege update error:", err);
                }
            }
        });
    });

    document.querySelectorAll('.btn-record-payout').forEach(btn => {
        btn.addEventListener('click', async () => {
            const agentId = btn.getAttribute('data-id');
            const balanceDue = parseFloat(btn.getAttribute('data-balance'));
            
            const payoutInput = prompt(`Enter the amount to settle for this agent (Max Balance Due: ₹${balanceDue}):`, balanceDue);
            if (payoutInput === null) return; 
            
            const payoutAmount = parseFloat(payoutInput);
            if (isNaN(payoutAmount) || payoutAmount <= 0 || payoutAmount > balanceDue) {
                alert("Invalid Entry: Please enter a valid number greater than 0 and less than or equal to the balance due.");
                return;
            }

            try {
                const agent = cachedAgents[agentId];
                const currentPaidSum = agent.amountPaid || 0;
                const newPaidSum = currentPaidSum + payoutAmount;

                await updateDoc(doc(db, "agents", agentId), {
                    amountPaid: newPaidSum,
                    lastPaymentDate: new Date()
                });

                alert(`Payment Confirmed: Successfully recorded settlement of ₹${payoutAmount}. Ledger profile updated.`);
                loadComprehensiveSystemData(); 
            } catch (err) {
                alert("Failed to commit transaction updates: " + err.message);
            }
        });
    });
}

// 6. CLIENT SEARCH ENGINE SUBROUTINE FILTER LOGIC LOOP
function executeLiveLocalFilteringSearch() {
    if (!filterSearchInput) return;
    const query = filterSearchInput.value.toLowerCase();
    const classFilter = filterClassDropdown ? filterClassDropdown.value : "";

    const filteredList = cachedStudents.filter(student => {
        const parent = cachedParents[student.parentId] || { name: "", phone: "" };
        const matchText = student.name.toLowerCase().includes(query) || 
                          parent.name.toLowerCase().includes(query) || 
                          parent.phone.includes(query);
        const matchClass = classFilter === "" || student.class === classFilter;
        return matchText && matchClass;
    });

    renderSystemRecordsTable(filteredList);
}
if (filterSearchInput) filterSearchInput.addEventListener('input', executeLiveLocalFilteringSearch);
if (filterClassDropdown) filterClassDropdown.addEventListener('change', executeLiveLocalFilteringSearch);

// 7. FORM SUBMISSION WORKFLOW HANDLING FOR AGENTS & ADMIN
if (onboardForm) {
    onboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const agent = auth.currentUser;
        if (!agent) return alert("Security context missing.");

        const pName = document.getElementById('form-parent-name').value;
        const pPhone = document.getElementById('form-parent-phone').value;
        const cName = document.getElementById('form-child-name').value;
        const cClass = document.getElementById('form-child-class').value;

        try {
            const parentKey = "parent_" + pPhone;
            const studentKey = "student_" + Date.now();

            await setDoc(doc(db, "users", parentKey), {
                name: pName,
                phone: pPhone,
                role: "parent",
                onboardedBy: agent.uid,
                createdAt: new Date()
            });

            await setDoc(doc(db, "students", studentKey), {
                parentId: parentKey,
                name: cName,
                class: cClass,
                createdAt: new Date(),
                highScore: 0,
                lastScore: 0,
                gamesCompleted: 0,
                gamesAborted: 0
            });

            alert(`Success! Onboarded ${cName}'s family under Phone ID: ${pPhone}`);
            onboardForm.reset();

            if (agent.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
                loadComprehensiveSystemData();
            }
        } catch (err) {
            alert("Transaction push failed error: " + err.message);
        }
    });
}

// 8. DATA PORTABILITY EXPORT UTILITY TO EXCEL/CSV SHEET
if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
        if (cachedStudents.length === 0) return alert("Data registry vector empty.");
        
        let csvData = "Parent Name,WhatsApp Phone,Child Name,Class Level,High Score,Last Score,Games Completed,Games Aborted\n";
        cachedStudents.forEach(s => {
            const p = cachedParents[s.parentId] || { name: "N/A", phone: "N/A" };
            csvData += `"${p.name}","${p.phone}","${s.name}","${s.class}",${s.highScore || 0},${s.lastScore || 0},${s.gamesCompleted || 0},${s.gamesAborted || 0}\n`;
        });

        const fileBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(fileBlob);
        downloadLink.setAttribute("download", `MathSpeedster_Records_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
}

// 9. RE-USABLE TAB ROUTING INTERFACE CONTROLLER VIEW SWITCHER
function switchActiveTabPanel(targetPanelId) {
    document.querySelectorAll('.panel-card').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const activeTarget = document.getElementById(targetPanelId);
    if(activeTarget) activeTarget.classList.add('visible');
    
    const triggerBtn = document.querySelector(`[data-target="${targetPanelId}"]`);
    if(triggerBtn) triggerBtn.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchActiveTabPanel(btn.getAttribute('data-target'));
    });
});

// 10. PARENT PORTAL ACCESS & RUNTIME ENVIRONMENT INITIALIZATION
function showParentPortalError(msg) {
    if (!parentPortalStatus) return;
    parentPortalStatus.style.background = "#7f1d1d";
    parentPortalStatus.style.color = "#f87171";
    parentPortalStatus.innerHTML = msg;
}

if (parentLoginForm) {
    parentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inputPhone = document.getElementById('parent-portal-phone').value.trim();
        if (!parentPortalStatus) return;

        parentPortalStatus.style.display = "block";
        parentPortalStatus.style.background = "#1e293b";
        parentPortalStatus.style.color = "#94a3b8";
        parentPortalStatus.innerHTML = "Searching database cluster... 🔍";

        try {
            const targetParentKey = "parent_" + inputPhone;
            const parentDocSnap = await getDoc(doc(db, "users", targetParentKey));
            
            if (!parentDocSnap.exists()) {
                showParentPortalError(`❌ Profile not found. Please verify with your Field Agent Or <a href="https://wa.me/917800665883" target="_blank" style="color:#38bdf8; font-weight:bold; text-decoration:underline;">Send details on Whatsapp on 7800665883</a>`);
                return;
            }

            const studentsQuerySnap = await getDocs(collection(db, "students"));
            let matchingStudent = null;

            studentsQuerySnap.forEach((doc) => {
                const data = doc.data();
                if (data.parentId === targetParentKey) {
                    matchingStudent = { id: doc.id, ...data };
                }
            });

            if (!matchingStudent) {
                showParentPortalError("❌ Account found, but no student profile is linked. Contact Admin.");
                return;
            }

            parentPortalStatus.style.background = "#065f46";
            parentPortalStatus.style.color = "#34d399";
            parentPortalStatus.innerHTML = `
                <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px;">Welcome back, ${matchingStudent.name}! 👋</div>
                <div style="font-size:0.85rem;">Class Level Locked: <strong>${matchingStudent.class}</strong></div>
                <div style="margin-top:10px; font-size:0.9rem; color:#fff; font-weight:bold; text-transform:uppercase;">
                    Initializing Game Engines... 🚀
                </div>
            `;

            setTimeout(() => {
                launchActiveGameSession(matchingStudent);
            }, 1200);

        } catch (err) {
            console.error("Parent check-in pipeline rejection:", err);
            showParentPortalError("Database communication exception error: " + err.message);
        }
    });
}

function launchActiveGameSession(studentProfile) {
    activeStudent = studentProfile;
    currentSessionScore = 0;
    secondsRemaining = 30;
    
    if (panelLogin) panelLogin.classList.remove('active');
    if (panelGame) panelGame.classList.add('active');
    
    if (gamePlayerTag) gamePlayerTag.innerText = `Player: ${activeStudent.name}`;
    if (gameScoreCounter) gameScoreCounter.innerText = `Score: 0`;
    if (gameTimerClock) {
        gameTimerClock.innerText = `⏱️ 30s`;
        gameTimerClock.style.color = "#10b981";
    }

    generateNextQuestion();

    clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        secondsRemaining--;
        if (gameTimerClock) gameTimerClock.innerText = `⏱️ ${secondsRemaining}s`;
        if (secondsRemaining <= 10 && gameTimerClock) gameTimerClock.style.color = "#ef4444";
        if (secondsRemaining <= 0) finalizeGameSession(false);
    }, 1000);
}

// MATRIX GENERATOR LINK: Multi-Syllabus Controller with Integrated Math Tables
function generateNextQuestion() {
    if (!activeStudent || !visualEmojiDisplay) return;

    const studentClass = (activeStudent.class || "nursery").toLowerCase();
    const randomSprite = assetSprites[Math.floor(Math.random() * assetSprites.length)];
    const textPrompt = document.getElementById('visual-text-prompt');

    if (studentClass === "nursery") {
        // --- NURSERY: Quantities 1 to 5 ---
        currentCorrectAnswer = Math.floor(Math.random() * 5) + 1;
        visualEmojiDisplay.innerText = randomSprite.repeat(currentCorrectAnswer);
        if (textPrompt) textPrompt.innerText = "How many items do you see?";

    } else if (studentClass === "lkg") {
        // --- LKG: Math Tables 1 to 6 & Sequences ---
        // 50% chance to get a sequence question, 50% chance to get a table puzzle
        if (Math.random() > 0.5) {
            const starterNum = Math.floor(Math.random() * 14) + 1;
            currentCorrectAnswer = starterNum + 1; 
            visualEmojiDisplay.innerText = `${starterNum} ➔ ❓`;
            if (textPrompt) textPrompt.innerText = `What number comes after ${starterNum}?`;
        } else {
            // Pick a random table factor from 1 to 6
            const tableNum = Math.floor(Math.random() * 6) + 1;
            const multiplier = Math.floor(Math.random() * 5) + 1; // Keep multipliers small for LKG (1 to 5)
            currentCorrectAnswer = tableNum * multiplier;
            
            visualEmojiDisplay.innerText = `${tableNum} × ${multiplier} = ❓`;
            if (textPrompt) textPrompt.innerText = `Complete the Table of ${tableNum}!`;
        }

    } else if (studentClass === "ukg") {
        // --- UKG: Math Tables 1 to 10 & Core Math Operations ---
        const gameChoice = Math.random();
        
        if (gameChoice < 0.4) {
            // 40% Chance: Advanced Math Tables from 1 to 10
            const tableNum = Math.floor(Math.random() * 10) + 1; // Tables 1 to 10
            const multiplier = Math.floor(Math.random() * 10) + 1; // Full multiplier range 1 to 10
            currentCorrectAnswer = tableNum * multiplier;
            
            visualEmojiDisplay.innerText = `${tableNum} × ${multiplier} = ❓`;
            if (textPrompt) textPrompt.innerText = `Quick! What is ${tableNum} times ${multiplier}?`;
            
        } else {
            // 60% Chance: Addition or Subtraction Problems
            const isAddition = Math.random() > 0.5;
            const num1 = Math.floor(Math.random() * 9) + 1; 
            const num2 = Math.floor(Math.random() * 9) + 1; 

            if (isAddition) {
                currentCorrectAnswer = num1 + num2;
                visualEmojiDisplay.innerText = `${num1} + ${num2}`;
            } else {
                const maxNum = Math.max(num1, num2);
                const minNum = Math.min(num1, num2);
                currentCorrectAnswer = maxNum - minNum;
                visualEmojiDisplay.innerText = `${maxNum} - ${minNum}`;
            }
            if (textPrompt) textPrompt.innerText = "Solve the puzzle as fast as you can!";
        }
    }
}
// CAPTURE KEYPAD CONTROLS
document.querySelectorAll('.arcade-key').forEach(key => {
    key.addEventListener('click', () => {
        if (!activeStudent || secondsRemaining <= 0) return;
        const userChoice = parseInt(key.getAttribute('data-val'));

        if (userChoice === currentCorrectAnswer) {
            currentSessionScore++;
            if (gameScoreCounter) gameScoreCounter.innerText = `Score: ${currentSessionScore}`;
            flashFeedback("#10b981");
            generateNextQuestion();
        } else {
            flashFeedback("#ef4444");
        }
    });
});

function flashFeedback(color) {
    if (gameQuestionBox) {
        gameQuestionBox.style.borderColor = color;
        setTimeout(() => { gameQuestionBox.style.borderColor = "#334155"; }, 150);
    }
}

// METRIC COMMIT SYSTEM: Highest Score, Last Score, and Game State Totals Tracking
async function finalizeGameSession(wasAborted = false) {
    clearInterval(gameTimerInterval);
    if (!activeStudent) return;

    let currentHigh = parseInt(activeStudent.highScore) || 0;
    let completedCount = parseInt(activeStudent.gamesCompleted) || 0;
    let abortedCount = parseInt(activeStudent.gamesAborted) || 0;

    if (wasAborted) {
        abortedCount++;
        alert(`Session closed early. Progress saved as incomplete.`);
        try {
            await updateDoc(doc(db, "students", activeStudent.id), {
                lastScore: parseInt(currentSessionScore),
                gamesAborted: abortedCount
            });
        } catch (err) {
            console.error("Failed to sync aborted metrics:", err);
        }
    } else {
        completedCount++;
        if (currentSessionScore > currentHigh) {
            currentHigh = currentSessionScore;
            alert(`🏆 New High Score! Outstanding job! You scored ${currentSessionScore} points.`);
        } else {
            alert(`🏁 Time's Up! Great effort! You scored ${currentSessionScore} points.`);
        }

        try {
            await updateDoc(doc(db, "students", activeStudent.id), {
                highScore: currentHigh,
                lastScore: parseInt(currentSessionScore),
                gamesCompleted: completedCount
            });
        } catch (err) {
            console.error("Firestore metrics upload failure:", err);
        }
    }

    activeStudent = null;
    if (panelGame) panelGame.classList.remove('active');
    if (panelLogin) panelLogin.classList.add('active');
    if (parentPortalStatus) parentPortalStatus.style.display = "none";
    if (parentLoginForm) parentLoginForm.reset();
}

if (btnAbortGame) btnAbortGame.addEventListener('click', () => finalizeGameSession(true));

// 11. ADVANCED SECURITY GATEWAY PROFILE SIGN IN TRIGGERS
if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
        if (window.innerWidth <= 767) {
            signInWithRedirect(auth, provider);
        } else {
            signInWithPopup(auth, provider);
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if (confirm("Are you sure you want to log out of the Math Speedster Command Engine?")) {
            signOut(auth);
        }
    });
}
