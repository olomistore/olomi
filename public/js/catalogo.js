import { db } from './firebase.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');
const cartCount = document.getElementById('cart-count');

let products = []; // Array para armazenar todos os produtos do banco de dados

// --- FUNÇÕES ---

/**
 * Renderiza a lista de produtos na tela, agora com links para a página de detalhes.
 * @param {Array} list - A lista de produtos a ser exibida.
 */
function render(list) {
    if (!listEl) return;
    listEl.innerHTML = ''; // Limpa a lista antes de renderizar

    if (list.length === 0) {
        listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Nenhum produto encontrado.</p>';
        return;
    }

    list.forEach(p => {
        // 1. Cria um elemento de link (<a>) para envolver o card
        const link = document.createElement('a');
        link.href = `produto.html?id=${p.id}`;
        link.style.textDecoration = 'none'; // Remove o sublinhado padrão do link
        link.style.color = 'inherit';

        // 2. A estrutura HTML do card é inserida dentro do link
        link.innerHTML = `
          <div class="product-card">
            <img src="${p.imageUrl || 'https://placehold.co/400x400/f39c12/fff?text=Olomi'}" alt="${p.name}" class="product-image">
            <div class="card-content">
              <h3 class="product-title">${p.name}</h3>
              <p class="product-description">${p.description?.slice(0, 100) || 'Sem descrição.'}</p>
              <p class="product-price">${BRL(p.price)}</p>
              <button class="add-to-cart-btn" data-id="${p.id}">Adicionar ao Carrinho</button>
            </div>
          </div>
        `;

        // 3. Adiciona um evento de clique ESPECÍFICO para o botão
        link.querySelector('button').addEventListener('click', (event) => {
            // Previne que o link seja seguido quando o BOTÃO é clicado
            event.preventDefault(); 
            addToCart(p, event.target); // Executa apenas a função de adicionar ao carrinho
        });

        listEl.appendChild(link);
    });
}

/**
 * Carrega as categorias de produtos de forma única no <select>.
 */
function loadCategories() {
    if (!catEl) return;
    const categories = new Set(products.map(p => p.category).filter(Boolean));
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catEl.appendChild(opt);
    });
}

/**
 * Filtra os produtos com base na busca e na categoria selecionada.
 */
function filter() {
    const term = (searchEl?.value || '').toLowerCase();
    const cat = catEl?.value || '';

    const filteredList = products.filter(p => {
        const matchesCategory = !cat || p.category === cat;
        const matchesTerm = !term || 
                            p.name.toLowerCase().includes(term) ||
                            (p.description || '').toLowerCase().includes(term);
        return matchesCategory && matchesTerm;
    });

    render(filteredList);
}

/**
 * Adiciona um produto ao carrinho e atualiza o contador.
 * @param {object} p - O objeto do produto a ser adicionado.
 * @param {HTMLElement} buttonEl - O elemento do botão que foi clicado.
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
            imageUrl: p.imageUrl, // Adicionado para uso no carrinho
            qty: 1
        });
    }

    cartStore.set(cart);
    updateCartCount();

    // Feedback visual no botão, em vez de alert()
    buttonEl.textContent = 'Adicionado ✓';
    buttonEl.style.backgroundColor = '#27ae60'; // Verde
    setTimeout(() => {
        buttonEl.textContent = 'Adicionar ao Carrinho';
        buttonEl.style.backgroundColor = ''; // Volta à cor original
    }, 2000);
}

/**
 * Atualiza o número de itens exibido no ícone do carrinho.
 */
function updateCartCount() {
    if (!cartCount) return;
    const cart = cartStore.get();
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = totalItems;
}

/**
 * Função principal de inicialização.
 */
async function init() {
    if (listEl) listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando produtos...</p>';
    
    try {
        const productsCollection = collection(db, 'products');
        const qy = query(productsCollection); // Query sem o orderBy
        const snapshot = await getDocs(qy);

        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordena os produtos aqui, no código, para maior segurança
        products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        render(products);
        loadCategories();
        updateCartCount();
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        if (listEl) listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Não foi possível carregar os produtos. Tente novamente mais tarde.</p>';
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
