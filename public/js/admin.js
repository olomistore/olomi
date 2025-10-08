import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDocs, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation, getResizedImageUrl } from './utils.js';

// --- Seletores de DOM ---
const storage = getStorage();
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
            // loadOrders(); // Opcional: descomente se a função for necessária
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
    const q = query(productsRef, orderBy("createdAt", "desc")); // Ordenar por mais recente
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
        
        // ETAPA CRÍTICA: Converter e validar preço e stock.
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
        let imageUrls = [...existingImageUrls]; // Mantém imagens existentes ao editar

        // Upload de novas imagens, se houver.
        if (files.length > 0) {
            showToast('Enviando imagens... Isso pode levar um momento.', 'info');
            const uploadPromises = Array.from(files).map(async (file) => {
                const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                const storageRef = ref(storage, `products/${uniqueId}-${file.name}`);
                await uploadBytes(storageRef, file);
                return getDownloadURL(storageRef);
            });
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls.push(...newImageUrls);
        }

        if (imageUrls.length === 0) {
            throw new Error('O produto precisa de ter pelo menos uma imagem.');
        }

        // Monta o objeto final com os dados do produto.
        const productData = {
            name,
            description,
            price,
            stock,
            category,
            imageUrls,
        };

        if (currentEditingProductId) {
            // Atualiza um produto existente.
            productData.updatedAt = serverTimestamp();
            const productRef = doc(db, 'products', currentEditingProductId);
            await updateDoc(productRef, productData);
            showToast('Produto atualizado com sucesso!', 'success');
        } else {
            // Cria um novo produto.
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showToast('Produto cadastrado com sucesso!', 'success');
        }

        // Limpa o formulário e o estado de edição.
        productForm.reset();
        imagePreviewContainer.innerHTML = '';
        currentEditingProductId = null;
        existingImageUrls = [];
        
    } catch (error) {
        // ETAPA DE DIAGNÓSTICO: Exibe o erro exato na tela.
        console.error('ERRO AO SALVAR PRODUTO:', error);
        showToast(`Falha ao salvar: ${error.message}`, 'error');
    } finally {
        // Reativa o botão de salvar, independentemente do resultado.
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});


// --- Outros Listeners ---
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// Implementações futuras ou existentes para edição e exclusão podem ser adicionadas aqui.
