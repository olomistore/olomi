import { db } from './firebase.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore, showNotification } from './utils.js';

const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');
const cartCount = document.getElementById('cart-count');

let products = [];

function render(list) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (list.length === 0) {
        listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Nenhum produto encontrado.</p>';
        return;
    }

    list.forEach(p => {
        const productCardContainer = document.createElement('div');
        productCardContainer.className = 'product-card';

        let imageUrl = p.imageUrls?.[0] || p.imageUrl || 'https://placehold.co/400x400/f39c12/fff?text=Olomi';

        productCardContainer.innerHTML = `
            <a href="produto.html?id=${p.id}" class="product-link">
                <img src="${imageUrl}" alt="${p.name}" class="product-image" loading="lazy">
                <div class="product-info-card">
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-price">${BRL(p.price)}</p>
                </div>
            </a>
            <!-- ✅ CORREÇÃO: Botão adicionado novamente -->
            <button class="add-to-cart-btn" data-id="${p.id}">Adicionar ao Carrinho</button>
        `;
        listEl.appendChild(productCardContainer);
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cart = cartStore.get();
    const item = cart.find(i => i.id === product.id);
    if (item) {
        item.qty++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrls?.[0] || product.imageUrl,
            qty: 1
        });
    }
    cartStore.set(cart);
    updateCartCount();
    showNotification(`${product.name} adicionado ao carrinho!`, 'success');
}

// ✅ CORREÇÃO: Delegação de eventos para os botões do catálogo
listEl?.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        e.preventDefault();
        const productId = e.target.dataset.id;
        addToCart(productId);
    }
});


function loadCategories() {
    if (!catEl) return;
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catEl.appendChild(opt);
    });
}

function filterProducts() {
    const searchTerm = searchEl.value.toLowerCase();
    const selectedCategory = catEl.value;
    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });
    render(filtered);
}

function updateCartCount() {
    if (!cartCount) return;
    const cart = cartStore.get();
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = totalItems;
}

async function init() {
    if (listEl) listEl.innerHTML = '<div class="spinner"></div>';
    
    try {
        const productsCollection = collection(db, 'products');
        const qy = query(productsCollection);
        const snapshot = await getDocs(qy);

        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        render(products);
        loadCategories();
        updateCartCount();
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        if (listEl) listEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red;">Não foi possível carregar os produtos.</p>`;
    }
}

searchEl?.addEventListener('input', filterProducts);
catEl?.addEventListener('change', filterProducts);

init();
