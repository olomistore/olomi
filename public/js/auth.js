import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from
    "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase - firestore.js";

// Protege páginas admin
export async function requireAdmin() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) { return window.location.href = 'login.html'; }
            const roleRef = doc(db, 'roles', user.uid);
            const snap = await getDoc(roleRef);
            if (!snap.exists() || !snap.data().admin) {
                alert('Você não tem acesso de administrador.');
                return window.location.href = 'index.html';
            }
            resolve(user);
        });
    });
}

// Login page
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

// Logout button
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}
