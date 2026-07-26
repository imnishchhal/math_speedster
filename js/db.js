import { db } from './firebaseConfig.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function fetchTopper() {
  try {
    const docRef = doc(db, "global", "topper");
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : { name: 'None', score: 0 };
  } catch (error) {
    console.error("Error fetching topper:", error);
    return { name: 'N/A', score: 0 };
  }
}

export async function saveGameResult(phone, childId, newScore) {
  if (!phone || !childId) return;
  const childRef = doc(db, "users", phone, "children", childId);
  
  try {
    const snap = await getDoc(childRef);
    const currentHigh = snap.exists() ? (snap.data().highScore || 0) : 0;
    const isNewHigh = newScore > currentHigh;

    await setDoc(childRef, {
      lastScore: newScore,
      highScore: isNewHigh ? newScore : currentHigh,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { isNewHigh };
  } catch (error) {
    console.error("Error saving result:", error);
  }
}
