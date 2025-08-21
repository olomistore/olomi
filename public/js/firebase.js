// Importa as funções necessárias dos SDKs do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

// TODO: Substitua o seguinte pelas credenciais de configuração do seu projeto Firebase
// Encontre-as em: Configurações do projeto > Geral > Seus apps > App da Web
const firebaseConfig = {
  apiKey: "AIzaSyCiiWyMqDmF17aQBA-fwNo5ByotEsA7fn0",
  authDomain: "olomi-7816a.firebaseapp.com",
  projectId: "olomi-7816a",
  storageBucket: "olomi-7816a.firebasestorage.app",
  messagingSenderId: "562685499782",
  appId: "1:562685499782:web:28732864ca37c610c43407",
  measurementId: "G-WREW35G7PM"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços do Firebase que serão utilizados noutras partes do site
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
