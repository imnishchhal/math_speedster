// agent-gateway.js (TESTING MODE - NO LOGIN REQUIRED)
import { db } from "./firebase-config.js";
import { doc, collection, getDocs, query, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 👇 TESTING CONTEXT: Bina login ke is email ID par saara hisab chalega
const dummyAgentEmail = "agent@mail.com"; 
const dummyAgentName = "testagent";

const agentWorkspace = document.getElementById('agent-workspace');
const agentAuthSection = document.getElementById('agent-auth-section');
const agentWelcomeText = document.getElementById('agent-welcome-text');

const statLeads = document.getElementById('stat-agent-leads');
const statGross = document.getElementById('stat-agent-gross');
const statPaid = document.getElementById('stat-agent-paid');
const statBalance = document.getElementById('stat-agent-balance');

const agentOnboardForm = document.getElementById('agent-onboard-form');
const agentLedgerContainer = document.getElementById('agent-ledger-container');

// Page load hote hi seedhe testing workspace khol do
document.addEventListener('DOMContentLoaded', () => {
    // HTML inline script ne pehle hi elements switch kar diye hain, bas welcome text aur data load karo
    if (agentWelcomeText) {
        agentWelcomeText.innerText = `Operator: ${dummyAgentName} (${dummyAgentEmail}) 🚀`;
    }
    loadAgentDashboardData();
});

// 📊 1. AGENT DASHBOARD & LEDGER LOAD LOGIC
async function loadAgentDashboardData() {
    try {
        if (agentLedgerContainer) {
            agentLedgerContainer.innerHTML = '<div style="text-align: center; color: #64748b; padding: 15px;">Streaming your secured field records...</div>';
        }

        // A. Database se is specific agent ka live metadata uthao (Leads and Paid)
        const agentDocSnap = await getDoc(doc(db, "agents", dummyAgentEmail));
        let totalLeads = 0;
        let disbursedPaid = 0;

        if (agentDocSnap.exists()) {
            const agentData = agentDocSnap.data();
            totalLeads = parseInt(agentData.totalLeads) || 0;
            disbursedPaid = parseInt(agentData.paid) || 0;
        }

        // B. Dynamic Commission Rate Formulator (Admin ke config form se constant backup rate)
        // Testing me hum default ₹50 lekar chal rahe hain
        const currentCommissionRate = 50; 
        const grossEarnings = totalLeads * currentCommissionRate;
        const balanceDue = grossEarnings - disbursedPaid;

        // Stats UI parameters injection
        if (statLeads) statLeads.innerText = totalLeads;
        if (statGross) statGross.innerText = `₹${grossEarnings}`;
        if (statPaid) statPaid.innerText = `₹${disbursedPaid}`;
        if (statBalance) statBalance.innerText = `₹${balanceDue}`;

        // C. LEDGER: Sirf is agent ke onboard kiye hue bachon ki list lekar aao
        const studentQuery = query(collection(db, "students"), where("onboardedBy", "==", dummyAgentEmail));
        const querySnapshot = await getDocs(studentQuery);
        
        let ledgerHTML = "";
        if (querySnapshot.empty) {
            ledgerHTML = '<div style="text-align: center; color: #64748b; padding: 15px;">No family profiles onboarded by you yet.</div>';
        } else {
            querySnapshot.forEach((doc) => {
                const s = doc.data();
                ledgerHTML += `
                    <div class="ledger-card">
                        <div class="ledger-info">
                            <h4>${s.name}</h4>
                            <p>Parent Phone: ${s.parentId || 'N/A'}</p>
                        </div>
                        <span class="badge">${s.class}</span>
                    </div>
                `;
            });
        }
        if (agentLedgerContainer) agentLedgerContainer.innerHTML = ledgerHTML;

    } catch (err) {
        console.error("Agent data pull error:", err);
    }
}

// 📝 2. FAST-TRACK FAMILY ONBOARDING SUBMIT HANDLER
if (agentOnboardForm) {
    agentOnboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const parentName = document.getElementById('agent-parent-name').value.trim();
        const parentPhone = document.getElementById('agent-parent-phone').value.trim();
        const childName = document.getElementById('agent-child-name').value.trim();
        const childClass = document.getElementById('agent-child-class').value;
        const submitBtn = agentOnboardForm.querySelector('button[type="submit"]');

        if (!parentName || !parentPhone || !childName || !childClass) return;

        try {
            submitBtn.innerText = "⚡ Committing Node...";
            submitBtn.disabled = true;

            // Step A: Users collection me Parent profile save/merge karo
            await setDoc(doc(db, "users", parentPhone), {
                name: parentName,
                phone: parentPhone,
                role: "parent",
                createdAt: new Date()
            }, { merge: true });

            // Step B: Students collection me bacha save karo (Tagged with Agent Email)
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
                onboardedBy: dummyAgentEmail, // 👈 Agent identity injected permanent!
                createdAt: new Date()
            });

            // Step C: Agent ke totalLeads counter ko database me automatic +1 badhao
            const agentDocRef = doc(db, "agents", dummyAgentEmail);
            const agentDocSnap = await getDoc(agentDocRef);
            let currentLeads = 0;
            
            if (agentDocSnap.exists()) {
                currentLeads = parseInt(agentDocSnap.data().totalLeads) || 0;
            }
            
            // Cloud database sync update
            const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await updateDoc(agentDocRef, {
                totalLeads: currentLeads + 1
            });

            alert(`🎉 Success: ${childName} successfully onboarded under your account!`);
            agentOnboardForm.reset();
            
            // Re-render whole panel instantly
            loadAgentDashboardData();

        } catch (err) {
            console.error("Onboarding Form Error:", err);
            alert("Submission failed: " + err.message);
        } finally {
            submitBtn.innerText = "Submit Registration Node 🚀";
            submitBtn.disabled = false;
        }
    });
}

// Exit Portal Button Testing Logic
const logoutBtn = document.getElementById('btn-agent-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        alert("Testing Mode: Logout clicked! Real auth will disconnect session here.");
    });
}
