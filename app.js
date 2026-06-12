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

// 1. MONITOR CORE USER SECURITY AND ACCESS LEVELS
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Run a verification lookup check on the incoming user against the database block blacklist rules
        const agentDocRef = doc(db, "agents", user.uid);
        const agentCheck = await getDoc(agentDocRef);
        
        if (agentCheck.exists() && agentCheck.data().status === "Suspended" && user.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
            alert("Administrative Notification: This agent account access authorization has been suspended.");
            signOut(auth);
            return;
        }

        authSection.classList.remove('visible');
        workspaceContainer.style.display = 'block';
        btnLogout.style.display = 'inline-block';

        // Auto write profile state into internal systems register database catalog
        await setDoc(agentDocRef, {
            name: user.displayName || "Field Staff Personnel",
            email: user.email,
            lastActive: new Date()
        }, { merge: true });

        // CORE ACCESS ROUTING EVALUATOR RULE ENGINE
        if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
            userStatus.innerHTML = `<strong>${user.displayName || 'Master'}</strong> <span class="badge badge-success">👑 ADMIN CONSOLE</span>`;
            adminTabsNav.style.display = 'flex';
            systemConfigFooter.style.display = 'block';
            loadComprehensiveSystemData();
        } else {
            userStatus.innerHTML = `<strong>${user.displayName || 'Agent'}</strong> <span class="badge badge-info">💼 FIELD OPERATIONS</span>`;
            adminTabsNav.style.display = 'none'; // Lock away navigation selection options from general field agents
            systemConfigFooter.style.display = 'none';
            switchActiveTabPanel('panel-onboard'); // Route field agent straight to onboarding form view
        }
    } else {
        userStatus.innerText = "Security System Access: Logged Out Pin Status.";
        authSection.classList.add('visible');
        workspaceContainer.style.display = 'none';
        btnLogout.style.display = 'none';
        systemConfigFooter.style.display = 'none';
    }
});

// 2. FETCH EVERY RECORD CONCURRENTLY AND LOAD COUNTERS
async function loadComprehensiveSystemData() {
    try {
        recordsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Streaming database ledger tables...</td></tr>';
        
        const [studentsSnap, usersSnap, agentsSnap] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(collection(db, "users")),
            getDocs(collection(db, "agents"))
        ]);

        // Reset memory data stores lists
        cachedStudents = [];
        cachedParents = {};
        cachedAgents = {};

        usersSnap.forEach(doc => { cachedParents[doc.id] = { id: doc.id, ...doc.data() }; });
        agentsSnap.forEach(doc => { cachedAgents[doc.id] = { id: doc.id, ...doc.data() }; });
        studentsSnap.forEach(doc => { cachedStudents.push({ id: doc.id, ...doc.data() }); });

        // Update top analytical counter summary panels
        statTotalStudents.innerText = cachedStudents.length;
        statTotalAgents.innerText = Object.keys(cachedAgents).length;
        
        let aggregateRuns = 0;
        cachedStudents.forEach(s => { if (s.mathSpeedScores) aggregateRuns += s.mathSpeedScores.length; });
        statTotalRuns.innerText = aggregateRuns;

        // Populate system panels layout contents
        renderSystemRecordsTable(cachedStudents);
        renderAgentsManagementTable();

    } catch (err) {
        console.error("Central master collection read exception:", err);
    }
}

