import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const form = document.getElementById('create-admin-form');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value.trim();

        if (password.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        try {
            // Passo 1: Criar o utilizador no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Passo 2: Dar a permissão de administrador no Firestore
            // Isto cria um documento na coleção 'roles' com o ID do utilizador
            const roleRef = doc(db, 'roles', user.uid);
            await setDoc(roleRef, {
                admin: true
            });

            alert(`Administrador criado com sucesso!\nE-mail: ${email}\n\nJá pode apagar o ficheiro criar-admin.html e entrar através da página de login.`);
            form.reset();

        } catch (err) {
            console.error("Erro ao criar administrador:", err);
            alert('Erro ao criar administrador: ' + err.message);
        }
    });
}
