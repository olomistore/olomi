import { db } from './firebase.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { BRL, cartStore } from './utils.js';

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
        const link = document.createElement('a');
        link.href = `produto.html?id=${p.id}`;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';

        // ✅ CORREÇÃO: Lógica melhorada para ser compatível com produtos antigos e novos.
        let imageUrl = 'https://placehold.co/400x400/f39c12/fff?text=Olomi'; // Imagem de substituição padrão
        if (p.imageUrls && p.imageUrls.length > 0) {
            imageUrl = p.imageUrls[0]; // Usa o novo sistema de array de imagens, se existir
        } else if (p.imageUrl) {
            imageUrl = p.imageUrl; // Se não, usa o sistema antigo de imagem única
        }

        link.innerHTML = `
          <div class="product-card">
            <img src="${imageUrl}" alt="${p.name}" class="product-image" loading="lazy">
            <div class="product-info-card">
              <h3 class="product-title">${p.name}</h3>
              <p class="product-price">${BRL(p.price)}</p>
            </div>
          </div>
        `;
        listEl.appendChild(link);
    });
}

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
        console.error("Ocorreu um erro ao carregar os produtos:", error);
        if (listEl) listEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red;">Não foi possível carregar os produtos. Verifique a consola para mais detalhes (F12).</p>`;
    }
}

searchEl?.addEventListener('input', filterProducts);
catEl?.addEventListener('change', filterProducts);

init();
