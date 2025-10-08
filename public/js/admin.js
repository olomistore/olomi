import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

// --- ELEMENTOS DO DOM ---
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');
const tabsContainer = document.querySelector('.admin-tabs');

// --- ESTADO DA APLICAÇÃO ---
let currentEditingProductId = null;
let existingImageUrls = [];
let ordersLoaded = false; // Flag para carregar pedidos apenas uma vez

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const roleRef = doc(db, 'roles', user.uid);
        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists() || !roleSnap.data().admin) {
            showToast('Acesso negado. Apenas administradores.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
        } else {
            // Carrega os produtos por padrão e configura as abas
            loadProducts();
            setupTabs();
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        showToast('Erro ao verificar permissões.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

// --- LÓGICA DAS ABAS ---
const setupTabs = () => {
    tabsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.tab-link');
        if (!target) return;

        const tabName = target.dataset.tab;
        
        // Remove a classe 'active' de todas as abas e conteúdos
        document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Adiciona a classe 'active' à aba e conteúdo clicados
        target.classList.add('active');
        document.getElementById(tabName).classList.add('active');

        // Carrega os pedidos se a aba for clicada pela primeira vez
        if (tabName === 'orders' && !ordersLoaded) {
            loadOrders();
            ordersLoaded = true;
        }
    });
};

// --- CARREGAMENTO DE DADOS ---
const loadProducts = () => {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        productsTableBody.innerHTML = '';
        if (snapshot.empty) {
            productsTableBody.innerHTML = `<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const tr = document.createElement('tr');
            const imageUrl = (product.imageUrls && product.imageUrls.length > 0)
                ? getResizedImageUrl(product.imageUrls[0])
                : 'https://placehold.co/100x100/f39c12/fff?text=Olomi';
            tr.innerHTML = `
                <td><img src="${imageUrl}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>${BRL(product.price)}</td>
                <td>${product.stock}</td>
                <td class="actions-cell">
                    <button class="action-btn edit" data-id="${docSnap.id}">Editar</button>
                    <button class="action-btn delete" data-id="${docSnap.id}">Excluir</button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

const loadOrders = () => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        ordersTableBody.innerHTML = '';
        if (snapshot.empty) {
            ordersTableBody.innerHTML = `<tr><td colspan="6">Nenhum pedido recebido.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${docSnap.id.substring(0, 8)}...</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${order.createdAt.toDate().toLocaleDateString('pt-BR')}</td>
                <td>${BRL(order.totalAmount)}</td>
                <td><span class="status ${order.status}">${order.status}</span></td>
                <td class="order-actions">
                    <button class="action-btn ship" data-id="${docSnap.id}">Marcar como Enviado</button>
                    <button class="action-btn cancel" data-id="${docSnap.id}">Cancelar</button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    }, (error) => {
        console.error("Erro ao carregar pedidos: ", error);
        showToast("Erro ao carregar os pedidos.", "error");
        ordersTableBody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos. Tente novamente.</td></tr>`;
    });
};


// --- FORMULÁRIO DE PRODUTO ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';

    try {
        const form = e.target;
        const name = form.name.value.trim();
        const description = form.description.value.trim();
        const category = form.category.value.trim();
        const price = parseFloat(form.price.value.replace(',', '.').trim());
        const stock = parseInt(form.stock.value, 10);

        if (!name || isNaN(price) || isNaN(stock)) {
            throw new Error('Por favor, preencha todos os campos com valores válidos.');
        }

        const files = imageUpload.files;
        let imageUrls = [...existingImageUrls];

        if (files.length > 0) {
            showToast('Enviando imagens...', 'info');
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('file', file));

            const functionUrl = 'https://us-central1-olomi-7816a.cloudfunctions.net/uploadFile';
            const response = await fetch(functionUrl, { method: 'POST', body: formData });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Falha ao enviar imagem.');
            }
            const result = await response.json();
            imageUrls.push(...result.imageUrls);
        }

        if (imageUrls.length === 0) {
            throw new Error('O produto precisa de pelo menos uma imagem.');
        }

        const productData = { name, description, price, stock, category, imageUrls };

        if (currentEditingProductId) {
            productData.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'products', currentEditingProductId), productData);
            showToast('Produto atualizado com sucesso!', 'success');
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showToast('Produto cadastrado com sucesso!', 'success');
        }

        resetForm();

    } catch (error) {
        console.error('ERRO AO SALVAR PRODUTO:', error);
        showToast(`Falha ao salvar: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});

function resetForm() {
    productForm.reset();
    imagePreviewContainer.innerHTML = '';
    currentEditingProductId = null;
    existingImageUrls = [];
    productForm.querySelector('button[type="submit"]').textContent = 'Salvar Produto';
    imageUpload.value = ''; // Limpa a seleção de arquivos
}

// --- AÇÕES DA TABELA DE PRODUTOS ---
productsTableBody.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const productId = target.dataset.id;

    if (target.classList.contains('edit')) {
        handleEditClick(productId);
    }

    if (target.classList.contains('delete')) {
        handleDeleteClick(productId);
    }
});


const handleEditClick = async (id) => {
    try {
        const productRef = doc(db, 'products', id);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            productForm.name.value = product.name;
            productForm.description.value = product.description;
            productForm.category.value = product.category;
            productForm.price.value = product.price.toString().replace('.', ',');
            productForm.stock.value = product.stock;

            imagePreviewContainer.innerHTML = '';
            existingImageUrls = product.imageUrls || [];
            existingImageUrls.forEach(url => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-preview';
                imgContainer.innerHTML = `<img src="${getResizedImageUrl(url)}" alt="Preview"><button type="button" class="remove-image" data-url="${url}">&times;</button>`;
                imagePreviewContainer.appendChild(imgContainer);
            });
            
            currentEditingProductId = id;
            productForm.scrollIntoView({ behavior: 'smooth' });
            productForm.querySelector('button[type="submit"]').textContent = 'Atualizar Produto';
        } else {
            showToast('Produto não encontrado.', 'error');
        }
    } catch (error) {
        console.error("Erro ao carregar produto para edição:", error);
        showToast('Falha ao carregar produto.', 'error');
    }
};

const handleDeleteClick = async (id) => {
    const confirmed = await showConfirmation('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
        const productRef = doc(db, 'products', id);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            if (product.imageUrls && product.imageUrls.length > 0) {
                showToast('Excluindo imagens associadas...', 'info');
                const deletePromises = product.imageUrls.map(url => {
                    try {
                        const imageRef = ref(storage, url);
                        return deleteObject(imageRef);
                    } catch (error) {
                        console.error(`Falha ao criar referência para exclusão: ${url}`, error);
                        return null; 
                    }
                }).filter(p => p !== null);
                await Promise.all(deletePromises);
            }
        }
        
        await deleteDoc(productRef);
        showToast('Produto excluído com sucesso!', 'success');

    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        showToast(`Falha ao excluir produto: ${error.message}`, 'error');
    }
};

// --- AÇÕES DA TABELA DE PEDIDOS ---
ordersTableBody.addEventListener('click', async (e) => {
    const target = e.target.closest('.action-btn');
    if (!target) return;

    const orderId = target.dataset.id;
    const orderRef = doc(db, 'orders', orderId);

    if (target.classList.contains('ship')) {
        const confirmed = await showConfirmation('Tem certeza que deseja marcar este pedido como enviado?');
        if (confirmed) {
            await updateDoc(orderRef, { status: 'shipped' });
            showToast('Pedido marcado como enviado.', 'success');
        }
    }

    if (target.classList.contains('cancel')) {
        const confirmed = await showConfirmation('Tem certeza que deseja cancelar este pedido?');
         if (confirmed) {
            await updateDoc(orderRef, { status: 'cancelled' });
            showToast('Pedido cancelado.', 'success');
        }
    }
});


// --- OUTROS EVENTOS ---
imagePreviewContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-image')) {
        const urlToRemove = e.target.dataset.url;
        existingImageUrls = existingImageUrls.filter(url => url !== urlToRemove);
        e.target.closest('.image-preview').remove();
        showToast('Imagem marcada para remoção. Salve para confirmar.', 'info');
    }
});

logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});