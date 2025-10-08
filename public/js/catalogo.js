import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
// 🧪 TESTE: A função de otimização está temporariamente desativada para depuração.
import { BRL, cartStore, showToast } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');

let products = []; // Array local para guardar e filtrar todos os produtos

/**
 * Lida com a lógica de adicionar um produto ao carrinho.
 * @param {string} productId - O ID do produto a adicionar.
 * @param {HTMLElement} button - O elemento do botão que foi clicado.
 */
function handleAddToCart(productId, button) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cart = cartStore.get();
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        // Se o item já está no carrinho, incrementa a quantidade
        if (existingItem.qty < product.stock) {
            existingItem.qty++;
            showToast(`${product.name} adicionado ao carrinho!`);
        } else {
            // Informa o utilizador que o stock máximo foi atingido
            showToast('Quantidade máxima em stock atingida.', 'warning');
            return; // Não faz mais nada se o stock estiver no limite
        }
    } else {
        // Adiciona o novo item ao carrinho
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            stock: product.stock,
            imageUrl: (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : null
        });
        showToast(`${product.name} adicionado ao carrinho!`);
    }

    cartStore.set(cart); // Salva o carrinho e notifica os listeners (que atualizam o contador no header)

    // Feedback visual no botão
    button.textContent = 'Adicionado!';
    button.disabled = true;
    setTimeout(() => {
        button.textContent = 'Adicionar ao Carrinho';
        button.disabled = false;
    }, 1500);
}

/**
 * Renderiza a lista de produtos no ecrã.
 */
function render(list) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (list.length === 0) {
        listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Nenhum produto encontrado.</p>';
        return;
    }

    list.forEach(p => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        // 🧪 TESTE: Usando a URL original diretamente do Firestore para isolar a falha.
        const imageUrl = (p.imageUrls && p.imageUrls.length > 0)
            ? p.imageUrls[0] // A função getResizedImageUrl foi removida temporariamente.
            : 'https://placehold.co/400x400/f39c12/fff?text=Olomi';

        const isOutOfStock = p.stock <= 0;
        const buttonText = isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho';
        const buttonDisabled = isOutOfStock ? 'disabled' : '';

        productCard.innerHTML = `
            <a href="produto.html?id=${p.id}" class="product-link">
                <img src="${imageUrl}" alt="${p.name}" class="product-image" loading="lazy">
            </a>
            <div class="card-content">
                <h3 class="product-title"><a href="produto.html?id=${p.id}">${p.name}</a></h3>
                <p class="product-description">${p.description || 'Clique para ver mais detalhes.'}</p>
                <p class="product-price">${BRL(p.price)}</p>
                <button type="button" class="add-to-cart-btn" data-id="${p.id}" ${buttonDisabled}>${buttonText}</button>
            </div>
        `;

        const button = productCard.querySelector('button');
        if (button) {
            button.addEventListener('click', () => handleAddToCart(p.id, button));
        }

        listEl.appendChild(productCard);
    });
}


/**
 * Carrega as categorias de produtos de forma única no <select>.
 */
function loadCategories() {
    if (!catEl) return;
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    categories.sort();
    catEl.innerHTML = '<option value="">Todas as categorias</option>'; // Limpa e adiciona a opção padrão
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catEl.appendChild(opt);
    });
}

/**
 * Filtra os produtos com base na procura e na categoria selecionada.
 */
function filter() {
    const term = (searchEl?.value || '').toLowerCase();
    const cat = catEl?.value || '';

    const filteredList = products.filter(p => {
        const matchesCategory = !cat || p.category === cat;
        const matchesTerm = !term || p.name.toLowerCase().includes(term);
        return matchesCategory && matchesTerm;
    });

    render(filteredList);
}

/**
 * Função principal de inicialização.
 */
async function init() {
    if (!listEl) return;
    listEl.innerHTML = '<div class="spinner"></div>';

    try {
        const productsCollection = collection(db, 'products');
        const q = query(productsCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        render(products);
        loadCategories();

    } catch (error) {
        console.error("Erro ao carregar os produtos:", error);
        listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Não foi possível carregar os produtos. Tente recarregar a página.</p>';
    }
}

// --- EVENT LISTENERS ---
[searchEl, catEl].forEach(el => {
    if (el) {
        el.addEventListener('input', filter);
    }
});

// --- INICIALIZAÇÃO ---
init();
