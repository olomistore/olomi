import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
// Importa as funções de carrinho e utilitários centralizadas
import { BRL, updateCartCount, addToCart } from './utils.js';

const productDetailEl = document.getElementById('product-detail');

let currentProduct = null;

function renderProduct(p) {
    if (!productDetailEl) return;
    document.title = `${p.name} - Olomi`;

    const imageUrl = p.imageUrls && p.imageUrls.length > 0 
        ? p.imageUrls[0] 
        : 'https://placehold.co/600x600/f39c12/fff?text=Olomi';

    productDetailEl.innerHTML = `
        <div class="product-image-gallery">
          <img src="${imageUrl}" alt="${p.name}">
        </div>
        <div class="product-info">
          <h2 class="product-title-large">${p.name}</h2>
          <p class="product-price-large">${BRL(p.price)}</p>
          <p class="product-description-large">${p.description || 'Descrição não disponível.'}</p>
          <button class="add-to-cart-btn-large">Adicionar ao Carrinho</button>
        </div>
    `;

    const button = productDetailEl.querySelector('.add-to-cart-btn-large');

    // --- MELHORIA: VERIFICAÇÃO DE STOCK ---
    if (p.stock <= 0) {
        button.disabled = true;
        button.textContent = 'Produto Esgotado';
        button.style.backgroundColor = '#ccc'; // Cinza, para indicar que está desativado
    } else {
        button.addEventListener('click', (event) => {
            // Usa a função centralizada addToCart
            addToCart(p, event.target);
        });
    }
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
    
    // Atualiza a contagem do carrinho na inicialização da página
    updateCartCount();
}

init();
