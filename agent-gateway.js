// agent-gateway.js (v6.0 - SAFE FETCH, FULL PG-CLASS 8 ONBOARDING & RELIABLE LOGOUT)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    memoryLocalCache, 
    doc, 
    collection, 
    getDocs, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔥 FIREBASE CONFIG (math-speed-web)
const firebaseConfig = {
    authDomain: "math-speed-web.firebaseapp.com",
    projectId: "math-speed-web",
    storageBucket: "math-speed-web.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

// Agent Session Check
let activeAgentEmail = localStorage.getItem('ms_agent_email') || "demo.agent@mathspeed.com";

document.addEventListener('DOMContentLoaded', () => {
    const welcomeTxt = document.getElementById('agent-welcome-text');
    if (welcomeTxt) welcomeTxt.innerText = `Logged in as: ${activeAgentEmail}`;

    loadAgentDashboard();
    setupAgentEvents();
});

function setupAgentEvents() {
    // 🔒 Reliable Logout Event
    const logoutBtn = document.getElementById('btn-agent-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Clear all local session data
            localStorage.removeItem('ms_agent_email');
            localStorage.removeItem('ms_parent_phone');
            localStorage.removeItem('ms_active_student');
            
            alert("Logged out successfully!");
            
            // Hard Reload & Redirect to clean state
            window.location.href = window.location.pathname + '?v=' + Date.now();
        });
    }

    // 📝 Form Submission Handler
    const form = document.getElementById('agent-onboard-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const parentName = document.getElementById('agent-parent-name').value.trim();
            const phone = document.getElementById('agent-parent-phone').value.trim();
            const childName = document.getElementById('agent-child-name').value.trim();
            const childClass = document.getElementById('agent-child-class').value;

            if (phone.length !== 10) {
                alert("Please enter a valid 10-digit mobile number!");
                return;
            }

            const parentId = `parent_${phone}`;
            const studentId = `student_${Date.now()}`;

            try {
                // 1. Save Parent Node
                await setDoc(doc(db, "users", parentId), {
                    name: parentName,
                    phone: phone,
                    role: "parent",
                    createdAt: new Date()
                }, { merge: true });

                // 2. Save Student Node
                await setDoc(doc(db, "students", studentId), {
                    name: childName,
                    class: childClass,
                    parentId: parentId,
                    highScore: 0,
                    lastScore: 0,
                    gamesCompleted: 0,
                    mathSpeedScores: [],
                    onboardedBy: activeAgentEmail,
                    createdAt: new Date()
                });

                alert(`✅ Registered ${childName} (${childClass}) successfully!`);
                form.reset();
                loadAgentDashboard();

            } catch (err) {
                console.error("Onboarding Error:", err);
                alert("Registration failed: " + err.message);
            }
        });
    }
}

// Safe Dashboard Fetch (No Stream Blockage)
async function loadAgentDashboard() {
    const ledgerContainer = document.getElementById('agent-ledger-container');
    const statLeads = document.getElementById('stat-agent-leads');
    const statGross = document.getElementById('stat-agent-gross');
    const statPaid = document.getElementById('stat-agent-paid');
    const statBalance = document.getElementById('stat-agent-balance');

    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        let count = 0;
        let html = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.onboardedBy === activeAgentEmail || !data.onboardedBy) {
                count++;
                html += `
                    <div class="ledger-card">
                        <div class="ledger-info">
                            <h4>${data.name || 'Unnamed'} <span class="badge">${data.class || 'N/A'}</span></h4>
                            <p>Parent Phone: ${data.parentId ? data.parentId.replace('parent_', '') : 'N/A'}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #38bdf8; font-weight: 700;">${data.highScore || 0} pts</div>
                            <small style="color: #64748b;">${data.gamesCompleted || 0} played</small>
                        </div>
                    </div>`;
            }
        });

        if (statLeads) statLeads.innerText = count;
        
        const grossEarned = count * 50;
        if (statGross) statGross.innerText = `₹${grossEarned}`;
        if (statPaid) statPaid.innerText = `₹0`;
        if (statBalance) statBalance.innerText = `₹${grossEarned}`;

        if (ledgerContainer) {
            ledgerContainer.innerHTML = count > 0 ? html : '<div style="text-align: center; color: #64748b; padding: 15px;">No students registered yet.</div>';
        }

    } catch (err) {
        console.warn("Dashboard load fallback:", err);
        if (ledgerContainer) ledgerContainer.innerHTML = '<div style="text-align: center; color: #f87171; padding: 15px;">Failed to load records.</div>';
    }
}
