import { requireAdmin } from './auth.js';
import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, toCents, showNotification } from './utils.js'; // Importa a nova função

await requireAdmin();

const form = document.getElementById('product-form');
const formTitle = document.querySelector('.admin-section-title');
const tableBody = document.querySelector('#products-table tbody');
const ordersBody = document.querySelector('#orders-table tbody');
const imageInput = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');

let editingProductId = null;
let existingImageUrls = [];
let selectedFiles = [];

const hiddenIdInput = document.createElement('input');
hiddenIdInput.type = 'hidden';
hiddenIdInput.name = 'productId';
form.appendChild(hiddenIdInput);

const cancelEditButton = document.createElement('button');
cancelEditButton.type = 'button';
cancelEditButton.textContent = 'Cancelar Edição';
cancelEditButton.className = 'cancel-btn';
cancelEditButton.style.display = 'none';
form.querySelector('button[type="submit"]').insertAdjacentElement('afterend', cancelEditButton);

cancelEditButton.addEventListener('click', () => {
    editingProductId = null;
    form.reset();
    hiddenIdInput.value = '';
    formTitle.textContent = 'Adicionar Produto';
    cancelEditButton.style.display = 'none';
    imagePreviewContainer.innerHTML = '';
    existingImageUrls = [];
    selectedFiles = [];
});

imageInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    renderImagePreviews();
});

function renderImagePreviews() {
    imagePreviewContainer.innerHTML = '';
    existingImageUrls.forEach((url, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `<img src="${url}" alt="Pré-visualização da imagem ${index + 1}"><button type="button" class="remove-img-btn" data-url="${url}">&times;</button>`;
        imagePreviewContainer.appendChild(previewItem);
    });
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `<img src="${e.target.result}" alt="Pré-visualização de ${file.name}"><button type="button" class="remove-img-btn" data-index="${index}">&times;</button>`;
            imagePreviewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

imagePreviewContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-img-btn')) {
        const url = e.target.dataset.url;
        const index = e.target.dataset.index;
        if (url) existingImageUrls = existingImageUrls.filter(imageUrl => imageUrl !== url);
        if (index) selectedFiles.splice(parseInt(index), 1);
        renderImagePreviews();
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A guardar...';

    try {
        const uploadPromises = selectedFiles.map(file => {
            const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
            return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        const newImageUrls = await Promise.all(uploadPromises);
        const allImageUrls = [...existingImageUrls, ...newImageUrls];
        if (allImageUrls.length === 0) {
            showNotification('Por favor, adicione pelo menos uma imagem ao produto.', 'error');
            throw new Error('Nenhuma imagem fornecida.');
        }

        const productData = {
            name: form.name.value,
            description: form.description.value,
            price: toCents(form.price.value),
            stock: parseInt(form.stock.value),
            category: form.category.value,
            imageUrls: allImageUrls,
            updatedAt: serverTimestamp(),
        };

        if (editingProductId) {
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
        }

        showNotification(`Produto ${editingProductId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        cancelEditButton.click();

    } catch (err) {
        console.error("Erro ao guardar o produto:", err);
        if (err.message !== 'Nenhuma imagem fornecida.') {
            showNotification('Ocorreu um erro ao guardar o produto.', 'error');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});

function renderProducts() {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        tableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const p = { id: docSnap.id, ...docSnap.data() };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.imageUrls?.[0] || 'https://placehold.co/50x50'}" alt="${p.name}"></td>
                <td>${p.name}</td>
                <td>${BRL(p.price)}</td>
                <td>${p.stock}</td>
                <td class="actions-cell">
                    <button class="action-btn edit" data-id="${p.id}">Editar</button>
                    <button class="action-btn delete" data-id="${p.id}">Excluir</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    });
}

tableBody.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const id = button.dataset.id;
    const productRef = doc(db, 'products', id);

    if (button.classList.contains('edit')) {
        const docSnap = await getDoc(productRef);
        if (docSnap.exists()) {
            const product = docSnap.data();
            form.name.value = product.name;
            form.description.value = product.description;
            form.price.value = (product.price / 100).toFixed(2).replace('.', ',');
            form.stock.value = product.stock;
            form.category.value = product.category;
            hiddenIdInput.value = id;
            editingProductId = id;
            existingImageUrls = product.imageUrls || [];
            selectedFiles = [];
            renderImagePreviews();
            formTitle.textContent = 'A Editar Produto';
            cancelEditButton.style.display = 'inline-block';
            window.scrollTo(0, 0);
        }
    } else if (button.classList.contains('delete')) {
        if (confirm('Tem a certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
            try {
                await deleteDoc(productRef);
                showNotification('Produto excluído com sucesso.', 'success');
            } catch (err) {
                console.error("Erro ao excluir produto:", err);
                showNotification('Ocorreu um erro ao excluir o produto.', 'error');
            }
        }
    }
});

function renderOrders() {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        ordersBody.innerHTML = '';
        snapshot.forEach(doc => {
            const o = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            const itemsTxt = o.items.map(i => `${i.qty}x ${i.name}`).join('<br>');
            const statusMap = {
                pending: { text: 'Pendente', class: 'pending' },
                sent: { text: 'Enviado', class: 'sent' },
                canceled: { text: 'Cancelado', class: 'canceled' }
            };
            const currentStatus = statusMap[o.status] || { text: o.status, class: '' };
            tr.innerHTML = `
                <td>${o.customer?.name || 'N/A'}</td>
                <td>${itemsTxt}</td>
                <td>${BRL(o.total)}</td>
                <td><span class="order-status-badge status-${currentStatus.class}">${currentStatus.text}</span></td>
                <td class="actions-cell">
                    <button class="action-btn sent" data-act="sent" data-id="${o.id}">Marcar Enviado</button>
                    <button class="action-btn cancel" data-act="cancel" data-id="${o.id}">Cancelar</button>
                </td>
            `;
            tr.querySelector('.actions-cell').addEventListener('click', async (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                const action = btn.dataset.act;
                const status = action === 'sent' ? 'enviado' : 'cancelado';
                if (confirm(`Tem a certeza que deseja marcar este pedido como ${status.toUpperCase()}?`)) {
                    await updateDoc(doc(db, 'orders', id), { status: action });
                }
            });
            ordersBody.appendChild(tr);
        });
    });
}

renderProducts();
renderOrders();
