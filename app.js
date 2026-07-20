// app.js - DIAGNOSTIC DATA CHECK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, memoryLocalCache, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "math-speed-web.firebaseapp.com",
    projectId: "math-speed-web",
    storageBucket: "math-speed-web.appspot.com",
};

const app = initializeApp(firebaseConfig);

// Memory cache to bypass persistent stream lock errors
const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

async function inspectCollections() {
    console.log("🔍 Inspecting Firestore database...");
    
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        console.log(`📊 Documents found in 'students' collection: ${querySnapshot.size}`);
        
        if (querySnapshot.size > 0) {
            querySnapshot.forEach((doc) => {
                console.log("📄 Student Record:", doc.id, doc.data());
            });
        } else {
            console.warn("⚠️ 'students' collection is returning 0 docs. Adding a test record...");
            // Test entry write check
            await setDoc(doc(db, "students", "test_student_1"), {
                name: "Test Child",
                class: "UKG",
                highScore: 50,
                parentId: "9999999999"
            });
            console.log("✅ Test record written successfully to 'students' collection!");
        }
    } catch (err) {
        console.error("❌ Inspection Error:", err);
    }
}

document.addEventListener('DOMContentLoaded', inspectCollections);
