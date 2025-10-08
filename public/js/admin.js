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

// --- ESTADO DA APLICAÇÃO ---
let currentEditingProductId = null;
let existingImageUrls = [];
let ordersLoaded = false; // Flag para carregar pedidos apenas uma vez

// --- AUTENTICAÇÃO E CONFIGURAÇÃO INICIAL ---
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
            loadProducts();
            setupCollapsibleSections();
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        showToast('Erro ao verificar permissões.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

// --- LÓGICA DAS SEÇÕES RETRÁTEIS (ACCORDION) ---
const setupCollapsibleSections = () => {
    const allSections = document.querySelectorAll('.collapsible-section');
    allSections.forEach(section => {
        const trigger = section.querySelector('.collapsible-trigger');
        trigger.addEventListener('click', () => {
            const isAlreadyActive = section.classList.contains('active');
            allSections.forEach(s => {
                s.classList.remove('active');
                s.querySelector('.collapsible-content').style.display = 'none';
            });
            if (!isAlreadyActive) {
                section.classList.add('active');
                section.querySelector('.collapsible-content').style.display = 'block';
                if (section.querySelector('#orders-table') && !ordersLoaded) {
                    loadOrders();
                    ordersLoaded = true;
                }
            }
        });
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
            const orderId = docSnap.id;
            const customer = order.customer || {};
            const address = customer.address || {};

            const summaryRow = document.createElement('tr');
            summaryRow.className = 'order-summary-row';
            summaryRow.dataset.orderId = orderId;
            summaryRow.innerHTML = `
                <td>${orderId.substring(0, 8)}...</td>
                <td>${customer.name || 'N/A'}</td>
                <td>${order.createdAt.toDate().toLocaleDateString('pt-BR')}</td>
                <td>${BRL(order.totalAmount)}</td>
                <td><span class="status ${order.status.toLowerCase()}">${order.status}</span></td>
                <td class="order-actions">
                    <button class="action-btn ship" data-id="${orderId}" ${order.status !== 'Pendente' ? 'disabled' : ''}>Marcar Enviado</button>
                    <button class="action-btn cancel" data-id="${orderId}" ${order.status !== 'Pendente' ? 'disabled' : ''}>Cancelar</button>
                </td>
            `;

            const detailsRow = document.createElement('tr');
            detailsRow.className = 'order-details-row';
            detailsRow.style.display = 'none';

            const productsHtml = (order.items && order.items.length > 0)
                ? order.items.map(item => `
                    <li>
                        <img src="${getResizedImageUrl(item.imageUrl)}" alt="${item.name}">
                        <div class="product-info">
                            <strong>${item.name}</strong>
                            <span>${item.qty}x ${BRL(item.price)}</span>
                        </div>
                    </li>`).join('')
                : '<li>Nenhum produto.</li>';

            const fullAddress = `${address.street || ''}, ${address.number || ''}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood || ''}, ${address.city || ''} - ${address.state || ''}, CEP: ${address.cep || ''}`;

            const customerHtml = `
                <h4>Detalhes do Cliente</h4>
                <div class="customer-details-grid">
                    <div class="detail-item"><strong>Nome:</strong> ${customer.name || '-'}</div>
                    <div class="detail-item"><strong>Email:</strong> ${customer.email || '-'}</div>
                    <div class="detail-item"><strong>Telefone:</strong> ${customer.phone || '-'}</div>
                    <div class="detail-item wide"><strong>Endereço:</strong> ${fullAddress}</div>
                </div>
            `;

            detailsRow.innerHTML = `
                <td colspan="6" class="order-details-cell">
                    <div class="order-details-content-grid">
                        <div class="customer-details-section">${customerHtml}</div>
                        <div class="products-details-section">
                            <h4>Produtos do Pedido</h4>
                            <ul class="order-products-list">${productsHtml}</ul>
                        </div>
                    </div>
                </td>
            `;

            ordersTableBody.appendChild(summaryRow);
            ordersTableBody.appendChild(detailsRow);
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
    imageUpload.value = ''; 
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
    const confirmed = await showConfirmation('Tem certeza que deseja excluir este produto?');
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
    const actionBtn = e.target.closest('.action-btn');
    if (actionBtn) {
        const orderId = actionBtn.dataset.id;
        const orderRef = doc(db, 'orders', orderId);

        if (actionBtn.classList.contains('ship')) {
            if (await showConfirmation('Marcar este pedido como enviado?')) {
                try {
                    await updateDoc(orderRef, { status: 'Enviado' });
                    showToast('Pedido marcado como enviado.', 'success');
                } catch (err) { console.error(err); showToast('Erro ao atualizar status.', 'error'); }
            }
        }

        if (actionBtn.classList.contains('cancel')) {
            if (await showConfirmation('Cancelar este pedido?')) {
                try {
                    await updateDoc(orderRef, { status: 'Cancelado' });
                    showToast('Pedido cancelado.', 'success');
                } catch (err) { console.error(err); showToast('Erro ao cancelar pedido.', 'error'); }
            }
        }
        return;
    }

    const summaryRow = e.target.closest('.order-summary-row');
    if (summaryRow) {
        const detailsRow = summaryRow.nextElementSibling;
        if (detailsRow && detailsRow.classList.contains('order-details-row')) {
            summaryRow.classList.toggle('details-open');
            detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
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