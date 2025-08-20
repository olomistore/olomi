import { db, auth } from './firebase.js'; // Importa o 'auth'
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const itemsListEl = document.getElementById('cart-items-list');
const totalsEl = document.getElementById('totals-summary');
const form = document.getElementById('checkout-form');
const cartContainer = document.getElementById('cart-container');

// --- FUNÇÕES DO CARRINHO ---

function renderCart() {
    const cart = cartStore.get();

    if (!itemsListEl || !totalsEl) return;

    if (cart.length === 0) {
        if (cartContainer) {
            cartContainer.innerHTML = `
                <div class="cart-empty" style="text-align: center; padding: 2rem;">
                    <h2>O seu carrinho está vazio.</h2>
                    <p style="margin: 1rem 0;">Adicione produtos do nosso catálogo para os ver aqui.</p>
                    <a href="/" style="display: inline-block; padding: 0.8rem 1.5rem; background-color: var(--cor-laranja); color: white; text-decoration: none; border-radius: 8px;">Voltar ao Catálogo</a>
                </div>
            `;
        }
        return;
    }

    itemsListEl.innerHTML = '';
    totalsEl.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.qty;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="item-image">
                <img src="${item.imageUrl || 'https://placehold.co/80x80/f39c12/fff?text=Olomi'}" alt="${item.name}">
            </div>
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
                <div class="item-actions">
                    <button class="remove-btn" data-id="${item.id}" data-action="remove">Remover</button>
                </div>
            </div>
        `;
        itemsListEl.appendChild(itemEl);
    });

    const shipping = 0;
    const total = subtotal + shipping;
    totalsEl.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span>${BRL(subtotal)}</span>
        </div>
        <div class="summary-row">
            <span>Frete</span>
            <span>${BRL(shipping)}</span>
        </div>
        <div class="summary-row total">
            <span>Total</span>
            <span>${BRL(total)}</span>
        </div>
    `;
}

function updateCart(productId, action) {
    const cart = cartStore.get();
    const itemIndex = cart.findIndex(i => i.id === productId);
    if (itemIndex === -1) return;

    if (action === 'increase') {
        cart[itemIndex].qty++;
    } else if (action === 'decrease') {
        cart[itemIndex].qty--;
        if (cart[itemIndex].qty <= 0) cart.splice(itemIndex, 1);
    } else if (action === 'remove') {
        cart.splice(itemIndex, 1);
    }

    cartStore.set(cart);
    renderCart();
}

// --- FUNÇÕES DE CHECKOUT ---

function buildWhatsappMessage(orderId, order) {
    const lines = [];
    lines.push('🛍️ *Novo Pedido Olomi* 🛍️');
    lines.push(`*Pedido:* ${orderId}`);
    lines.push('--------------------------');
    order.items.forEach(it => lines.push(`${it.qty}x ${it.name} – ${BRL(it.price * it.qty)}`));
    lines.push('--------------------------');
    lines.push(`*Total:* *${BRL(order.total)}*`);
    lines.push('--------------------------');
    const c = order.customer;
    lines.push('*Dados do Cliente:*');
    lines.push(`*Nome:* ${c.name}`);
    if (c.phone) lines.push(`*WhatsApp:* ${c.phone}`);
    lines.push(`*Endereço:* ${c.address}`);
    lines.push('\nObrigado pela preferência! ✨');
    return lines.join('\n');
}

function openWhatsapp(targetNumber, text) {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${targetNumber}?text=${encoded}`;
    window.open(url, '_blank');
}

// --- EVENT LISTENERS ---

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

    // --- NOVA VERIFICAÇÃO DE LOGIN ---
    const user = auth.currentUser;
    if (!user) {
        alert('Você precisa de estar autenticado para finalizar a compra.');
        // Redireciona para o login, guardando a página atual para voltar depois
        window.location.href = `login-cliente.html?redirect=carrinho.html`;
        return;
    }
    // --- FIM DA VERIFICAÇÃO ---

    const cart = cartStore.get();
    if (cart.length === 0) {
        alert('O seu carrinho está vazio.');
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const order = {
        userId: user.uid, // Guarda o ID do utilizador que fez a encomenda
        items: cart,
        total: subtotal,
        customer: { name: data.name, phone: data.phone, address: data.address },
        status: 'pending',
        createdAt: serverTimestamp(),
    };

    try {
        const ref = await addDoc(collection(db, 'orders'), order);
        const lojaNumero = '5519987346984'; // Substitua pelo seu número
        const msg = buildWhatsappMessage(ref.id, order);
        openWhatsapp(lojaNumero, msg);
        
        alert('Pedido criado! Estamos a redirecioná-lo para o WhatsApp para finalizar.');
        cartStore.clear();
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Erro ao finalizar o pedido:", err);
        alert('Erro ao finalizar o pedido: ' + err.message);
    }
});

// --- INICIALIZAÇÃO ---
renderCart();
