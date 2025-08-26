import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { showNotification } from './utils.js'; // Importa a nova função

// --- FORMULÁRIO DE LOGIN DO CLIENTE ---
const loginClienteForm = document.getElementById('login-cliente-form');
if (loginClienteForm) {
    loginClienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginClienteForm.email.value.trim();
        const password = loginClienteForm.password.value.trim();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect');
            
            window.location.href = redirectUrl || 'index.html';

        } catch (err) {
            console.error("Erro ao entrar:", err);
            showNotification('Erro ao entrar: Verifique o seu e-mail e senha.', 'error');
        }
    });
}

// --- LÓGICA PARA ATUALIZAR A NAVEGAÇÃO DO UTILIZADOR (CABEÇALHO) ---
async function updateUserNav() {
    onAuthStateChanged(auth, async (user) => {
        const adminLinkContainer = document.getElementById('admin-link-container');
        const userNav = document.getElementById('user-navigation');
        
        if (adminLinkContainer) adminLinkContainer.innerHTML = '';
        if (userNav) userNav.innerHTML = '';

        if (user) {
            // Verifica se o utilizador é administrador
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            if (snap.exists() && snap.data().admin) {
                if (adminLinkContainer) adminLinkContainer.innerHTML = `<a href="admin.html" class="cart-link admin-link">Painel Admin</a>`;
            }

            // Mostra a navegação do cliente
            if (userNav) {
                userNav.innerHTML = `
                    <a href="minha-conta.html" class="cart-link">Minha Conta</a>
                    <button id="logout-cliente" class="logout-btn">Sair</button>
                `;
                document.getElementById('logout-cliente')?.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = 'index.html';
                    });
                });
            }
        } else {
            // Mostra os links de login/registo se não houver utilizador
            if (userNav) {
                userNav.innerHTML = `
                    <a href="login-cliente.html" class="cart-link">Entrar</a>
                    <a href="cadastro.html" class="cart-link">Registar</a>
                `;
            }
        }
    });
}

updateUserNav();
