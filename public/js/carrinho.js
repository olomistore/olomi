import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore, toCents } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const itemsListEl = document.getElementById('cart-items-list');
const totalsEl = document.getElementById('totals-summary');
const form = document.getElementById('checkout-form');
const cartContainer = document.getElementById('cart-container');

// --- FUNÇÕES DO CARRINHO ---

/**
 * Renderiza todos os elementos do carrinho na tela.
 */
function renderCart() {
    const cart = cartStore.get();

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="cart-empty">
                <h2>Seu carrinho está vazio.</h2>
                <p>Adicione produtos do nosso catálogo para vê-los aqui.</p>
                <a href="/" class="back-to-store-btn">Voltar ao Catálogo</a>
            </div>
        `;
        // Adicione um estilo para .cart-empty e .back-to-store-btn no seu css se desejar
        return;
    }

    // Limpa o conteúdo atual
    itemsListEl.innerHTML = '';
    totalsEl.innerHTML = '';

    let subtotal = 0;

    // Renderiza cada item do carrinho
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

    // Renderiza os totais
    const shipping = 0; // Você pode adicionar lógica de frete aqui se desejar
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

/**
 * Atualiza a quantidade de um item ou remove-o do carrinho.
 * @param {string} productId - O ID do produto.
 * @param {'increase'|'decrease'|'remove'} action - A ação a ser executada.
 */
function updateCart(productId, action) {
    const cart = cartStore.get();
    const itemIndex = cart.findIndex(i => i.id === productId);

    if (itemIndex === -1) return;

    if (action === 'increase') {
        cart[itemIndex].qty++;
    } else if (action === 'decrease') {
        cart[itemIndex].qty--;
        if (cart[itemIndex].qty <= 0) {
            cart.splice(itemIndex, 1); // Remove se a quantidade for 0 ou menos
        }
    } else if (action === 'remove') {
        cart.splice(itemIndex, 1); // Remove o item
    }

    cartStore.set(cart);
    renderCart(); // Re-renderiza o carrinho para refletir as mudanças
}

// --- FUNÇÕES DE CHECKOUT ---

function buildWhatsappMessage(orderId, order) {
    const lines = [];
    lines.push('🛍️ *Novo Pedido Olomi* 🛍️');
    lines.push(`*Pedido:* ${orderId}`);
    lines.push('--------------------------');
    order.items.forEach(it => lines.push(`${it.qty}x ${it.name} – ${BRL(it.price * it.qty)}`));
    lines.push('--------------------------');
    lines.push(`*Subtotal:* ${BRL(order.subtotal)}`);
    lines.push(`*Frete:* ${BRL(order.shipping)}`);
    lines.push(`*Total:* *${BRL(order.total)}*`);
    lines.push('--------------------------');
    const c = order.customer;
    lines.push('*Dados do Cliente:*');
    lines.push(`*Nome:* ${c.name}`);
    if (c.cpfCnpj) lines.push(`*CPF/CNPJ:* ${c.cpfCnpj}`);
    if (c.phone) lines.push(`*WhatsApp:* ${c.phone}`);
    if (c.email) lines.push(`*Email:* ${c.email}`);
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

// Delegação de eventos para os botões de quantidade e remoção
itemsListEl.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const { id, action } = button.dataset;
    if (id && action) {
        updateCart(id, action);
    }
});

// Evento de submit do formulário de checkout
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = cartStore.get();
    if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const shippingCents = 0; // Lógica de frete pode ser adicionada aqui
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal + shippingCents;

    const order = {
        items: cart.map(i => ({...i, price: i.price})), // Garante que o preço está em centavos se necessário
        subtotal,
        shipping: shippingCents,
        total,
        customer: {
            name: data.name,
            cpfCnpj: data.cpfCnpj || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address,
        },
        status: 'pending',
        createdAt: serverTimestamp(),
    };

    try {
        const ref = await addDoc(collection(db, 'orders'), order);
        
        const lojaNumero = '5519987346984'; // Substitua pelo seu número
        const msg = buildWhatsappMessage(ref.id, order);
        openWhatsapp(lojaNumero, msg);
        
        alert('Pedido criado! Estamos te redirecionando para o WhatsApp para finalizar.');
        cartStore.clear();
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        alert('Erro ao finalizar pedido: ' + err.message);
    }
});

// --- INICIALIZAÇÃO ---
renderCart();
