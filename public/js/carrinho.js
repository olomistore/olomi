import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch, increment } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { BRL, cartStore } from './utils.js';

const itemsListEl = document.getElementById('cart-items-list');
const totalsEl = document.getElementById('totals-summary');
const form = document.getElementById('checkout-form');
const cartContainer = document.getElementById('cart-container');

let shippingCost = 0;

async function populateFormWithUserData(user) {
    if (!user || !form) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const userData = docSnap.data();
        form.name.value = userData.name || '';
        form.phone.value = userData.phone || '';
        form.email.value = userData.email || '';
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
            cartContainer.innerHTML = `<div class="cart-empty"><h2>O seu carrinho está vazio.</h2><p>Adicione produtos do nosso catálogo para os ver aqui.</p><a href="/" class="back-to-store-btn">Voltar ao Catálogo</a></div>`;
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

    const total = subtotal; // O total agora é apenas o subtotal
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
        alert('Você precisa de estar autenticado para finalizar a compra.');
        window.location.href = `login-cliente.html?redirect=carrinho.html`;
        return;
    }
    const cart = cartStore.get();
    if (cart.length === 0) {
        alert('O seu carrinho está vazio.');
        return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A finalizar...';
    const data = Object.fromEntries(new FormData(form).entries());
    const fullAddress = `${data.street}, ${data.number}${data.complement ? ' - ' + data.complement : ''} - ${data.neighborhood}, ${data.city} - ${data.state}, CEP: ${data.cep}`;
    
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal; // Garante que o total não inclua frete
    
    const order = {
        userId: user.uid, items: cart, subtotal, shipping: shippingCost, total,
        customer: {
            name: data.name, phone: data.phone, email: data.email, fullAddress: fullAddress,
            address: { cep: data.cep, street: data.street, number: data.number, complement: data.complement, neighborhood: data.neighborhood, city: data.city, state: data.state }
        },
        status: 'pending', createdAt: serverTimestamp(),
    };
    try {
        const ref = await addDoc(collection(db, 'orders'), order);
        const batch = writeBatch(db);
        order.items.forEach(item => {
            const productRef = doc(db, "products", item.id);
            batch.update(productRef, { stock: increment(-item.qty) });
        });
        await batch.commit();

        const lojaNumero = '5519987346984';
        const msg = buildWhatsappMessage(ref.id, order);
        const whatsappUrl = `https://wa.me/${lojaNumero}?text=${encodeURIComponent(msg)}`;

        cartStore.clear();

        const formContainer = document.querySelector('.checkout-form-container');
        if (formContainer) {
            formContainer.innerHTML = `
                <h3 class="section-title">Pedido Recebido!</h3>
                <p>Seu pedido foi criado com sucesso. Para finalizar, por favor, envie os detalhes para nós no WhatsApp.</p>
                <a href="${whatsappUrl}" target="_blank" class="submit-btn" id="whatsapp-redirect-btn" style="text-align: center; text-decoration: none; display: block;">Finalizar via WhatsApp</a>
            `;
            
            document.getElementById('whatsapp-redirect-btn').addEventListener('click', () => {
                 setTimeout(() => {
                    window.location.href = 'index.html';
                 }, 1500);
            });
        } else {
             alert('Pedido criado! Estamos a redirecioná-lo para o WhatsApp para finalizar.');
             window.open(whatsappUrl, '_blank');
             window.location.href = 'index.html';
        }

    } catch (err) {
        console.error("Erro ao finalizar o pedido:", err);
        alert('Erro ao finalizar o pedido: ' + err.message);
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