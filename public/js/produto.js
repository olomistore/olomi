import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore, showNotification } from './utils.js';

const productDetailEl = document.getElementById('product-detail');
const cartCountEl = document.getElementById('cart-count');

let currentProduct = null;

function renderProduct(p) {
    if (!productDetailEl) return;
    document.title = `${p.name} - Olomi`;

    // ✅ CORREÇÃO: Cria a estrutura HTML completa antes de tentar aceder a elementos internos
    productDetailEl.innerHTML = `
        <div class="product-image-gallery">
          <div class="main-image-container">
            <img id="main-product-image" src="https://placehold.co/600x600/f39c12/fff?text=Olomi" alt="Imagem principal do produto">
          </div>
          <div id="thumbnail-container" class="thumbnail-container"></div>
        </div>
        <div class="product-info">
          <h2 class="product-title-large">${p.name}</h2>
          <p class="product-price-large">${BRL(p.price)}</p>
          <p class="product-description-large">${p.description || 'Descrição não disponível.'}</p>
          <button class="add-to-cart-btn-large">Adicionar ao Carrinho</button>
        </div>
    `;

    const mainImageEl = document.getElementById('main-product-image');
    const thumbnailContainerEl = document.getElementById('thumbnail-container');

    // Constrói a galeria de imagens
    if (p.imageUrls && p.imageUrls.length > 0) {
        mainImageEl.src = p.imageUrls[0];
        mainImageEl.alt = p.name;
        thumbnailContainerEl.innerHTML = '';

        p.imageUrls.forEach((url, index) => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.alt = `Imagem ${index + 1} de ${p.name}`;
            thumb.loading = 'lazy';
            if (index === 0) {
                thumb.classList.add('active');
            }
            thumb.addEventListener('click', () => {
                mainImageEl.src = url;
                thumbnailContainerEl.querySelector('.active')?.classList.remove('active');
                thumb.classList.add('active');
            });
            thumbnailContainerEl.appendChild(thumb);
        });
    }

    const button = productDetailEl.querySelector('.add-to-cart-btn-large');
    button.addEventListener('click', () => {
        addToCart(p);
    });
}

function addToCart(product) {
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
