// admin-ledger.js
import { auth, db } from "./firebase-config.js";
import { doc, collection, getDocs, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let cachedStudents = [];
let cachedParents = {};
let cachedAgents = {};

const recordsTableBody = document.getElementById('admin-table-records-body');
const agentsTableBody = document.getElementById('admin-table-agents-body');
const statTotalStudents = document.getElementById('stat-total-students');
const statTotalAgents = document.getElementById('stat-total-agents');
const statTotalRuns = document.getElementById('stat-total-runs');
const onboardForm = document.getElementById('onboard-form');
const addAgentForm = document.getElementById('add-agent-form'); // 💼 Added Agent Form Linker
const filterSearchInput = document.getElementById('filter-search-input');
const filterClassDropdown = document.getElementById('filter-class-dropdown');
const btnExportCSV = document.getElementById('btn-export-csv');

// Auth Gateway se trigger hone par data load hoga
window.addEventListener('adminAuthenticated', () => {
    loadComprehensiveSystemData();
});

async function loadComprehensiveSystemData() {
    try {
        if (recordsTableBody) recordsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Streaming database ledger...</td></tr>';
        if (agentsTableBody) agentsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Awaiting field agent matrix...</td></tr>';
        
        const [studentsSnap, usersSnap, agentsSnap] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(collection(db, "users")),
            getDocs(collection(db, "agents"))
        ]);

        cachedStudents = []; cachedParents = {}; cachedAgents = {};
        usersSnap.forEach(doc => { cachedParents[doc.id] = { id: doc.id, ...doc.data() }; });
        agentsSnap.forEach(doc => { cachedAgents[doc.id] = { id: doc.id, ...doc.data() }; });
        studentsSnap.forEach(doc => { cachedStudents.push({ id: doc.id, ...doc.data() }); });

        if (statTotalStudents) statTotalStudents.innerText = cachedStudents.length;
        if (statTotalAgents) statTotalAgents.innerText = Object.keys(cachedAgents).length;
        
        let aggregateRuns = 0;
        cachedStudents.forEach(s => {
            if (s.mathSpeedScores) aggregateRuns += s.mathSpeedScores.length;
            else aggregateRuns += ((parseInt(s.gamesCompleted) || 0) + (parseInt(s.gamesAborted) || 0));
        });
        if (statTotalRuns) statTotalRuns.innerText = aggregateRuns;

        renderSystemRecordsTable(cachedStudents);
        renderAgentsManagementTable();
    } catch (err) { console.error("Data pull error:", err); }
}

function renderSystemRecordsTable(studentsArray) {
    if (!recordsTableBody) return;
    let rowsHTML = "";
    if (studentsArray.length === 0) {
        recordsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">No records matched.</td></tr>';
        return;
    }
    studentsArray.forEach(student => {
        const parent = cachedParents[student.parentId] || { name: "N/A", phone: "N/A" };
        let highscore = student.highScore || 0;
        if (student.mathSpeedScores && student.mathSpeedScores.length > 0) highscore = Math.max(...student.mathSpeedScores, highscore);
        const lastScore = student.lastScore || 0;
        const completed = student.gamesCompleted || 0;
        const aborted = student.gamesAborted || 0;
        const totalPlayed = student.mathSpeedScores ? student.mathSpeedScores.length : (completed + aborted);

        rowsHTML += `
            <tr id="row-student-${student.id}">
                <td><span id="txt-pname-${student.id}" style="font-weight:600;">${parent.name}</span></td>
                <td><span id="txt-pphone-${student.id}">${parent.phone}</span></td>
                <td><span id="txt-sname-${student.id}" style="color:#f8fafc;">${student.name}</span></td>
                <td><span class="badge badge-info" id="txt-sclass-${student.id}">${student.class}</span></td>
                <td style="color:#10b981; font-weight:bold; text-align:center;">${highscore}⚡ <span style="color:#94a3b8; font-size:0.8rem; font-weight:normal;">(Last: ${lastScore})</span></td>
                <td style="color:#38bdf8; font-weight:bold; text-align:center;">${totalPlayed} <span style="color:#64748b; font-size:0.75rem; font-weight:normal;">(Aborted: ${aborted})</span></td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-xs btn-edit-student" data-id="${student.id}" data-pid="${parent.id}" data-mode="edit">✏️ Edit</button>
                    <button class="btn btn-danger btn-xs btn-delete-student" data-id="${student.id}" data-pid="${parent.id}" style="margin-left:4px;">🗑️ Del</button>
                </td>
            </tr>`;
    });
    recordsTableBody.innerHTML = rowsHTML;
}

