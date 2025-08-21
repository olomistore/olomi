import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL } from './utils.js';

// --- ELEMENTOS ---
const userDetailsContent = document.getElementById('user-details-content');
const orderHistoryList = document.getElementById('order-history-list');

const loadingSpinner = '<div class="spinner"></div>'; // Requer CSS para .spinner

// --- FUNÇÕES ---

async function loadUserData(user) {
    if (!userDetailsContent) return;
    userDetailsContent.innerHTML = loadingSpinner;

    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        userDetailsContent.innerHTML = `
            <form id="user-details-form" class="login-form">
                <fieldset>
                    <legend>Dados Pessoais</legend>
                    <input name="name" type="text" value="${data.name || ''}" required />
                    <input name="phone" type="tel" value="${data.phone || ''}" required />
                </fieldset>
                <fieldset>
                    <legend>Endereço de Entrega</legend>
                    <input name="cep" type="text" value="${data.address?.cep || ''}" required />
                    <input name="street" type="text" value="${data.address?.street || ''}" required />
                    <div class="form-grid">
                        <input name="number" type="text" value="${data.address?.number || ''}" required />
                        <input name="complement" type="text" value="${data.address?.complement || ''}" />
                    </div>
                    <input name="neighborhood" type="text" value="${data.address?.neighborhood || ''}" required />
                    <input name="city" type="text" value="${data.address?.city || ''}" required />
                    <input name="state" type="text" value="${data.address?.state || ''}" required />
                </fieldset>
                <button type="submit" class="submit-btn">Guardar Alterações</button>
            </form>
        `;
        
        const form = document.getElementById('user-details-form');
        form.addEventListener('submit', handleUpdateUserData);
    }
}

async function handleUpdateUserData(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'A guardar...';

    const user = auth.currentUser;
    if (!user) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const userRef = doc(db, 'users', user.uid);

    try {
        await updateDoc(userRef, {
            name: data.name,
            phone: data.phone,
            address: {
                cep: data.cep, street: data.street, number: data.number,
                complement: data.complement, neighborhood: data.neighborhood,
                city: data.city, state: data.state
            }
        });
        alert('Dados atualizados com sucesso!');
    } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        alert('Ocorreu um erro ao atualizar os seus dados.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Alterações';
    }
}

async function loadOrderHistory(user) {
    if (!orderHistoryList) return;
    orderHistoryList.innerHTML = loadingSpinner;

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        orderHistoryList.innerHTML = '<p>Você ainda não fez nenhuma encomenda.</p>';
        return;
    }

    orderHistoryList.innerHTML = '';
    querySnapshot.forEach(doc => {
        const order = doc.data();
        const orderDate = order.createdAt.toDate().toLocaleDateString('pt-BR');
        const itemsHtml = order.items.map(item => `<li>${item.qty}x ${item.name}</li>`).join('');

        const orderEl = document.createElement('div');
        orderEl.className = 'order-item';
        orderEl.innerHTML = `
            <div class="order-item-header">
                <span class="order-id">Pedido #${doc.id.substring(0, 6)}</span>
                <span class="order-status ${order.status}">${order.status === 'pending' ? 'Pendente' : 'Enviado'}</span>
            </div>
            <div class="order-details">
                <p><strong>Data:</strong> ${orderDate}</p>
                <p><strong>Total:</strong> ${BRL(order.total)}</p>
            </div>
            <div class="order-items-list">
                <strong>Itens:</strong>
                <ul>${itemsHtml}</ul>
            </div>
        `;
        orderHistoryList.appendChild(orderEl);
    });
}

// --- INICIALIZAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Utilizador está autenticado, carrega os dados
        loadUserData(user);
        loadOrderHistory(user);
    } else {
        // Utilizador não está autenticado, redireciona para o login
        alert('Você precisa de estar autenticado para aceder a esta página.');
        window.location.href = 'login-cliente.html';
    }
});
