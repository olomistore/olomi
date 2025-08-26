import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL } from './utils.js';

// --- ELEMENTOS ---
const userDetailsContent = document.getElementById('user-details-content');
const orderHistoryList = document.getElementById('order-history-list');

const loadingSpinner = '<div class="spinner"></div>';

// --- FUNÇÕES ---

async function loadUserData(user) {
    if (!userDetailsContent) return;
    userDetailsContent.innerHTML = loadingSpinner;

    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // O resto da sua função para renderizar os dados do usuário permanece o mesmo...
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
                <button type="submit">Guardar Alterações</button>
            </form>
        `;

        // Lógica para guardar as alterações do formulário
        const form = document.getElementById('user-details-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const updatedData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                address: {
                    cep: formData.get('cep'),
                    street: formData.get('street'),
                    number: formData.get('number'),
                    complement: formData.get('complement'),
                    neighborhood: formData.get('neighborhood'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                }
            };
            try {
                await updateDoc(userRef, updatedData);
                alert('Dados atualizados com sucesso!');
            } catch (error) {
                console.error("Erro ao atualizar os dados:", error);
                alert('Ocorreu um erro ao atualizar os seus dados.');
            }
        });
    } else {
        userDetailsContent.innerHTML = '<p>Não foi possível carregar os seus dados.</p>';
    }
}

async function loadOrderHistory(user) {
    if (!orderHistoryList) return;
    orderHistoryList.innerHTML = loadingSpinner;

    try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where("userId", "==", user.uid));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            orderHistoryList.innerHTML = '<p>Você ainda não fez nenhuma encomenda.</p>';
            return;
        }

        orderHistoryList.innerHTML = '';
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        orders.forEach(order => {
            const orderDate = order.createdAt.toDate().toLocaleDateString('pt-BR');
            const itemsHtml = order.items.map(item => `<li>${item.qty}x ${item.name}</li>`).join('');
            
            // ✅ CORREÇÃO: Este objeto mapeia TODOS os status para o texto correto.
            const statusText = { 
                pending: 'Pendente', 
                sent: 'Enviado', 
                canceled: 'Cancelado' 
            };

            const orderEl = document.createElement('div');
            orderEl.className = 'order-item';
            orderEl.innerHTML = `
                <div class="order-item-header">
                    <span class="order-id">Pedido #${order.id.substring(0, 6)}</span>
                    <span class="order-status ${order.status}">${statusText[order.status] || 'Pendente'}</span>
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
    } catch (error) {
        console.error("Erro ao carregar o histórico de encomendas:", error);
        orderHistoryList.innerHTML = '<p style="color: red;">Ocorreu um erro ao carregar as suas encomendas. Tente novamente mais tarde.</p>';
    }
}

// --- INICIALIZAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user);
        loadOrderHistory(user);
    } else {
        alert('Você precisa de estar autenticado para aceder a esta página.');
        window.location.href = 'login-cliente.html';
    }
});
