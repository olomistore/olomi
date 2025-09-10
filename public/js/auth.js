import { auth } from './firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';

const loginForm = document.getElementById('login-form');
const resetPasswordLink = document.getElementById('reset-password-link');

// Processo de Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value.trim();
        const submitButton = loginForm.querySelector('button');

        submitButton.disabled = true;
        submitButton.textContent = 'A entrar...';

        try {
            // Fazer login com o Firebase Auth
            await signInWithEmailAndPassword(auth, email, password);
            // O redirecionamento será tratado pelo 'main.js' que deteta a mudança de estado de autenticação.
            // Apenas redirecionamos para a página inicial como fallback.
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro no login:', error);
            alert(`Erro ao fazer login: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
}

// Processo de Reset de Senha
if (resetPasswordLink) {
    resetPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt('Por favor, insira o seu e-mail para receber o link de redefinição de senha:');

        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert('Link para redefinição de senha enviado para o seu e-mail!');
            } catch (error) {
                console.error('Erro ao enviar e-mail de redefinição:', error);
                alert(`Erro: ${error.message}`);
            }
        }
    });
}
