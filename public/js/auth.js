import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail // Módulo importado
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Protege páginas de administração
export async function requireAdmin() {
    // ... (código existente)
}

// Página de Login
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

// Botão de Logout
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });
}

// --- LÓGICA DE REDEFINIÇÃO DE SENHA ADICIONADA ---
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
