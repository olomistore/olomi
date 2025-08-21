import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail // Módulo importado para redefinição de senha
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/**
 * Protege uma página, exigindo que o utilizador seja um administrador.
 * Redireciona caso não esteja autenticado ou não seja administrador.
 */
export async function requireAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Executa a verificação apenas uma vez para evitar memory leaks
            if (!user) {
                // Se não houver utilizador, redireciona para o login
                window.location.href = 'login.html';
                return;
            }
            
            // Se houver utilizador, verifica se ele tem a permissão de admin
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            
            if (!snap.exists() || !snap.data().admin) {
                // Se não for admin, exibe um alerta e redireciona para a loja
                alert('Você não tem acesso de administrador.');
                window.location.href = 'index.html';
                return;
            }
            
            // Se for admin, a promessa é resolvida e a página pode continuar a carregar
            resolve(user);
        });
    });
}

// Lógica da página de login do administrador
const form = document.getElementById('login-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value.trim();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'admin.html';
        } catch (err) {
            alert('Erro ao entrar: ' + err.message);
        }
    });
}

// Botão de Logout no painel de administração
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });
}

// --- NOVO: Lógica de Redefinição de Senha ---
const resetLink = document.getElementById('reset-password-link');
if (resetLink) {
    resetLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt("Por favor, insira o seu e-mail para redefinir a senha:");
        
        if (email) {
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    alert("E-mail de redefinição de senha enviado! Verifique a sua caixa de entrada.");
                })
                .catch((error) => {
                    console.error("Erro ao enviar e-mail de redefinição:", error);
                    alert("Erro ao enviar e-mail: " + error.message);
                });
        }
    });
}
