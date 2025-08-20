import { auth } from './firebase.js';
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// --- FORMULÁRIO DE LOGIN DO CLIENTE ---
const loginClienteForm = document.getElementById('login-cliente-form');
if (loginClienteForm) {
    loginClienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginClienteForm.email.value.trim();
        const password = loginClienteForm.password.value.trim();
        
        if (!email || !password) {
            alert('Por favor, preencha o e-mail e a senha.');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'index.html'; // Redireciona para a página principal após o login
        } catch (err) {
            console.error("Erro ao entrar:", err);
            alert('Erro ao entrar: Verifique o seu e-mail e senha.');
        }
    });
}

// --- LÓGICA PARA ATUALIZAR A NAVEGAÇÃO DO UTILIZADOR (CABEÇALHO) ---
// Esta função pode ser chamada em todas as páginas para mostrar o estado de login correto
function updateUserNav() {
    onAuthStateChanged(auth, (user) => {
        const userNav = document.getElementById('user-navigation');
        if (!userNav) return;

        if (user) {
            // Utilizador está autenticado
            userNav.innerHTML = `
                <a href="#" class="cart-link">Minha Conta</a>
                <button id="logout-cliente" class="logout-btn">Sair</button>
            `;
            const logoutBtn = document.getElementById('logout-cliente');
            if(logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = 'index.html';
                    });
                });
            }
        } else {
            // Utilizador não está autenticado
            userNav.innerHTML = `
                <a href="login-cliente.html" class="cart-link">Entrar</a>
                <a href="cadastro.html" class="cart-link">Registar</a>
            `;
        }
    });
}

// Chama a função para garantir que a navegação seja atualizada ao carregar a página
updateUserNav();
