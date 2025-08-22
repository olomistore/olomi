import { db } from './firebase.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

// --- SELEÇÃO DOS ELEMENTOS ---
const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');
const cartCount = document.getElementById('cart-count');

let products = []; // Array para guardar todos os produtos da base de dados

// --- FUNÇÕES ---

/**
 * Renderiza a lista de produtos no ecrã com o design final.
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
        const link = document.createElement('a');
        link.href = `produto.html?id=${p.id}`;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';

        link.innerHTML = `
          <div class="product-card">
            <img src="${p.imageUrl || 'https://placehold.co/400x400/f39c12/fff?text=Olomi'}" alt="${p.name}" class="product-image">
            <div class="card-content">
              <h3 class="product-title">${p.name}</h3>
              <p class="product-description">${p.description?.slice(0, 100) || 'Sem descrição.'}</p>
              <p class="product-price">${BRL(p.price)}</p>
              <button type="button" class="add-to-cart-btn" data-id="${p.id}">Adicionar ao Carrinho</button>
            </div>
          </div>
        `;
        
        link.querySelector('button').addEventListener('click', (event) => {
            event.preventDefault();
            addToCart(p, event.target);
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
 * Filtra os produtos com base na procura e na categoria selecionada.
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
 */
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
    if (listEl) listEl.innerHTML = '<div class="spinner"></div>';
    
    try {
        const productsCollection = collection(db, 'products');
        // ALTERAÇÃO CRÍTICA: A ordenação foi removida da consulta
        const qy = query(productsCollection);
        const snapshot = await getDocs(qy);

        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // A ordenação é feita aqui, no código, o que é mais seguro e não requer índices
        products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        render(products);
        loadCategories();
        updateCartCount();
    } catch (error) {
        console.error("Erro ao procurar produtos:", error);
        if (listEl) listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Não foi possível carregar os produtos. Verifique as regras do Firestore.</p>';
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
