import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { showNotification, setupCepLookup } from './utils.js';

const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const submitButton = registerForm.querySelector('button');
        
        submitButton.disabled = true;
        submitButton.textContent = 'A processar...';

        try {
            // ETAPA 1: Criar o utilizador no Authentication
            alert("Etapa 1: A tentar criar o utilizador...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            alert(`Etapa 1 SUCESSO: Utilizador criado com UID: ${user.uid}`);

            // ETAPA 2: Teste de escrita simples no Firestore
            alert("Etapa 2: A tentar escrever um log de teste no Firestore...");
            
            // Vamos tentar escrever um documento estático numa nova coleção
            const testDocRef = doc(db, "test_logs", user.uid);
            await setDoc(testDocRef, {
                message: "Registo de teste bem-sucedido!",
                timestamp: serverTimestamp()
            });

            alert("Etapa 2 SUCESSO: Log de teste escrito no Firestore!");

            // Se chegámos aqui, a escrita funcionou! Agora tentamos com os dados do utilizador.
            alert("Etapa 3: A tentar escrever os dados do utilizador...");
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());
            await setDoc(doc(db, 'users', user.uid), {
                name: data.name,
                phone: data.phone,
                email: data.email,
                createdAt: serverTimestamp()
            });
            alert("Etapa 3 SUCESSO: Dados do utilizador escritos!");

            showNotification('Conta criada com sucesso! A redirecionar...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (err) {
            // Se qualquer uma das etapas acima falhar, o código virá para aqui.
            console.error("ERRO CRÍTICO NO PROCESSO DE REGISTO:", err);
            alert(`ERRO CRÍTICO: ${err.message}\n\nPor favor, abra a consola (F12) para ver mais detalhes.`);
            
            submitButton.disabled = false;
            submitButton.textContent = 'Registar';
        }
    });
}

// Ativa a funcionalidade de busca de CEP
if (registerForm) {
    setupCepLookup(registerForm);
}