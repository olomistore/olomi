import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/
firebase - app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebaseauth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/
firebase - firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.3/
firebase - storage.js";
export const firebaseConfig = {
    apiKey: "SEU_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_BUCKET",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);