// 👑 FIXED: Ab agents registry table bilkul 8 columns ke structure me render hogi
function renderAgentsManagementTable() {
    if (!agentsTableBody) return;
    let rowsHTML = "";
    
    const agentKeys = Object.keys(cachedAgents);
    if (agentKeys.length === 0) {
        agentsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No agents onboarded yet.</td></tr>';
        return;
    }

    const commissionRate = parseInt(document.getElementById('config-commission-rate')?.value) || 50;

    agentKeys.forEach(id => {
        const a = cachedAgents[id];
        
        // Dynamic calculations based on leads
        const totalLeads = parseInt(a.totalLeads) || 0;
        const grossEarnings = totalLeads * commissionRate;
        const disbursed = parseInt(a.paid) || 0;
        const balanceDue = grossEarnings - disbursed;
        const isSuspended = a.status === "Suspended";

        rowsHTML += `
            <tr id="row-agent-${a.id}">
                <td><strong>${a.name}</strong></td>
                <td>${a.email}</td>
                <td style="text-align: center; font-weight: bold; color: #fff;">${totalLeads}</td>
                <td style="color: #38bdf8; font-weight: bold;">₹${grossEarnings}</td>
                <td style="color: #10b981;">₹${disbursed}</td>
                <td style="color: #f59e0b; font-weight: bold;">₹${balanceDue}</td>
                <td>
                    <button class="switch-btn ${isSuspended ? 'status-suspended' : 'status-active'} btn-toggle-agent-status" data-id="${a.id}" data-status="${a.status || 'Active'}">
                        ${isSuspended ? 'Suspended' : 'Active'}
                    </button>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-xs btn-pay-agent" data-id="${a.id}">💳 Record Payout</button>
                </td>
            </tr>`;
    });
    agentsTableBody.innerHTML = rowsHTML;
}

// ➕ NEW: Naye Field Agent Add Karne Ka Live Submit Handler
if (addAgentForm) {
    addAgentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const agentName = document.getElementById('new-agent-name').value.trim();
        const agentEmail = document.getElementById('new-agent-email').value.trim().toLowerCase();
        const submitBtn = addAgentForm.querySelector('button[type="submit"]');

        if (!agentName || !agentEmail) return;

        try {
            submitBtn.innerText = "Authorizing...";
            submitBtn.disabled = true;

            // Agent collection node creation
            await setDoc(doc(db, "agents", agentEmail), {
                name: agentName,
                email: agentEmail,
                status: "Active",
                totalLeads: 0,
                paid: 0,
                createdAt: new Date()
            });

            alert(`✨ Success: ${agentName} has been authorized as field staff!`);
            addAgentForm.reset();
            loadComprehensiveSystemData(); // Refresh complete screen
        } catch (err) {
            console.error("Agent Onboarding Error:", err);
            alert("Failed to authorize agent: " + err.message);
        } finally {
            submitBtn.innerText = "Authorize Agent";
            submitBtn.disabled = false;
        }
    });
}

// 📝 NEW: Direct Onboard Form Submit Handler (Bacha Add Karne Ka Backend Logic)
if (onboardForm) {
    onboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const parentName = document.getElementById('form-parent-name').value.trim();
        const parentPhone = document.getElementById('form-parent-phone').value.trim();
        const childName = document.getElementById('form-child-name').value.trim();
        const childClass = document.getElementById('form-child-class').value;
        const submitBtn = onboardForm.querySelector('button[type="submit"]');

        if (!parentName || !parentPhone || !childName || !childClass) return;

        try {
            submitBtn.innerText = "⚡ Committing Node to Cloud...";
            submitBtn.disabled = true;

            // 1. Create or Update User (Parent) Profile Document
            await setDoc(doc(db, "users", parentPhone), {
                name: parentName,
                phone: parentPhone,
                role: "parent",
                createdAt: new Date()
            }, { merge: true });

            // 2. Create Student Profile Document
            // Yahan student ID hum phone_childname format me bana rahe hain taaki unique rahe
            const studentId = `${parentPhone}_${childName.replace(/\s+/g, '').toLowerCase()}`;
            
            await setDoc(doc(db, "students", studentId), {
                id: studentId,
                parentId: parentPhone,
                name: childName,
                class: childClass,
                highScore: 0,
                lastScore: 0,
                gamesCompleted: 0,
                gamesAborted: 0,
                onboardedBy: "Admin Direct", // 👈 Direct admin se ho raha hai
                createdAt: new Date()
            });

            alert(`🎉 Success: ${childName} has been successfully onboarded!`);
            onboardForm.reset();
            loadComprehensiveSystemData(); // Refresh list instantly
        } catch (err) {
            console.error("Direct Onboarding Pipeline Failed:", err);
            alert("Onboarding failed: " + err.message);
        } finally {
            submitBtn.innerText = "Lock Target Data Profile & Commit Node to Cloud 🚀";
            submitBtn.disabled = false;
        }
    });
}

