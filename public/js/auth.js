import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/**
 * Protege uma página, exigindo que o utilizador seja um administrador.
 * Redireciona caso não esteja autenticado ou não seja administrador.
 */
export async function requireAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Executa apenas uma vez
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            
            if (!snap.exists() || !snap.data().admin) {
                alert('Você não tem acesso de administrador.');
                window.location.href = 'index.html';
                return;
            }
            resolve(user); // Prossegue se for administrador
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

// Lógica de redefinição de senha
const resetLink = document.getElementById('reset-password-link');
if (resetLink) {
    resetLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt("Por favor, insira o seu e-mail para redefinir a senha:");
        if (email) {
            sendPasswordResetEmail(auth, email)
                .then(() => alert("E-mail de redefinição de senha enviado!"))
                .catch((error) => alert("Erro ao enviar e-mail: " + error.message));
        }
    });
}
