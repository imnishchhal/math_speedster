// agent-gateway.js (FORCED TESTING BUNDLE - DIRECT FIRESTORE INJECTION)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, collection, getDocs, query, where, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "math-speedster.firebaseapp.com",
    projectId: "math-speedster",
    storageBucket: "math-speedster.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dummyAgentEmail = "agent@mail.com"; 
const dummyAgentName = "testagent";

document.addEventListener('DOMContentLoaded', () => {
    const welcomeText = document.getElementById('agent-welcome-text');
    if (welcomeText) welcomeText.innerText = `Operator: ${dummyAgentName} (${dummyAgentEmail}) 🚀`;

    loadAgentDashboardData();
    setupFormListener();
});

async function loadAgentDashboardData() {
    let totalLeads = 0;
    let disbursedPaid = 0;
    const currentCommissionRate = 50;

    try {
        const agentDocSnap = await getDoc(doc(db, "agents", dummyAgentEmail));
        if (agentDocSnap.exists()) {
            const agentData = agentDocSnap.data();
            totalLeads = parseInt(agentData.totalLeads) || 0;
            disbursedPaid = parseInt(agentData.paid) || 0;
        }
    } catch (err) {
        console.warn("Bypassing agent metadata fetch:", err);
    }

    const grossEarnings = totalLeads * currentCommissionRate;
    const balanceDue = grossEarnings - disbursedPaid;

    const statLeads = document.getElementById('stat-agent-leads');
    const statGross = document.getElementById('stat-agent-gross');
    const statPaid = document.getElementById('stat-agent-paid');
    const statBalance = document.getElementById('stat-agent-balance');

    if (statLeads) statLeads.innerText = totalLeads;
    if (statGross) statGross.innerText = `₹${grossEarnings}`;
    if (statPaid) statPaid.innerText = `₹${disbursedPaid}`;
    if (statBalance) statBalance.innerText = `₹${balanceDue}`;

    const agentLedgerContainer = document.getElementById('agent-ledger-container');
    try {
        const studentQuery = query(collection(db, "students"), where("onboardedBy", "==", dummyAgentEmail));
        const querySnapshot = await getDocs(studentQuery);
        
        let ledgerHTML = "";
        if (querySnapshot.empty) {
            ledgerHTML = '<div style="text-align: center; color: #64748b; padding: 15px;">No family profiles onboarded by you yet.</div>';
        } else {
            querySnapshot.forEach((docSnap) => {
                const s = docSnap.data();
                ledgerHTML += `
                    <div class="ledger-card">
                        <div class="ledger-info">
                            <h4>${s.name || 'Student'}</h4>
                            <p>Parent Phone: ${s.parentId || 'N/A'}</p>
                        </div>
                        <span class="badge">${s.class || 'N/A'}</span>
                    </div>`;
            });
        }
        if (agentLedgerContainer) agentLedgerContainer.innerHTML = ledgerHTML;
    } catch (err) {
        console.error("Ledger error:", err);
        if (agentLedgerContainer) agentLedgerContainer.innerHTML = '<div style="text-align: center; color: #f87171; padding: 15px;">⚠️ Ready for new onboarding entries.</div>';
    }
}

function setupFormListener() {
    const agentOnboardForm = document.getElementById('agent-onboard-form');
    if (!agentOnboardForm) return;

    agentOnboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const parentName = document.getElementById('agent-parent-name')?.value.trim();
        const parentPhone = document.getElementById('agent-parent-phone')?.value.trim();
        const childName = document.getElementById('agent-child-name')?.value.trim();
        const childClass = document.getElementById('agent-child-class')?.value;
        const submitBtn = agentOnboardForm.querySelector('button[type="submit"]');

        try {
            if (submitBtn) { submitBtn.innerText = "⚡ Committing Node..."; submitBtn.disabled = true; }

            await setDoc(doc(db, "users", parentPhone), { name: parentName, phone: parentPhone, role: "parent", createdAt: new Date() }, { merge: true });

            const studentId = `${parentPhone}_${childName.replace(/\s+/g, '').toLowerCase()}`;
            await setDoc(doc(db, "students", studentId), {
                id: studentId, parentId: parentPhone, name: childName, class: childClass, highScore: 0, lastScore: 0, gamesCompleted: 0, gamesAborted: 0, onboardedBy: dummyAgentEmail, createdAt: new Date()
            });

            const agentDocRef = doc(db, "agents", dummyAgentEmail);
            const agentDocSnap = await getDoc(agentDocRef);
            let currentLeads = 0;
            if (agentDocSnap.exists()) currentLeads = parseInt(agentDocSnap.data().totalLeads) || 0;
            
            await updateDoc(agentDocRef, { totalLeads: currentLeads + 1 });

            alert(`🎉 Success: ${childName} onboarded successfully!`);
            agentOnboardForm.reset();
            loadAgentDashboardData();
        } catch (err) {
            alert("Onboarding failed: " + err.message);
        } finally {
            if (submitBtn) { submitBtn.innerText = "Submit Registration Node 🚀"; submitBtn.disabled = false; }
        }
    });
}