// 100% SAFE CONTEXT INTERCEPTOR FOR DIRECT EDIT/SAVE & AGENT CONTROLS
document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-student');
    const deleteBtn = e.target.closest('.btn-delete-student');
    const statusBtn = e.target.closest('.btn-toggle-agent-status');
    const payBtn = e.target.closest('.btn-pay-agent');
    
    // 1. STUDENT EDIT/SAVE
    if (editBtn) {
        e.preventDefault();
        const studentId = editBtn.getAttribute('data-id');
        const parentId = editBtn.getAttribute('data-pid');
        const parentNameSpan = document.getElementById(`txt-pname-${studentId}`);
        const parentPhoneSpan = document.getElementById(`txt-pphone-${studentId}`);
        const studentNameSpan = document.getElementById(`txt-sname-${studentId}`);
        const currentMode = editBtn.getAttribute('data-mode') || "edit";

        if (currentMode === "edit") {
            if (parentNameSpan) parentNameSpan.innerHTML = `<input type="text" id="inp-pname-${studentId}" value="${parentNameSpan.innerText.trim()}" style="padding:4px; font-size:0.85rem; width:110px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
            if (parentPhoneSpan) parentPhoneSpan.innerHTML = `<input type="text" id="inp-pphone-${studentId}" value="${parentPhoneSpan.innerText.trim()}" style="padding:4px; font-size:0.85rem; width:110px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
            if (studentNameSpan) studentNameSpan.innerHTML = `<input type="text" id="inp-sname-${studentId}" value="${studentNameSpan.innerText.trim()}" style="padding:4px; font-size:0.85rem; width:110px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px;">`;
            editBtn.innerHTML = "💾 Save";
            editBtn.setAttribute('data-mode', 'save');
            editBtn.className = "btn btn-primary btn-xs btn-edit-student";
        } else {
            const inputParentName = document.getElementById(`inp-pname-${studentId}`);
            const inputParentPhone = document.getElementById(`inp-pphone-${studentId}`);
            const inputStudentName = document.getElementById(`inp-sname-${studentId}`);
            if (!inputParentName || !inputParentPhone || !inputStudentName) return;

            try {
                editBtn.innerHTML = "⏳ Saving...";
                await updateDoc(doc(db, "students", studentId), { name: inputStudentName.value.trim() });
                await updateDoc(doc(db, "users", parentId), { name: inputParentName.value.trim(), phone: inputParentPhone.value.trim() });
                editBtn.innerHTML = "✏️ Edit";
                editBtn.setAttribute('data-mode', 'edit');
                editBtn.className = "btn btn-secondary btn-xs btn-edit-student";
                loadComprehensiveSystemData();
            } catch (err) { alert("Write error: " + err.message); }
        }
    }

    // 2. STUDENT DELETE
    if (deleteBtn) {
        e.preventDefault();
        const studentId = deleteBtn.getAttribute('data-id');
        if (confirm("Delete profile document node permanently?")) {
            try { await deleteDoc(doc(db, "students", studentId)); loadComprehensiveSystemData(); } 
            catch (err) { alert("Delete failed: " + err.message); }
        }
    }

    // 3. 💼 TOGGLE AGENT STATUS (ACTIVE/SUSPENDED)
    if (statusBtn) {
        e.preventDefault();
        const agentId = statusBtn.getAttribute('data-id');
        const currentStatus = statusBtn.getAttribute('data-status');
        const newStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
        
        if (confirm(`Change agent privilege status to ${newStatus}?`)) {
            try {
                await updateDoc(doc(db, "agents", agentId), { status: newStatus });
                loadComprehensiveSystemData();
            } catch (err) { alert("Status sync error: " + err.message); }
        }
    }

    // 4. 💳 RECORD AGENT PAYOUT
    if (payBtn) {
        e.preventDefault();
        const agentId = payBtn.getAttribute('data-id');
        const currentAgent = cachedAgents[agentId];
        const currentPaid = parseInt(currentAgent.paid) || 0;
        
        const payoutAmount = prompt(`Enter amount paid to ${currentAgent.name}:`);
        if (payoutAmount === null || payoutAmount.trim() === "" || isNaN(payoutAmount)) return;

        try {
            const finalPaidSum = currentPaid + parseInt(payoutAmount);
            await updateDoc(doc(db, "agents", agentId), { paid: finalPaidSum });
            alert("💵 Payout ledger transaction complete!");
            loadComprehensiveSystemData();
        } catch (err) { alert("Payout update failed: " + err.message); }
    }
});

// Search execution filtering logic loops
function filterRegistrySearch() {
    const query = filterSearchInput.value.toLowerCase();
    const classFilter = filterClassDropdown.value;
    const filtered = cachedStudents.filter(s => {
        const p = cachedParents[s.parentId] || { name: "", phone: "" };
        const textMatch = s.name.toLowerCase().includes(query) || p.name.toLowerCase().includes(query) || p.phone.includes(query);
        return textMatch && (classFilter === "" || s.class === classFilter);
    });
    renderSystemRecordsTable(filtered);
}
if (filterSearchInput) filterSearchInput.addEventListener('input', filterRegistrySearch);
if (filterClassDropdown) filterClassDropdown.addEventListener('change', filterRegistrySearch);

// Scalar commission input automatic tracking
const commRateInput = document.getElementById('config-commission-rate');
if (commRateInput) commRateInput.addEventListener('input', renderAgentsManagementTable);
