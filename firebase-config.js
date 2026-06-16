// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2j024emoJTfqfqjRcybS8Ip59qzx5cSs",
    authDomain: "math-speed-web.firebaseapp.com",
    projectId: "math-speed-web",
    storageBucket: "math-speed-web.firebasestorage.app",
    messagingSenderId: "601738228699",
    appId: "1:601738228699:web:741dafc734dd2afb4a2dfe",
    measurementId: "G-PZYC6KSHK2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// firebase-config.js me jahan provider hai use aisa kar do:
export const provider = new GoogleAuthProvider();

// 👇 Ye jadui line jod do, isse Google Cloud ka jhanjhat hamesha ke liye khatam!
provider.setCustomParameters({
    prompt: 'select_account'
});
