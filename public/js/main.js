import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/**
 * Atualiza a barra de navegação superior com base no estado de autenticação do utilizador.
 * Mostra/oculta links de login, registo, minha conta, painel de admin e o botão de sair.
 */
async function updateUserNav() {
    onAuthStateChanged(auth, async (user) => {
        const userNav = document.getElementById('user-navigation');
        const adminLinkContainer = document.getElementById('admin-link-container');

        if (!userNav || !adminLinkContainer) {
            // Não exibe erro se os elementos não existirem, pois algumas páginas podem não tê-los.
            return;
        }

        adminLinkContainer.innerHTML = '';
        userNav.innerHTML = '';

        if (user) {
            // UTILIZADOR AUTENTICADO
            try {
                const roleRef = doc(db, 'roles', user.uid);
                const snap = await getDoc(roleRef);
                if (snap.exists() && snap.data().admin) {
                    adminLinkContainer.innerHTML = `<a href="admin.html" class="cart-link admin-link">Painel Admin</a>`;
                }
            } catch (error) {
                console.error("Erro ao verificar a função de administrador:", error);
            }

            userNav.innerHTML = `
                <a href="minha-conta.html" class="cart-link">Minha Conta</a>
                <button id="global-logout-btn" class="logout-btn">Sair</button>
            `;

            document.getElementById('global-logout-btn')?.addEventListener('click', () => {
                signOut(auth).then(() => {
                    if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('minha-conta.html')) {
                        window.location.href = 'index.html';
                    }
                }).catch(err => {
                    console.error("Erro ao fazer logout:", err);
                    alert("Ocorreu um erro ao tentar sair.");
                });
            });

        } else {
            // UTILIZADOR NÃO AUTENTICADO
            userNav.innerHTML = `
                <a href="login-cliente.html" class="cart-link">Entrar</a>
                <a href="cadastro.html" class="cart-link">Registar</a>
            `;
        }
    });
}

document.addEventListener('DOMContentLoaded', updateUserNav);
