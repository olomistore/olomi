import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/**
 * Ponto de entrada principal da aplicação.
 * Gere o estado de autenticação e delega para a lógica específica da página.
 */
function main() {
    onAuthStateChanged(auth, async (user) => {
        // O updateUserNav precisa de ser aguardado para garantir que a verificação de admin acontece
        // antes de qualquer outra lógica dependente de permissões.
        await updateUserNav(user);

        const path = window.location.pathname;
        const page = path.split("/").pop() || "index.html";

        switch (page) {
            case 'minha-conta.html':
                if (user) {
                    try {
                        // Importa o módulo da página da conta DINAMICAMENTE
                        const module = await import('./minha-conta.js');
                        module.initMinhaContaPage(user);
                    } catch (err) {
                        console.error('Falha ao carregar o módulo da página da conta:', err);
                        alert('Ocorreu um erro ao carregar os dados da sua conta.');
                    }
                } else {
                    alert('Você precisa de estar autenticado para aceder a esta página.');
                    window.location.href = 'login-cliente.html';
                }
                break;

            case 'admin.html':
                // A verificação de admin já acontece no updateUserNav. Se o utilizador não for admin,
                // o link nem aparece. Apenas como uma segunda camada de segurança, verificamos se há um utilizador.
                if (!user) {
                    alert('Acesso restrito.');
                    window.location.href = 'index.html';
                }
                break;

            // Nota: Outras páginas como 'index.html' ou 'carrinho.html' não precisam de lógica
            // específica aqui, pois os seus scripts ('catalogo.js', 'carrinho.js') são carregados
            // diretamente no HTML e funcionam de forma independente.
        }
    });
}

/**
 * Atualiza a barra de navegação (cabeçalho) com base no estado de login.
 */
async function updateUserNav(user) {
    const userNav = document.getElementById('user-navigation');
    const adminLinkContainer = document.getElementById('admin-link-container');

    if (!userNav || !adminLinkContainer) return;

    adminLinkContainer.innerHTML = '';

    if (user) {
        userNav.innerHTML = `
            <a href="minha-conta.html" class="cart-link">Minha Conta</a>
            <button id="global-logout-btn" class="logout-btn">Sair</button>
        `;
        document.getElementById('global-logout-btn')?.addEventListener('click', handleLogout);

        try {
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            if (snap.exists() && snap.data().admin) {
                adminLinkContainer.innerHTML = `<a href="admin.html" class="cart-link admin-link">Painel Admin</a>`;
            }
        } catch (error) {
            console.error("Erro ao verificar a função de admin:", error);
        }

    } else {
        userNav.innerHTML = `
            <a href="login-cliente.html" class="cart-link">Entrar</a>
            <a href="cadastro.html" class="cart-link">Registar</a>
        `;
    }
}

/**
 * Gere o processo de logout.
 */
function handleLogout() {
    signOut(auth).then(() => {
        // Redireciona para a página inicial após o logout para garantir um estado limpo
        window.location.href = '/index.html'; 
    }).catch(err => {
        console.error("Erro ao fazer logout:", err);
        alert("Ocorreu um erro ao tentar sair.");
    });
}

// Inicializa o script quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', main);
