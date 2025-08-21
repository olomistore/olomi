import { db, auth } from './firebase.js'; // Importa o 'auth'
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const listEl = document.getElementById('products');
// ... (outros elementos)

// --- NOVO: LÓGICA DO LINK DE ADMINISTRAÇÃO ---
async function setupAdminLink() {
    onAuthStateChanged(auth, async (user) => {
        const container = document.getElementById('admin-link-container');
        if (!container) return;

        if (user) {
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            if (snap.exists() && snap.data().admin) {
                container.innerHTML = `<a href="admin.html" class="cart-link" style="font-weight: bold;">Painel Admin</a>`;
            } else {
                container.innerHTML = '';
            }
        } else {
            container.innerHTML = '';
        }
    });
}


// --- FUNÇÃO DE INICIALIZAÇÃO ATUALIZADA ---
async function init() {
    // ... (código existente para carregar produtos, etc.)

    // Chama a nova função para configurar o link de administração
    setupAdminLink(); 
}

// --- INICIALIZAÇÃO ---
init();

// O restante do seu código (render, filter, addToCart, etc.) permanece o mesmo...
// ...
