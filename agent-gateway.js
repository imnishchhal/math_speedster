// agent-gateway.js (BULLETPROOF TESTING MODE)
import { db } from "./firebase-config.js";
import { doc, collection, getDocs, query, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const dummyAgentEmail = "agent@mail.com"; 
const dummyAgentName = "testagent";

const agentWelcomeText = document.getElementById('agent-welcome-text');
const statLeads = document.getElementById('stat-agent-leads');
const statGross = document.getElementById('stat-agent-gross');
const statPaid = document.getElementById('stat-agent-paid');
const statBalance = document.getElementById('stat-agent-balance');
const agentOnboardForm = document.getElementById('agent-onboard-form');
const agentLedgerContainer = document.getElementById('agent-ledger-container');

// 🚀 Instant Trigger
if (agentWelcomeText) {
    agentWelcomeText.innerText = `Operator: ${dummyAgentName} (${dummyAgentEmail}) 🚀`;
}

// Load data immediately
loadAgentDashboardData();

// 📊 1. DASHBOARD & LEDGER STREAMER
async function loadAgentDashboardData() {
    let totalLeads = 0;
    let disbursedPaid = 0;
    const currentCommissionRate = 50;

    try {
        // Firebase se live data uthane ki koshish karo
        const agentDocSnap = await getDoc(doc(db, "agents", dummyAgentEmail));
        if (agentDocSnap.exists()) {
            const agentData = agentDocSnap.data();
            totalLeads = parseInt(agentData.totalLeads) || 0;
            disbursedPaid = parseInt(agentData.paid) || 0;
        }
    } catch (firebaseErr) {
        console.warn("⚠️ Firebase Metadata Offline (Using Local Default):", firebaseErr);
    }

    // Calculations
    const grossEarnings = totalLeads * currentCommissionRate;
    const balanceDue = grossEarnings - disbursedPaid;

    // Inject into UI (Ye har haal me chalega ab)
    if (statLeads) statLeads.innerText = totalLeads;
    if (statGross) statGross.innerText = `₹${grossEarnings}`;
    if (statPaid) statPaid.innerText = `₹${disbursedPaid}`;
    if (statBalance) statBalance.innerText = `₹${balanceDue}`;

    try {
        // Ledger List Load Logic
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
                            <h4>${s.name || 'Unknown Child'}</h4>
                            <p>Parent Phone: ${s.parentId || 'N/A'}</p>
                        </div>
                        <span class="badge">${s.class || 'N/A'}</span>
                    </div>
                `;
            });
        }
        if (agentLedgerContainer) agentLedgerContainer.innerHTML = ledgerHTML;
    } catch (ledgerErr) {
        console.error("Ledger Fetch Error:", ledgerErr);
        if (agentLedgerContainer) {
            agentLedgerContainer.innerHTML = '<div style="text-align: center; color: #f87171; padding: 15px;">⚠️ Failed to stream records from cloud.</div>';
        }
    }
}

// 📝 2. FORM SUBMIT HANDLER
if (agentOnboardForm) {
    agentOnboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const parentName = document.getElementById('agent-parent-name').value.trim();
        const parentPhone = document.getElementById('agent-parent-phone').value.trim();
        const childName = document.getElementById('agent-child-name').value.trim();
        const childClass = document.getElementById('agent-child-class').value;
        const submitBtn = agentOnboardForm.querySelector('button[type="submit"]');

        try {
            submitBtn.innerText = "⚡ Committing Node...";
            submitBtn.disabled = true;

            // Step A: Save Parent Profile
            await setDoc(doc(db, "users", parentPhone), {
                name: parentName,
                phone: parentPhone,
                role: "parent",
                createdAt: new Date()
            }, { merge: true });

            // Step B: Save Student Profile
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
                onboardedBy: dummyAgentEmail,
                createdAt: new Date()
            });

            // Step C: Update Agent Counter
            const agentDocRef = doc(db, "agents", dummyAgentEmail);
            const agentDocSnap = await getDoc(agentDocRef);
            let currentLeads = 0;
            if (agentDocSnap.exists()) {
                currentLeads = parseInt(agentDocSnap.data().totalLeads) || 0;
            }
            
            const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await updateDoc(agentDocRef, { totalLeads: currentLeads + 1 });

            alert(`🎉 Success: ${childName} successfully onboarded!`);
            agentOnboardForm.reset();
            loadAgentDashboardData();

        } catch (err) {
            console.error("Form Submission Error:", err);
            alert("Submission failed: " + err.message);
        } finally {
            submitBtn.innerText = "Submit Registration Node 🚀";
            submitBtn.disabled = false;
        }
    });
}
