import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/
firebasejs / 10.12.3 / firebase - firestore.js";
import { BRL, cartStore } from './utils.js';
const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');
const cartCount = document.getElementById('cart-count');
let products = [];
function render(list) {
    if (!listEl) return;
    listEl.innerHTML = '';
    list.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
 <img src="${p.imageUrl || 'https://picsum.photos/400?blur=2'}" alt="$
{p.name}">
 <h3>${p.name}</h3>
 <p>${p.description?.slice(0, 100) || ''}</p>
 <div class="price">${BRL(p.price)}</div>
 <button data-id="${p.id}">Adicionar</button>
 `;
        card.querySelector('button').addEventListener('click', () =>
            addToCart(p));
        listEl.appendChild(card);
    });
}
function loadCategories() {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    set.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        catEl?.appendChild(opt);
    });
}
function filter() {
    const term = (searchEl?.value || '').toLowerCase();
    const cat = catEl?.value || '';
    const list = products.filter(p =>
        (!cat || p.category === cat) &&
        (!term || p.name.toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term))
    );
    render(list);
}
function addToCart(p) {
    const cart = cartStore.get();
    const idx = cart.findIndex(i => i.id === p.id);
    if (idx >= 0) cart[idx].qty += 1; else cart.push({
        id: p.id, name: p.name,
        price: p.price, qty: 1
    });
    cartStore.set(cart);
    updateCartCount();
    alert('Adicionado ao carrinho!');
}
function updateCartCount() {
    const cart = cartStore.get();
    cartCount && (cartCount.textContent = cart.reduce((s, i) => s + i.qty, 0));
}
async function init() {
    const qy = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(products);
    loadCategories();
    updateCartCount();
}
[searchEl, catEl].forEach(el => el && el.addEventListener('input', filter));
init();