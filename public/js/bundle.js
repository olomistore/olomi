import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { BRL, cartStore, showToast } from './utils.js';

// --- Lógica do main.js ---
const userNavContainer = document.getElementById('user-navigation');
const adminLinkContainer = document.getElementById('admin-link-container');

if (userNavContainer && adminLinkContainer) {
    cartStore.updateCountUI();
    cartStore.onChange(cartStore.updateCountUI);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const roleRef = doc(db, 'roles', user.uid);
            const roleSnap = await getDoc(roleRef);
            const isAdmin = roleSnap.exists() && roleSnap.data().admin;

            adminLinkContainer.innerHTML = isAdmin ? '<a href="admin.html" class="nav-link">Painel Admin</a>' : '';

            userNavContainer.innerHTML = `
                <a href="minha-conta.html" class="nav-link">Minha Conta</a>
                <a href="#" id="logout-btn" class="nav-link">Sair</a>
            `;

            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    signOut(auth).then(() => {
                        window.location.href = '/index.html';
                    }).catch((error) => {
                        console.error("Erro ao fazer logout:", error);
                    });
                });
            }

        } else {
            adminLinkContainer.innerHTML = '';
            userNavContainer.innerHTML = `
                <a href="login-cliente.html" class="nav-link">Entrar</a>
                <a href="cadastro.html" class="nav-link">Registar</a>
            `;
        }
    });
}

// --- Lógica do catalogo.js (executará apenas se encontrar o elemento 'products') ---
const listEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const catEl = document.getElementById('category');

if (listEl) {
    let products = [];

    function handleAddToCart(productId, button) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const cart = cartStore.get();
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.qty < product.stock) {
                existingItem.qty++;
                showToast(`${product.name} adicionado ao carrinho!`);
            } else {
                showToast('Quantidade máxima em stock atingida.', 'warning');
                return;
            }
        } else {
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
        cartStore.set(cart);
        button.textContent = 'Adicionado!';
        button.disabled = true;
        setTimeout(() => {
            button.textContent = 'Adicionar ao Carrinho';
            button.disabled = false;
        }, 1500);
    }

    function render(list) {
        listEl.innerHTML = '';
        if (list.length === 0) {
            listEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Nenhum produto encontrado.</p>';
            return;
        }
        list.forEach(p => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            const imageUrl = (p.imageUrls && p.imageUrls.length > 0)
                ? p.imageUrls[0]
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

    function loadCategories() {
        if (!catEl) return;
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        categories.sort();
        catEl.innerHTML = '<option value="">Todas as categorias</option>';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catEl.appendChild(opt);
        });
    }

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

    async function init() {
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

    [searchEl, catEl].forEach(el => {
        if (el) {
            el.addEventListener('input', filter);
        }
    });

    init();
}
