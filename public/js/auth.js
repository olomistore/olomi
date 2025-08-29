import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { showNotification } from './utils.js';

// --- LÓGICA PARA ATUALIZAR A NAVEGAÇÃO DO UTILIZADOR (CABEÇALHO) ---
function updateUserNav(user) {
    const adminLinkContainer = document.getElementById('admin-link-container');
    const userNav = document.getElementById('user-navigation');

    // Limpa a navegação antes de a reconstruir para evitar duplicados
    if (adminLinkContainer) adminLinkContainer.innerHTML = '';
    if (userNav) userNav.innerHTML = '';

    if (user) {
        // Se o utilizador estiver autenticado
        // 1. Verifica se é administrador para mostrar o link do painel
        const roleRef = doc(db, 'roles', user.uid);
        getDoc(roleRef).then(snap => {
            if (snap.exists() && snap.data().admin) {
                if (adminLinkContainer) adminLinkContainer.innerHTML = `<a href="admin.html" class="cart-link admin-link">Painel Admin</a>`;
            }
        });

        // 2. Mostra a navegação do cliente ("Minha Conta", "Sair")
        if (userNav) {
            userNav.innerHTML = `
                <a href="minha-conta.html" class="cart-link">Minha Conta</a>
                <button id="logout-cliente" class="logout-btn">Sair</button>
            `;
            const logoutButton = document.getElementById('logout-cliente');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    signOut(auth);
                });
            }
        }
    } else {
        // Se o utilizador não estiver autenticado
        // Mostra os links "Entrar" e "Registar"
        if (userNav) {
            userNav.innerHTML = `
                <a href="login-cliente.html" class="cart-link">Entrar</a>
                <a href="cadastro.html" class="cart-link">Registar</a>
            `;
        }
    }
}

// Configura o "ouvinte" de autenticação que atualiza o cabeçalho sempre que o estado de login muda
onAuthStateChanged(auth, (user) => {
    updateUserNav(user);
});


// --- LÓGICA PARA A PÁGINA DE LOGIN DO CLIENTE ---
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
