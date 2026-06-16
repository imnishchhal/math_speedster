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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account'
});

// Ek single clear export loop
export { auth, db, provider };
