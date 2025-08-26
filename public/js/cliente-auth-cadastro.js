import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { setupCepLookup } from './utils.js'; // ✅ NOVO: Importa a função

// --- ELEMENTOS DO FORMULÁRIO ---
const registerForm = document.getElementById('register-form');

// --- INICIALIZAÇÃO ---

if (registerForm) {
    // ✅ NOVO: Ativa a procura de CEP para o formulário de registo
    setupCepLookup(registerForm);

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(registerForm).entries());

        if (data.password !== data.confirmPassword) {
            alert('As senhas não coincidem. Por favor, tente novamente.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: {
                    cep: data.cep,
                    street: data.street,
                    number: data.number,
                    complement: data.complement || '',
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state
                },
                createdAt: new Date()
            });

            alert('Conta criada com sucesso!');
            window.location.href = 'index.html';

        } catch (err) {
            console.error("Erro ao criar conta:", err);
            alert('Erro ao criar conta: ' + err.message);
        }
    });
}
