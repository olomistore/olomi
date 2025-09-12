import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { BRL, cartStore, showToast } from './utils.js';

const itemsListEl = document.getElementById('cart-items-list');
const totalsEl = document.getElementById('totals-summary');
const form = document.getElementById('checkout-form');
const cartContainer = document.getElementById('cart-container');

async function populateFormWithUserData(user) {
    if (!user || !form) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const userData = docSnap.data();
        form.name.value = userData.name || '';
        form.phone.value = userData.phone || '';
        form.email.value = user.email || '';
        if (userData.address) {
            form.cep.value = userData.address.cep || '';
            form.street.value = userData.address.street || '';
            form.number.value = userData.address.number || '';
            form.complement.value = userData.address.complement || '';
            form.neighborhood.value = userData.address.neighborhood || '';
            form.city.value = userData.address.city || '';
            form.state.value = userData.address.state || '';
        }
    }
}

function renderCart() {
    const cart = cartStore.get();
    if (!itemsListEl || !totalsEl) return;
    if (cart.length === 0) {
        if (cartContainer) {
            cartContainer.innerHTML = `<div class="cart-empty"><h2>O seu carrinho está vazio.</h2><p>Adicione produtos do nosso catálogo para os ver aqui.</p><a href="index.html" class="back-to-store-btn">Voltar ao Catálogo</a></div>`;
        }
        return;
    }
    itemsListEl.innerHTML = '';
    totalsEl.innerHTML = '';
    let subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="item-image"><img src="${item.imageUrl || 'https://placehold.co/80x80/f39c12/fff?text=Olomi'}" alt="${item.name}"></div>
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <div class="item-quantity">
                    <button data-id="${item.id}" data-action="decrease">-</button>
                    <span>${item.qty}</span>
                    <button data-id="${item.id}" data-action="increase">+</button>
                </div>
            </div>
            <div class="item-price">
                <p>${BRL(item.price * item.qty)}</p>
                <div class="item-actions"><button class="remove-btn" data-id="${item.id}" data-action="remove">Remover</button></div>
            </div>
        `;
        itemsListEl.appendChild(itemEl);
    });

    const total = subtotal;
    totalsEl.innerHTML = `
        <div class="summary-row"><span>Subtotal</span><span>${BRL(subtotal)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${BRL(total)}</span></div>
    `;
}

function updateCart(productId, action) {
    const cart = cartStore.get();
    const itemIndex = cart.findIndex(i => i.id === productId);
    if (itemIndex === -1) return;
    if (action === 'increase') cart[itemIndex].qty++;
    else if (action === 'decrease') {
        cart[itemIndex].qty--;
        if (cart[itemIndex].qty <= 0) cart.splice(itemIndex, 1);
    } else if (action === 'remove') cart.splice(itemIndex, 1);
    cartStore.set(cart);
    renderCart();
}

function buildWhatsappMessage(orderId, order) {
    const lines = [];
    lines.push('🛍️ *Novo Pedido Olomi* 🛍️');
    lines.push(`*Pedido:* ${orderId}`);
    lines.push('--------------------------');
    order.items.forEach(it => lines.push(`${it.qty}x ${it.name} – ${BRL(it.price * it.qty)}`));
    lines.push('--------------------------');
    lines.push(`*Subtotal:* ${BRL(order.subtotal)}`);
    lines.push(`*Total:* *${BRL(order.total)}*`);
    lines.push('--------------------------');
    const c = order.customer;
    lines.push('*Dados do Cliente:*');
    lines.push(`*Nome:* ${c.name}`);
    if (c.phone) lines.push(`*WhatsApp:* ${c.phone}`);
    lines.push(`*Endereço:* ${c.fullAddress}`);
    lines.push('\nObrigado pela preferência! ✨');
    return lines.join('\n');
}

if (itemsListEl) {
    itemsListEl.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const { id, action } = button.dataset;
        if (id && action) updateCart(id, action);
    });
}

form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        showToast('Você precisa de estar autenticado para finalizar a compra.', 'warning');
        window.location.href = `login-cliente.html?redirect=carrinho.html`;
        return;
    }
    const cart = cartStore.get();
    if (cart.length === 0) {
        showToast('O seu carrinho está vazio.', 'info');
        return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A finalizar...';
    const data = Object.fromEntries(new FormData(form).entries());
    const fullAddress = `${data.street}, ${data.number}${data.complement ? ' - ' + data.complement : ''} - ${data.neighborhood}, ${data.city} - ${data.state}, CEP: ${data.cep}`;
    
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal;
    
    const order = {
        userId: user.uid, 
        items: cart, 
        subtotal, 
        total,
        customer: {
            uid: user.uid, 
            name: data.name,
            phone: data.phone,
            email: user.email, 
            fullAddress: fullAddress,
            address: { cep: data.cep, street: data.street, number: data.number, complement: data.complement, neighborhood: data.neighborhood, city: data.city, state: data.state }
        },
        status: 'pending', 
        createdAt: serverTimestamp(),
    };

    try {
        const ref = await addDoc(collection(db, 'orders'), order);

        const lojaNumero = '5519987346984';
        const msg = buildWhatsappMessage(ref.id, order);
        const whatsappUrl = `https://wa.me/${lojaNumero}?text=${encodeURIComponent(msg)}`;

        // ✅ CORREÇÃO: Lógica simplificada para garantir clique único.
        
        // 1. Limpa o carrinho.
        cartStore.clear();

        // 2. Mostra mensagem de sucesso.
        showToast('Pedido recebido! A redirecionar para o WhatsApp...', 'success');

        // 3. Abre o WhatsApp num novo separador.
        window.open(whatsappUrl, '_blank');

        // 4. Redireciona a página principal para o início após um intervalo.
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (err) {
        console.error("Erro ao finalizar o pedido:", err);
        showToast('Erro ao finalizar o pedido: ' + err.message, 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Finalizar via WhatsApp';
    }
});

function init() {
    renderCart();
    onAuthStateChanged(auth, (user) => {
        if (user) populateFormWithUserData(user);
    });
}

init();