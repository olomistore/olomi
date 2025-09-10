// Importa as funções necessárias dos SDKs do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCiiWyMqDmF17aQBA-fwNo5ByotEsA7fn0",
  authDomain: "olomi-7816a.firebaseapp.com",
  databaseURL: "https://olomi-7816a-default-rtdb.firebaseio.com",
  projectId: "olomi-7816a",
  storageBucket: "olomi-7816a.appspot.com", // CORRIGIDO
  messagingSenderId: "562685499782",
  appId: "1:562685499782:web:23616d2db4738093c43407",
  measurementId: "G-2FSC9P97MX"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços do Firebase que serão utilizados noutras partes do site
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
