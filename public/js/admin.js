import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDocs, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const logoutButton = document.getElementById('logout');

let currentEditingProductId = null;
let existingImageUrls = [];

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
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        showToast('Erro ao verificar permissões.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

const loadProducts = () => {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        productsTableBody.innerHTML = '';
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
                    <button class="action-btn-icon edit" data-id="${docSnap.id}">✏️</button>
                    <button class="action-btn-icon delete" data-id="${docSnap.id}">🗑️</button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

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

// --- FUNCIONALIDADE DE EDITAR E EXCLUIR RESTAURADA ---
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