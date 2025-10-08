
import { auth, db, storage } from './firebase.js'; // CORREÇÃO: Importar a instância de storage correta
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDocs, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
// CORREÇÃO: A linha abaixo foi removida pois `storage` já foi importado
// import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

// --- Seletores de DOM ---
// CORREÇÃO: A linha abaixo foi removida pois `storage` já é uma instância importada
// const storage = getStorage(); 
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');

let currentEditingProductId = null;
let existingImageUrls = [];

// --- Autenticação e Verificação de Permissões ---
onAuthStateChanged(auth, async (user) => {
    console.log("UID do utilizador autenticado:", user.uid);

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

// --- Funções Principais ---
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
                    <button class="action-btn-icon edit" data-id="${docSnap.id}" title="Editar produto">...</button>
                    <button class="action-btn-icon delete" data-id="${docSnap.id}" title="Apagar produto">...</button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

// --- Listener de Evento Principal: Salvar Produto ---
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
        
        const priceString = form.price.value.replace(',', '.').trim();
        const price = parseFloat(priceString);
        const stock = parseInt(form.stock.value, 10);

        if (!name || !category) {
            throw new Error('Nome e Categoria são campos obrigatórios.');
        }
        if (isNaN(price) || price < 0) {
            throw new Error('O preço inserido é inválido.');
        }
        if (isNaN(stock) || stock < 0) {
            throw new Error('A quantidade em stock é inválida.');
        }

        const files = imageUpload.files;
        let imageUrls = [...existingImageUrls];

        if (files.length > 0) {
            showToast('Enviando imagens... Isso pode levar um momento.', 'info');
            const uploadPromises = Array.from(files).map(async (file) => {
                const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                const storageRef = ref(storage, `products/${uniqueId}-${file.name}`);
                await uploadBytes(storageRef, file); // Esta chamada agora usará a instância autenticada
                return getDownloadURL(storageRef);
            });
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls.push(...newImageUrls);
        }

        if (imageUrls.length === 0) {
            throw new Error('O produto precisa de ter pelo menos uma imagem.');
        }

        const productData = {
            name,
            description,
            price,
            stock,
            category,
            imageUrls,
        };

        if (currentEditingProductId) {
            productData.updatedAt = serverTimestamp();
            const productRef = doc(db, 'products', currentEditingProductId);
            await updateDoc(productRef, productData);
            showToast('Produto atualizado com sucesso!', 'success');
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showToast('Produto cadastrado com sucesso!', 'success');
        }

        productForm.reset();
        imagePreviewContainer.innerHTML = '';
        currentEditingProductId = null;
        existingImageUrls = [];
        
    } catch (error) {
        console.error('ERRO AO SALVAR PRODUTO:', error);
        showToast(`Falha ao salvar: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});


// --- Outros Listeners ---
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});
