import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDocs, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');

let currentEditingProductId = null;
let existingImageUrls = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    try {
        console.log("Verificando permissões para o UID:", user.uid);
        const roleRef = doc(db, 'roles', user.uid);
        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists() || !roleSnap.data().admin) {
            showToast('Acesso negado. Apenas administradores.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
        } else {
            console.log("Permissões de administrador confirmadas.");
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
                    <button class="action-btn-icon edit" data-id="${docSnap.id}">...</button>
                    <button class="action-btn-icon delete" data-id="${docSnap.id}">...</button>
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
            const uploadPromises = Array.from(files).map(async (file) => {
                const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                const storageRef = ref(storage, `products/${uniqueId}-${file.name}`);
                console.log('Iniciando upload para:', storageRef.fullPath);
                await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(storageRef);
                console.log('Upload concluído, URL:', downloadUrl);
                return downloadUrl;
            });
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls.push(...newImageUrls);
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

logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});