import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCiiWyMqDmF17aQBA-fwNo5ByotEsA7fn0",
  authDomain: "olomi-7816a.firebaseapp.com",
  databaseURL: "https://olomi-7816a-default-rtdb.firebaseio.com",
  projectId: "olomi-7816a",
  storageBucket: "olomi-7816a.appspot.com",
  messagingSenderId: "562685499782",
  appId: "1:562685499782:web:23616d2db4738093c43407",
  measurementId: "G-2FSC9P97MX"
};

// Não altere mais nada abaixo desta linha
// =================================================================================

const app = initializeApp(firebaseConfig);

// Todos estes serviços irão agora apontar para o projeto correto.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
