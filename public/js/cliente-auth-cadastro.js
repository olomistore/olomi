import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { showNotification, setupCepLookup } from './utils.js';

// --- FORMULÁRIO DE REGISTO DO CLIENTE ---
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = registerForm.querySelector('button');
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        if (data.password !== data.confirmPassword) {
            showNotification('As senhas não coincidem. Por favor, tente novamente.', 'error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'A registar...';

        try {
            // 1. Criar o utilizador no Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // 2. Guardar os dados do utilizador no Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: {
                    cep: data.cep,
                    street: data.street,
                    number: data.number,
                    complement: data.complement,
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state
                },
                createdAt: serverTimestamp()
            });

            // 3. (Opcional) Guardar a função do utilizador (cliente)
            await setDoc(doc(db, 'roles', user.uid), {
                admin: false // Garante que o utilizador registado não é admin
            });
            
            showNotification('Conta criada com sucesso! A redirecionar para o login...', 'success');
            
            // Redireciona para a página de login após um curto delay
            setTimeout(() => {
                window.location.href = 'login-cliente.html';
            }, 1500);

        } catch (err) {
            console.error("Erro ao criar conta:", err);
            let errorMessage = 'Ocorreu um erro ao criar a sua conta.';
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Este e-mail já está a ser utilizado por outra conta.';
            }
            showNotification(errorMessage, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Registar';
        }
    });
}


// --- ATIVA A FUNCIONALIDADE DE BUSCA DE ENDEREÇO PELO CEP ---
// Se o formulário de registo existir na página, ativa a função de busca de CEP para ele
if (registerForm) {
    setupCepLookup(registerForm);
}