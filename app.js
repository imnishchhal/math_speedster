// app.js - SIMPLE CONNECTION TEST
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "math-speedster.firebaseapp.com",
    projectId: "math-speedster",
    storageBucket: "math-speedster.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseConnection() {
    console.log("⚡ Testing connection to Cloud Firestore...");
    
    const topperBadge = document.getElementById('global-topper-badge');
    if (topperBadge) topperBadge.innerText = "⏳ Testing Database Connection...";

    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        
        console.log(`✅ SUCCESS! Connected to Firebase. Total student records found: ${querySnapshot.size}`);
        if (topperBadge) {
            topperBadge.innerHTML = `✅ <b>Firebase Connected!</b> Records: ${querySnapshot.size}`;
            topperBadge.style.color = "#10b981"; // Green
        }
    } catch (error) {
        console.error("❌ CONNECTION FAILED!", error);
        if (topperBadge) {
            topperBadge.innerHTML = `❌ <b>Failed:</b> ${error.code} - ${error.message}`;
            topperBadge.style.color = "#f87171"; // Red
        }
    }
}

// Run test on load
document.addEventListener('DOMContentLoaded', testFirebaseConnection);
