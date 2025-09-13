import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { cartStore } from './utils.js';

const userNavContainer = document.getElementById('user-navigation');
const adminLinkContainer = document.getElementById('admin-link-container');

// Garante que os elementos existem antes de tentar usá-los
if (userNavContainer && adminLinkContainer) {
    // Atualiza a contagem do carrinho na inicialização
    cartStore.updateCountUI();

    // Regista um listener para quando o carrinho mudar, para manter a contagem atualizada
    cartStore.onChange(cartStore.updateCountUI);

    // Observa as mudanças no estado de autenticação do utilizador
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // O utilizador está autenticado

            // Verifica o status de administrador na coleção 'roles', que é o local correto.
            const roleRef = doc(db, 'roles', user.uid);
            const roleSnap = await getDoc(roleRef);
            const isAdmin = roleSnap.exists() && roleSnap.data().admin;

            // Mostra o link do painel de admin se o utilizador for admin
            adminLinkContainer.innerHTML = isAdmin
                ? '<a href="admin.html" class="nav-button nav-button-admin">Painel Admin</a>'
                : '';

            // Mostra os links da conta do utilizador e o botão de sair
            userNavContainer.innerHTML = `
                <a href="minha-conta.html" class="nav-button">Minha Conta</a>
                <a href="#" id="logout-btn" class="nav-button">Sair</a>
            `;

            // Adiciona o evento de clique ao botão de logout
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    signOut(auth).then(() => {
                        // Redireciona para a página inicial para uma melhor experiência.
                        window.location.href = '/index.html';
                    }).catch((error) => {
                        console.error("Erro ao fazer logout:", error);
                    });
                });
            }

        } else {
            // O utilizador não está autenticado
            adminLinkContainer.innerHTML = ''; // Garante que o link de admin está escondido

            userNavContainer.innerHTML = `
                <a href="login-cliente.html" class="nav-button">Entrar</a>
                <a href="registro-cliente.html" class="nav-button">Registar</a>
            `;
        }
    });
} else {
    console.error('Elementos de navegação do cabeçalho não encontrados. O HTML está correto?');
}
