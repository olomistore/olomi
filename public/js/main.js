import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { cartStore } from './utils.js';

// Como este script é carregado com `defer` (padrão para módulos),
// o DOM já estará pronto quando ele for executado. O listener DOMContentLoaded é desnecessário.

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
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            const isAdmin = docSnap.exists() && docSnap.data().isAdmin;

            // Mostra o link do painel de admin se o utilizador for admin
            adminLinkContainer.innerHTML = isAdmin
                ? '<a href="admin.html" class="nav-link">Painel Admin</a>'
                : '';

            // Mostra os links da conta do utilizador
            userNavContainer.innerHTML = '<a href="minha-conta.html" class="nav-link">Minha Conta</a>';

        } else {
            // O utilizador não está autenticado
            adminLinkContainer.innerHTML = ''; // Garante que o link de admin está escondido

            userNavContainer.innerHTML = `
                <a href="login-cliente.html" class="nav-link">Entrar</a>
                <a href="registro-cliente.html" class="nav-link">Registar</a>
            `;
        }
    });
} else {
    console.error('Elementos de navegação do cabeçalho não encontrados. O HTML está correto?');
}
