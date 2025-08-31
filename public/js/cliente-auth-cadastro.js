import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { showNotification, setupCepLookup } from './utils.js';

const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = registerForm.querySelector('button');
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        if (data.password !== data.confirmPassword) {
            showNotification('As senhas não coincidem.', 'error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'A registar...';

        try {
            // 1. Cria o utilizador no Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // 2. Guarda os dados do utilizador no Firestore
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

            // 3. Guarda a função do utilizador (cliente)
            await setDoc(doc(db, 'roles', user.uid), {
                admin: false 
            });
            
            // TUDO CORREU BEM! AGORA VAMOS MOSTRAR A MENSAGEM E REDIRECIONAR
            
            showNotification(`Bem-vindo(a), ${data.name}! A aceder à sua conta...`, 'success');
            
            // Redireciona o utilizador já logado para a página principal
            setTimeout(() => {
                window.location.href = 'index.html'; // Ou 'minha-conta.html' se preferir
            }, 1500);

        } catch (err) {
            console.error("Erro ao criar conta:", err);
            let errorMessage = 'Ocorreu um erro ao criar a sua conta.';
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Este e-mail já está a ser utilizado por outra conta.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'A sua senha é muito fraca. Tente uma com pelo menos 6 caracteres.';
            }
            showNotification(errorMessage, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Registar';
        }
    });
}

// Ativa a funcionalidade de busca de CEP
if (registerForm) {
    setupCepLookup(registerForm);
}