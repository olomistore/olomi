import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const productDetailEl = document.getElementById('product-detail');
const cartCountEl = document.getElementById('cart-count');

let currentProduct = null;

// --- FUNÇÕES ---

/**
 * Renderiza os detalhes de um produto na tela.
 * @param {object} p - O objeto do produto.
 */
function renderProduct(p) {
    if (!productDetailEl) return;

    // Atualiza o título da página
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

    // Adiciona evento ao botão de adicionar ao carrinho
    const button = productDetailEl.querySelector('.add-to-cart-btn-large');
    button.addEventListener('click', (event) => {
        addToCart(p, event.target);
    });
}

/**
 * Adiciona o produto atual ao carrinho.
 * @param {object} p - O objeto do produto.
 * @param {HTMLElement} buttonEl - O botão que foi clicado.
 */
function addToCart(p, buttonEl) {
    const cart = cartStore.get();
    const itemIndex = cart.findIndex(i => i.id === p.id);

    if (itemIndex >= 0) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl,
            qty: 1
        });
    }

    cartStore.set(cart);
    updateCartCount();

    // Feedback visual
    buttonEl.textContent = 'Adicionado ✓';
    buttonEl.style.backgroundColor = '#27ae60';
    setTimeout(() => {
        buttonEl.textContent = 'Adicionar ao Carrinho';
        buttonEl.style.backgroundColor = '';
    }, 2000);
}

/**
 * Atualiza o contador de itens no cabeçalho.
 */
function updateCartCount() {
    if (!cartCountEl) return;
    const cart = cartStore.get();
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountEl.textContent = totalItems;
}

/**
 * Função de inicialização da página.
 */
async function init() {
    // Pega o ID do produto da URL (ex: produto.html?id=DOCUMENT_ID)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        productDetailEl.innerHTML = '<p>Produto não encontrado. <a href="/">Volte ao catálogo</a>.</p>';
        return;
    }

    try {
        // Busca o documento específico do produto no Firebase
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            renderProduct(currentProduct);
        } else {
            console.log("Nenhum documento encontrado!");
            productDetailEl.innerHTML = '<p>Produto não encontrado. <a href="/">Volte ao catálogo</a>.</p>';
        }
    } catch (error) {
        console.error("Erro ao buscar o produto:", error);
        productDetailEl.innerHTML = '<p>Ocorreu um erro ao carregar o produto.</p>';
    }
    
    updateCartCount();
}

// --- INICIALIZAÇÃO ---
init();
