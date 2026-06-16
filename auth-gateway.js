// auth-gateway.js
import { auth, db, provider } from "./firebase-config.js";
// 👇 Imports fixed here perfectly
import { signInWithRedirect, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global navigation functions
window.switchActiveTabPanel = function(targetPanelId) {
    document.querySelectorAll('.panel-card').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById(targetPanelId)) document.getElementById(targetPanelId).classList.add('visible');
    if(document.querySelector(`[data-target="${targetPanelId}"]`)) document.querySelector(`[data-target="${targetPanelId}"]`).classList.add('active');
};

const authSection = document.getElementById('auth-section');
const workspaceContainer = document.getElementById('workspace-container');
const adminTabsNav = document.getElementById('admin-tabs-nav');
const systemConfigFooter = document.getElementById('system-config-footer');
const userStatus = document.getElementById('user-status');
const btnLogout = document.getElementById('btn-logout');

// ==========================================
// AUTH STATE MONITOR (DYNAMIC SECURITY)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userEmail = user.email.toLowerCase();
            console.log("🔒 Access verification checking for:", userEmail);

            const adminDocRef = doc(db, "admins", userEmail);
            const adminCheck = await getDoc(adminDocRef);

            if (authSection) authSection.classList.remove('visible');
            if (workspaceContainer) workspaceContainer.style.display = 'block';
            if (btnLogout) btnLogout.style.display = 'inline-block';

            // 1. CHIEF ADMIN ROUTE 👑
            if (adminCheck.exists()) {
                console.log("👑 Database Verified Master Admin!");
                if (userStatus) userStatus.innerHTML = `<strong>${user.displayName || 'Master'}</strong> <span class="badge badge-success">👑 ADMIN CONSOLE</span>`;
                if (adminTabsNav) adminTabsNav.style.display = 'flex';
                if (systemConfigFooter) systemConfigFooter.style.display = 'block';
                
                window.dispatchEvent(new Event('adminAuthenticated'));
            } 
            // 2. FIELD STAFF AGENT ROUTE 💼
            else {
                console.log("💼 Standard Operations Routing Activated.");
                const agentDocRef = doc(db, "agents", user.uid);
                const agentCheck = await getDoc(agentDocRef);
                
                if (agentCheck.exists() && agentCheck.data().status === "Suspended") {
                    alert("Your field staff access has been suspended.");
                    signOut(auth);
                    return;
                }

                await setDoc(agentDocRef, {
                    name: user.displayName || "Field Staff Personnel",
                    email: user.email,
                    lastActive: new Date()
                }, { merge: true });

                if (userStatus) userStatus.innerHTML = `<strong>${user.displayName || 'Agent'}</strong> <span class="badge badge-info">💼 FIELD OPERATIONS</span>`;
                if (adminTabsNav) adminTabsNav.style.display = 'none'; 
                if (systemConfigFooter) systemConfigFooter.style.display = 'none';
                
                window.switchActiveTabPanel('panel-onboard'); 
            }
        } catch (err) {
            console.error("Auth routing failure:", err);
        }
    } else {
        console.log("👤 State: Logged Out");
        if (userStatus) userStatus.innerText = "Logged Out Profile Node.";
        if (authSection) authSection.classList.add('visible');
        if (workspaceContainer) workspaceContainer.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
        if (systemConfigFooter) systemConfigFooter.style.display = 'none';
    }
});

// ==========================================
// GLOBAL CLICK CAPTURER (PRODUCTION REDIRECT)
// ==========================================
// auth-gateway.js ke bilkul neeche click handler ko aisa fix karo:
document.addEventListener('click', (e) => {
    const loginTarget = e.target.closest('#btn-google-login');
    const logoutTarget = e.target.closest('#btn-logout');

    if (loginTarget) {
        e.preventDefault();
        console.log("🚀 Google Login Triggered via Stable Popup!");
        
        // 👇 Wapas wahi purana makhhan method jisse mobile me chal raha tha
        signInWithPopup(auth, provider);
    }

    if (logoutTarget) {
        e.preventDefault();
        if (confirm("Log out of portal?")) {
            console.log("🔒 Logging out...");
            signOut(auth);
        }
    }
});
