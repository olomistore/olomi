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
            // ETAPA 1: Criar utilizador no Authentication
            console.log("ETAPA 1: A tentar criar o utilizador no Authentication...");
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;
            console.log("SUCESSO na ETAPA 1: Utilizador criado no Authentication. UID:", user.uid);

            // ETAPA 2: Guardar os dados do utilizador na coleção 'users'
            console.log("ETAPA 2: A tentar guardar os dados na coleção 'users'...");
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
            console.log("SUCESSO na ETAPA 2: Dados guardados na coleção 'users'.");

            // ETAPA 3: Guardar a função do utilizador na coleção 'roles'
            console.log("ETAPA 3: A tentar guardar a função na coleção 'roles'...");
            await setDoc(doc(db, 'roles', user.uid), {
                admin: false 
            });
            console.log("SUCESSO na ETAPA 3: Função guardada na coleção 'roles'.");
            
            // ETAPA FINAL: Se tudo correu bem, mostrar notificação e redirecionar
            console.log("ETAPA FINAL: Todas as operações na base de dados foram bem-sucedidas. A mostrar notificação e a redirecionar.");
            showNotification(`Bem-vindo(a), ${data.name}! A aceder à sua conta...`, 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (err) {
            // Se qualquer uma das etapas acima falhar, o código virá para aqui.
            console.error("ERRO CRÍTICO DURANTE O REGISTO:", err);
            alert(`Ocorreu um erro crítico. Por favor, verifique a consola para mais detalhes. Mensagem: ${err.message}`);
            
            let errorMessage = 'Ocorreu um erro ao guardar os seus dados.';
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Este e-mail já está a ser utilizado por outra conta.';
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