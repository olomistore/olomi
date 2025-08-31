import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const adminLinkContainer = document.getElementById('admin-link-container');
const userNav = document.getElementById('user-navigation');

// Este listener será acionado sempre que o status de login mudar (entrar, sair, ou ao carregar a página)
onAuthStateChanged(auth, async (user) => {
    // Limpa a navegação para evitar links duplicados
    if (adminLinkContainer) adminLinkContainer.innerHTML = '';
    if (userNav) userNav.innerHTML = '';

    if (user) {
        // --- UTILIZADOR AUTENTICADO ---
        
        // Tenta verificar se o utilizador é um administrador
        try {
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            if (snap.exists() && snap.data().admin) {
                if (adminLinkContainer) {
                    adminLinkContainer.innerHTML = `<a href="admin.html" class="cart-link admin-link">Painel Admin</a>`;
                }
            }
        } catch (error) {
            console.error("Erro ao verificar a função de administrador:", error);
        }

        // Mostra os links "Minha Conta" e "Sair"
        if (userNav) {
            userNav.innerHTML = `
                <a href="minha-conta.html" class="cart-link">Minha Conta</a>
                <button id="logout-cliente" class="logout-btn">Sair</button>
            `;
            // Adiciona o evento de clique ao botão de sair
            document.getElementById('logout-cliente')?.addEventListener('click', () => {
                signOut(auth).catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                });
            });
        }

    } else {
        // --- UTILIZADOR NÃO AUTENTICADO ---

        // Mostra os links "Entrar" e "Registar"
        if (userNav) {
            userNav.innerHTML = `
                <a href="login-cliente.html" class="cart-link">Entrar</a>
                <a href="cadastro.html" class="cart-link">Registar</a>
            `;
        }
    }
});

// Remove a lógica de login do formulário daqui, pois ela já está no seu ficheiro `login-cliente.js`
// Se não tiver um ficheiro `login-cliente.js`, mantenha a secção do formulário aqui.
const loginClienteForm = document.getElementById('login-cliente-form');
if (loginClienteForm) {
    loginClienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginClienteForm.email.value.trim();
        const password = loginClienteForm.password.value.trim();
        
        try {
            // A lógica de login permanece a mesma
            await signInWithEmailAndPassword(auth, email, password);
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect');
            window.location.href = redirectUrl || 'index.html';
        } catch (err) {
            console.error("Erro ao entrar:", err);
            alert('Erro ao entrar: Verifique o seu e-mail e senha.');
        }
    });
}