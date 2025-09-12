import { auth } from './firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { showToast } from './utils.js';

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
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro no login:', error);
            showToast(`Erro ao fazer login: ${error.code}`, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
}

// ✅ CORREÇÃO: Processo de Reset de Senha com Modal Elegante
if (resetPasswordLink) {
    resetPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const { value: email } = await Swal.fire({
            title: 'Recuperar Senha',
            input: 'email',
            inputLabel: 'Insira o seu e-mail para receber o link de redefinição',
            inputPlaceholder: 'seu.email@exemplo.com',
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
            showCancelButton: true,
            customClass: {
                confirmButton: 'submit-btn',
                cancelButton: 'cancel-btn'
            },
            buttonsStyling: false
        });

        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                showToast('Link para redefinição de senha enviado para o seu e-mail!', 'success');
            } catch (error) {
                console.error('Erro ao enviar e-mail de redefinição:', error);
                showToast(`Erro: ${error.code}`, 'error');
            }
        }
    });
}