// 3. RENDER THE STUDENT DB RECORDS LEDGER TABLE (WITH SEARCH / EDIT / DELETE ACTIONS)
function renderSystemRecordsTable(studentsArray) {
    let rowsHTML = "";
    
    if (studentsArray.length === 0) {
        recordsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">No records match your filters.</td></tr>';
        return;
    }

    studentsArray.forEach(student => {
        const parent = cachedParents[student.parentId] || { name: "N/A", phone: "N/A", onboardedBy: "" };
        const agent = cachedAgents[parent.onboardedBy] || { name: "Direct Portal" };
        
        // Compute maximum arithmetic performance speed score
        const highscore = (student.mathSpeedScores && student.mathSpeedScores.length > 0) 
            ? Math.max(...student.mathSpeedScores) 
            : 0;

        rowsHTML += `
            <tr id="row-student-${student.id}">
                <td><span id="txt-pname-${student.id}" style="font-weight:600;">${parent.name}</span></td>
                <td><span id="txt-pphone-${student.id}">${parent.phone}</span></td>
                <td><span id="txt-sname-${student.id}" style="color:#f8fafc;">${student.name}</span></td>
                <td><span class="badge badge-info" id="txt-sclass-${student.id}">${student.class}</span></td>
                <td style="color:#10b981; font-weight:bold; text-align:center;">${highscore}⚡</td>
                <td style="color:#38bdf8;">${agent.name}</td>
                <td style="text-align: center; min-width:160px;">
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
    // Attach inline data amendment triggers
    document.querySelectorAll('.btn-edit-student').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const studentId = btn.getAttribute('data-id');
            const parentId = btn.getAttribute('data-pid');
            
            if (btn.innerText === "✏️ Edit") {
                // Flip text cells into textfields inputs controls
                const parentNameSpan = document.getElementById(`txt-pname-${studentId}`);
                const parentPhoneSpan = document.getElementById(`txt-pphone-${studentId}`);
                const studentNameSpan = document.getElementById(`txt-sname-${studentId}`);
                
                parentNameSpan.innerHTML = `<input type="text" id="inp-pname-${studentId}" value="${parentNameSpan.innerText}" style="padding:4px; font-size:0.85rem;">`;
                parentPhoneSpan.innerHTML = `<input type="text" id="inp-pphone-${studentId}" value="${parentPhoneSpan.innerText}" style="padding:4px; font-size:0.85rem;">`;
                studentNameSpan.innerHTML = `<input type="text" id="inp-sname-${studentId}" value="${studentNameSpan.innerText}" style="padding:4px; font-size:0.85rem;">`;
                
                btn.innerText = "💾 Save";
                btn.classList.replace('btn-secondary', 'btn-primary');
            } else {
                // Extract changes values and commit update modifications back down to Firestore
                const editParentName = document.getElementById(`inp-pname-${studentId}`).querySelector('input').value;
                const editParentPhone = document.getElementById(`inp-pphone-${studentId}`).querySelector('input').value;
                const editStudentName = document.getElementById(`inp-sname-${studentId}`).querySelector('input').value;

                try {
                    await updateDoc(doc(db, "students", studentId), { name: editStudentName });
                    await updateDoc(doc(db, "users", parentId), { name: editParentName, phone: editParentPhone });
                    
                    btn.innerText = "✏️ Edit";
                    btn.classList.replace('btn-primary', 'btn-secondary');
                    loadComprehensiveSystemData(); // Re-sync view elements 
                } catch (err) {
                    alert("Database write validation exception rejection: " + err.message);
                }
            }
        });
    });

    // Attach inline data purge/delete execution actions trigger loops
    document.querySelectorAll('.btn-delete-student').forEach(btn => {
        btn.addEventListener('click', async () => {
            const studentId = btn.getAttribute('data-id');
            const parentId = btn.getAttribute('data-pid');
            
            if (confirm("Security Warning: Are you absolutely sure you want to permanently delete this student record profile? This cannot be undone.")) {
                try {
                    await deleteDoc(doc(db, "students", studentId));
                    // Check if parent has any other kids registered before wiping their account completely
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

// 5. RENDER AGENT LIST AND CALCULATE COMMISSIONS / PERFORMANCE LEAD METRICS
// 5. RENDER AGENT LIST AND CALCULATE COMMISSIONS / PERFORMANCE LEAD METRICS
function renderAgentsManagementTable() {
    let rowsHTML = "";
    
    // Get the current commission rate set in the UI layout input field
    const rateInput = document.getElementById('config-commission-rate');
    const payoutRate = rateInput ? parseFloat(rateInput.value) || 0 : 50;
    
    Object.keys(cachedAgents).forEach(agentId => {
        const agent = cachedAgents[agentId];
        
        // Count total leads onboarded by comparing agent UID against parent metadata records
        const leadsCount = Object.values(cachedParents).filter(p => p.onboardedBy === agentId).length;
        
        // Extract financial parameters from database or default to zero
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

    // Bind event to recalculate values dynamically if the master admin updates the flat rate input box
    const rateInputEl = document.getElementById('config-commission-rate');
    if (rateInputEl && !rateInputEl.dataset.listenerAttached) {
        rateInputEl.dataset.listenerAttached = true;
        rateInputEl.addEventListener('input', () => {
            renderAgentsManagementTable();
        });
    }

    // Bind agent access control block toggles
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

    // Bind Payout Processing Trigger Buttons
    document.querySelectorAll('.btn-record-payout').forEach(btn => {
        btn.addEventListener('click', async () => {
            const agentId = btn.getAttribute('data-id');
            const balanceDue = parseFloat(btn.getAttribute('data-balance'));
            
            const payoutInput = prompt(`Enter the amount to settle for this agent (Max Balance Due: ₹${balanceDue}):`, balanceDue);
            if (payoutInput === null) return; // Action cancelled by user
            
            const payoutAmount = parseFloat(payoutInput);
            if (isNaN(payoutAmount) || payoutAmount <= 0 || payoutAmount > balanceDue) {
                alert("Invalid Entry: Please enter a valid number greater than 0 and less than or equal to the balance due.");
                return;
            }

            try {
                const agent = cachedAgents[agentId];
                const currentPaidSum = agent.amountPaid || 0;
                const newPaidSum = currentPaidSum + payoutAmount;

                // Update ledger profile in Firestore database
                await updateDoc(doc(db, "agents", agentId), {
                    amountPaid: newPaidSum,
                    lastPaymentDate: new Date()
                });

                alert(`Payment Confirmed: Successfully recorded settlement of ₹${payoutAmount}. Ledger profile updated.`);
                loadComprehensiveSystemData(); // Re-sync core dataset elements view
            } catch (err) {
                alert("Failed to commit transaction updates: " + err.message);
            }
        });
    });
}

// 6. CLIENT SEARCH ENGINE SUBROUTINE FILTER LOGIC LOOP
function executeLiveLocalFilteringSearch() {
    const query = filterSearchInput.value.toLowerCase();
    const classFilter = filterClassDropdown.value;

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
filterSearchInput.addEventListener('input', executeLiveLocalFilteringSearch);
filterClassDropdown.addEventListener('change', executeLiveLocalFilteringSearch);

// 7. FORM SUBMISSION WORKFLOW HANDLING FOR AGENTS & ADMIN
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
            mathSpeedScores: []
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

// 8. DATA PORTABILITY EXPORT UTILITY TO EXCEL/CSV SHEET
btnExportCSV.addEventListener('click', () => {
    if (cachedStudents.length === 0) return alert("Data registry vector empty.");
    
    let csvData = "Parent Name,WhatsApp Phone,Child Name,Class Level,High Score\n";
    cachedStudents.forEach(s => {
        const p = cachedParents[s.parentId] || { name: "N/A", phone: "N/A" };
        const score = (s.mathSpeedScores && s.mathSpeedScores.length > 0) ? Math.max(...s.mathSpeedScores) : 0;
        csvData += `"${p.name}","${p.phone}","${s.name}","${s.class}",${score}\n`;
    });

    const fileBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(fileBlob);
    downloadLink.setAttribute("download", `MathSpeedster_Records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

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

// 10. PARENT PORTAL PORT LIMIT CHECK-IN LOGIC ENGINE
const parentLoginForm = document.getElementById('parent-login-form');
const parentPortalStatus = document.getElementById('parent-portal-status');

if (parentLoginForm) {
    parentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inputPhone = document.getElementById('parent-portal-phone').value.trim();
        parentPortalStatus.style.display = "block";
        parentPortalStatus.style.background = "#1e293b";
        parentPortalStatus.style.color = "#94a3b8";
        parentPortalStatus.innerHTML = "Searching database cluster... 🔍";

        try {
            // Construct the exact primary key layout structure matching our onboarding module
            const targetParentKey = "parent_" + inputPhone;
            
            // Execute parallel lookups for speed optimization
            const parentDocSnap = await getDoc(doc(db, "users", targetParentKey));
            
            if (!parentDocSnap.exists()) {
                parentPortalStatus.style.background = "#7f1d1d";
                parentPortalStatus.style.color = "#f87171";
                parentPortalStatus.innerHTML = "❌ Number not found. Please ask your field agent to verify your registration.";
                return;
            }

            // Query the student profile mapped to this parent profile index
            const studentsQuerySnap = await getDocs(collection(db, "students"));
            let matchingStudent = null;

            studentsQuerySnap.forEach((doc) => {
                const data = doc.data();
                if (data.parentId === targetParentKey) {
                    matchingStudent = { id: doc.id, ...data };
                }
            });

            if (!matchingStudent) {
                parentPortalStatus.style.background = "#7f1d1d";
                parentPortalStatus.style.color = "#f87171";
                parentPortalStatus.innerHTML = "❌ Account found, but no student profile is linked. Contact Admin.";
                return;
            }

            // Success Verification Trigger! 
            parentPortalStatus.style.background = "#065f46";
            parentPortalStatus.style.color = "#34d399";
            parentPortalStatus.innerHTML = `
                <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px;">Welcome back, ${matchingStudent.name}! 👋</div>
                <div style="font-size:0.85rem;">Class Level Locked: <strong>${matchingStudent.class}</strong></div>
                <div style="margin-top:10px; font-size:0.9rem; color:#fff; font-weight:bold; text-transform:uppercase; animation: pulse 1.5s infinite;">
                    Initializing Game Engines... 🚀
                </div>
            `;

            // Session data payload block is ready for consumption by our game core modules!
            console.log("Active Student Session Initialized Successfully:", matchingStudent);
            
            // NEXT STEP CONNECTOR: This is where we will call our game engine launch file sequence!

        } catch (err) {
            console.error("Parent check-in pipeline rejection:", err);
            parentPortalStatus.style.background = "#7f1d1d";
            parentPortalStatus.style.color = "#f87171";
            parentPortalStatus.innerHTML = "Database communication exception error: " + err.message;
        }
    });
}
// 11. ADVANCED SECURITY GATEWAY PROFILE SIGN IN TRIGGERS
// Optimized for seamless rendering across both desktop browsers and mobile touchscreens
btnGoogleLogin.addEventListener('click', () => {
    // Check if the agent is opening the portal on a mobile layout framework
    if (window.innerWidth <= 767) {
        // Safe fullscreen slide redirect for smooth native mobile execution
        signInWithRedirect(auth, provider);
    } else {
        // Instant interactive breakout pop-up for widescreen laptops
        signInWithPopup(auth, provider);
    }
});

btnLogout.addEventListener('click', () => {
    if (confirm("Are you sure you want to log out of the Math Speedster Command Engine?")) {
        signOut(auth);
    }
});
