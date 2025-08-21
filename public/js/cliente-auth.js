import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// O seu código de login e registo de cliente permanece aqui...

async function updateUserNav() {
    onAuthStateChanged(auth, async (user) => {
        const userNav = document.getElementById('user-navigation');
        const adminLinkContainer = document.getElementById('admin-link-container');

        // Limpa os links antes de os recriar
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
                document.getElementById('logout-cliente')?.addEventListener('click', () => signOut(auth));
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

// Chame a função em todas as páginas que usam este script
updateUserNav();
