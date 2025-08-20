import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/
firebasejs / 10.12.3 / firebase - firestore.js";
import { BRL, cartStore, toCents } from './utils.js';
const itemsEl = document.getElementById('cart-items');
const totalsEl = document.getElementById('totals');
const form = document.getElementById('checkout-form');
function renderCart() {
    const cart = cartStore.get();
    itemsEl.innerHTML = '';
    if (cart.length === 0) {
        itemsEl.textContent = 'Seu carrinho está vazio.';
        totalsEl.textContent = ''; return;
    }
    let subtotal = 0;
    cart.forEach(i => {
        subtotal += i.price * i.qty;
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
 <div>${i.qty}x</div>
 <div>${i.name}</div>
 <div>${BRL(i.price * i.qty)}</div>
 `;
        itemsEl.appendChild(row);
    });
    totalsEl.textContent = `Subtotal: ${BRL(subtotal)}`;
}
function buildWhatsappMessage(orderId, order) {
    const lines = [];
    lines.push('*Nota Fiscal / Pedido*');
    lines.push(`Pedido: ${orderId}`);
    lines.push('');
    order.items.forEach(it => lines.push(`${it.qty}x ${it.name} – $
{BRL(it.price*it.qty)}`));
    lines.push('');
    lines.push(`Subtotal: ${BRL(order.subtotal)}`);
    lines.push(`Frete: ${BRL(order.shipping)}`);
    lines.push(`Total: *${BRL(order.total)}*`);
    lines.push('');
    const c = order.customer;
    lines.push('*Dados do cliente*');
    lines.push(`Nome: ${c.name}`);
    if (c.cpfCnpj) lines.push(`CPF/CNPJ: ${c.cpfCnpj}`);
    if (c.phone) lines.push(`WhatsApp: ${c.phone}`);
    if (c.email) lines.push(`Email: ${c.email}`);
    lines.push(`Endereço: ${c.address}`);
    lines.push('');
    lines.push('Obrigado pela preferência!');
    return lines.join('\n');
}
function openWhatsapp(targetNumber, text) {
    // targetNumber: somente dígitos, ex: 55DDDNUMERO
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${targetNumber}?text=${encoded}`;
    window.open(url, '_blank');
}
renderCart();
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = cartStore.get();
    if (cart.length === 0) { return alert('Carrinho vazio.'); }
    const data = Object.fromEntries(new FormData(form).entries());
    const shippingCents = toCents(data.shipping || 0);
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal + shippingCents;
    const order = {
        items: cart,
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
        // === Modo Básico: abrir WhatsApp com mensagem pré-preenchida ===
        const lojaNumero = '55SEUDDDSEUNUMERO'; // ex: 5599999999999
        const msg = buildWhatsappMessage(ref.id, order);
        openWhatsapp(lojaNumero, msg);
        alert('Pedido criado! Vamos abrir o WhatsApp para enviar a nota
fiscal.');
cartStore.clear();
        window.location.href = 'index.html';
    } catch (err) {
        alert('Erro ao finalizar pedido: ' + err.message);
    }
});
