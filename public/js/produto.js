import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

const productDetailEl = document.getElementById('product-detail');
const cartCountEl = document.getElementById('cart-count');

let currentProduct = null;

function renderProduct(p) {
    if (!productDetailEl) return;
    document.title = `${p.name} - Olomi`;

    productDetailEl.innerHTML = `
        <div class="product-image-gallery">
          <img src="${p.imageUrl || 'https://placehold.co/600x600/f39c12/fff?text=Olomi'}" alt="${p.name}">
        </div>
        <div class="product-info">
          <h2 class="product-title-large">${p.name}</h2>
          <p class="product-price-large">${BRL(p.price)}</p>
          <p class="product-description-large">${p.description || 'Descrição não disponível.'}</p>
          <button class="add-to-cart-btn-large">Adicionar ao Carrinho</button>
        </div>
    `;

    const button = productDetailEl.querySelector('.add-to-cart-btn-large');
    button.addEventListener('click', (event) => {
        addToCart(p, event.target);
    });
}

function addToCart(p, buttonEl) {
    const cart = cartStore.get();
    const itemIndex = cart.findIndex(i => i.id === p.id);

    if (itemIndex >= 0) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, qty: 1 });
    }

    cartStore.set(cart);
    updateCartCount();

    buttonEl.textContent = 'Adicionado ✓';
    buttonEl.style.backgroundColor = '#27ae60';
    setTimeout(() => {
        buttonEl.textContent = 'Adicionar ao Carrinho';
        buttonEl.style.backgroundColor = '';
    }, 2000);
}

function updateCartCount() {
    if (!cartCountEl) return;
    const cart = cartStore.get();
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountEl.textContent = totalItems;
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        productDetailEl.innerHTML = '<p>Produto não encontrado. <a href="/">Volte ao catálogo</a>.</p>';
        return;
    }
    
    if (productDetailEl) productDetailEl.innerHTML = '<div class="spinner"></div>';

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            renderProduct(currentProduct);
        } else {
            productDetailEl.innerHTML = '<p>Produto não encontrado. <a href="/">Volte ao catálogo</a>.</p>';
        }
    } catch (error) {
        console.error("Erro ao procurar o produto:", error);
        productDetailEl.innerHTML = '<p>Ocorreu um erro ao carregar o produto.</p>';
    }
    
    updateCartCount();
}

init();
