import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
