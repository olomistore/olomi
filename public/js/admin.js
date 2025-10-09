import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

// --- DOM ELEMENTS ---
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');

// --- APPLICATION STATE ---
let currentEditingProductId = null;
let existingImageUrls = [];
let ordersLoaded = false;

const formatStatus = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'pending' || s === 'pendente') {
        return { text: 'Pendente', className: 'pendente' };
    }
    if (s === 'enviado' || s === 'shipped') {
        return { text: 'Enviado', className: 'enviado' };
    }
    if (s === 'cancelled' || s === 'cancelado') {
        return { text: 'Cancelado', className: 'cancelado' };
    }
    return { text: status || 'Desconhecido', className: 'unknown' };
};

// --- AUTHENTICATION & INITIAL SETUP ---
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

// --- COLLAPSIBLE SECTIONS LOGIC ---
const setupCollapsibleSections = () => {
    document.querySelectorAll('.collapsible-section').forEach(section => {
        const trigger = section.querySelector('.collapsible-trigger');
        trigger.addEventListener('click', () => {
            const isAlreadyActive = section.classList.contains('active');
            document.querySelectorAll('.collapsible-section').forEach(s => {
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

// --- DATA LOADING ---
const loadProducts = () => {
    const q = query(collection(db, 'products'), orderBy("createdAt", "desc"));
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
                ? getResizedImageUrl(product.imageUrls[0]) // ✅ USA IMAGEM OTIMIZADA
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
    const q = query(collection(db, 'orders'), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        ordersTableBody.innerHTML = '';
        if (snapshot.empty) {
            ordersTableBody.innerHTML = `<tr><td colspan="6">Nenhum pedido recebido.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const formattedStatus = formatStatus(order.status);
            const isActionable = formattedStatus.className === 'pendente';
            const summaryRow = document.createElement('tr');
            summaryRow.className = 'order-summary-row';
            summaryRow.innerHTML = `
                <td>${docSnap.id.substring(0, 8)}...</td>
                <td>${order.customer?.name || 'N/A'}</td>
                <td>${order.createdAt.toDate().toLocaleDateString('pt-BR')}</td>
                <td>${BRL(order.total)}</td>
                <td><span class="status ${formattedStatus.className}">${formattedStatus.text}</span></td>
                <td class="order-actions">
                    <button class="action-btn ship" data-id="${docSnap.id}" ${!isActionable ? 'disabled' : ''}>Marcar Enviado</button>
                    <button class="action-btn cancel" data-id="${docSnap.id}" ${!isActionable ? 'disabled' : ''}>Cancelar</button>
                </td>
            `;
            ordersTableBody.appendChild(summaryRow);
            // ... (código dos detalhes do pedido omitido por brevidado)
        });
    });
};

// --- ✨ NOVO: LÓGICA DE PRÉ-VISUALIZAÇÃO DE IMAGEM ---
imageUpload.addEventListener('change', (e) => {
    // 1. Limpa apenas as pré-visualizações de seleções ANTERIORES, mantendo as imagens já salvas.
    imagePreviewContainer.querySelectorAll('.new-preview').forEach(el => el.remove());

    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 2. Cria e exibe uma pré-visualização para cada novo arquivo selecionado.
    Array.from(files).forEach(file => {
        const container = document.createElement('div');
        container.className = 'image-preview new-preview'; // Marca como uma nova pré-visualização

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file); // Gera uma URL local para a imagem
        
        // A URL do objeto é revogada automaticamente pelo navegador quando a página é descarregada.
        container.appendChild(img);
        imagePreviewContainer.appendChild(container);
    });
});

// --- FORMULÁRIO DE PRODUTO ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';

    try {
        const form = e.target;
        const productData = {
            name: form.name.value.trim(),
            description: form.description.value.trim(),
            category: form.category.value.trim(),
            price: parseFloat(form.price.value.replace(',', '.').trim()),
            stock: parseInt(form.stock.value, 10)
        };

        if (!productData.name || isNaN(productData.price) || isNaN(productData.stock)) {
            throw new Error('Por favor, preencha todos os campos com valores válidos.');
        }

        const files = imageUpload.files;
        let imageUrls = [...existingImageUrls]; // Começa com as imagens já existentes

        // Se novos arquivos foram selecionados, faz o upload deles.
        if (files.length > 0) {
            showToast('Enviando imagens...', 'info');
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('file', file));

            const response = await fetch('https://us-central1-olomi-7816a.cloudfunctions.net/uploadFile', { 
                method: 'POST', 
                body: formData 
            });

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

        productData.imageUrls = imageUrls;

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
    imagePreviewContainer.innerHTML = ''; // Limpa todas as pré-visualizações
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

    if (target.classList.contains('edit')) handleEditClick(productId);
    if (target.classList.contains('delete')) handleDeleteClick(productId);
});

const handleEditClick = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'products', id));
        if (docSnap.exists()) {
            const product = docSnap.data();
            productForm.name.value = product.name;
            productForm.description.value = product.description;
            productForm.category.value = product.category;
            productForm.price.value = product.price.toString().replace('.', ',');
            productForm.stock.value = product.stock;

            imagePreviewContainer.innerHTML = ''; // Limpa a área antes de adicionar as imagens existentes
            existingImageUrls = product.imageUrls || [];
            existingImageUrls.forEach(url => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-preview';
                // ✅ USA IMAGEM OTIMIZADA para as imagens existentes
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
    if (!await showConfirmation('Tem certeza que deseja excluir este produto?')) return;

    try {
        const productRef = doc(db, 'products', id);
        const docSnap = await getDoc(productRef);
        if (docSnap.exists()) {
            const product = docSnap.data();
            if (product.imageUrls && product.imageUrls.length > 0) {
                showToast('Excluindo imagens associadas...', 'info');
                const deletePromises = product.imageUrls.map(url => {
                    try {
                        return deleteObject(ref(storage, url));
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

// --- AÇÕES DA TABELA DE PEDIDOS (Lógica existente) ---
ordersTableBody.addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('.action-btn');
    if (actionBtn) {
        const orderId = actionBtn.dataset.id;
        if (actionBtn.classList.contains('ship')) {
            if (await showConfirmation('Marcar este pedido como enviado?')) {
                await updateDoc(doc(db, 'orders', orderId), { status: 'Enviado' });
                showToast('Pedido marcado como enviado.', 'success');
            }
        }
        if (actionBtn.classList.contains('cancel')) {
            if (await showConfirmation('Cancelar este pedido?')) {
                await updateDoc(doc(db, 'orders', orderId), { status: 'Cancelado' });
                showToast('Pedido cancelado.', 'success');
            }
        }
    } else {
        const summaryRow = e.target.closest('.order-summary-row');
        if (summaryRow) {
            const detailsRow = summaryRow.nextElementSibling;
            if (detailsRow) {
                summaryRow.classList.toggle('details-open');
                detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
            }
        }
    }
});

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