import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getStorage, ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { showToast, showConfirmation } from './utils.js'; // Importa as novas funções

const storage = getStorage();

// --- VARIÁVEIS GLOBAIS E ELEMENTOS DO DOM ---
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');

let currentEditingProductId = null; 
let existingImageUrls = []; 

// --- FUNÇÕES AUXILIARES ---
const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
};

// --- LÓGICA PRINCIPAL ---
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
            loadOrders();
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        showToast('Erro ao verificar permissões.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

imageUpload.addEventListener('change', (e) => {
    imagePreviewContainer.innerHTML = ''; 
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            imagePreviewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

const loadProducts = () => {
    const productsRef = collection(db, 'products');
    onSnapshot(productsRef, (snapshot) => {
        productsTableBody.innerHTML = ''; 
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.imageUrls[0]}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="action-btn edit" data-id="${docSnap.id}">Editar</button>
                    <button class="action-btn delete" data-id="${docSnap.id}">Apagar</button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

const loadOrders = () => {
    const ordersRef = collection(db, 'orders');
    onSnapshot(ordersRef, (snapshot) => {
        ordersTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${docSnap.id.substring(0, 8)}...</td>
                <td>${order.userEmail || 'Não disponível'}</td>
                <td>${order.items.length}</td>
                <td>${formatPrice(order.total)}</td>
                <td>${order.status}</td>
                <td><button class="view-order-btn" data-id="${docSnap.id}">Detalhes</button></td>
            `;
            ordersTableBody.appendChild(tr);
        });
    });
};

productsTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');

    if (target.classList.contains('delete')) {
        const confirmed = await showConfirmation('Tem a certeza?', 'Esta ação não pode ser revertida!');
        if (confirmed) {
            try {
                const productRef = doc(db, 'products', id);
                const productSnap = await getDoc(productRef);
                if(productSnap.exists()) {
                    const productData = productSnap.data();
                    for (const url of productData.imageUrls) {
                        const imageRef = ref(storage, url);
                        await deleteObject(imageRef).catch(err => console.warn("Falha ao apagar imagem antiga:", err));
                    }
                }
                await deleteDoc(productRef);
                showToast('Produto apagado com sucesso!');
            } catch (error) {
                console.error('Erro ao apagar produto:', error);
                showToast('Falha ao apagar o produto.', 'error');
            }
        }
    }

    if (target.classList.contains('edit')) {
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        const product = productSnap.data();

        productForm.name.value = product.name;
        productForm.description.value = product.description;
        productForm.price.value = product.price.toFixed(2).replace('.', ',');
        productForm.stock.value = product.stock;
        productForm.category.value = product.category;
        
        imagePreviewContainer.innerHTML = '';
        product.imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            imagePreviewContainer.appendChild(img);
        });
        
        currentEditingProductId = id;
        existingImageUrls = product.imageUrls;
        productForm.querySelector('button[type="submit"]').textContent = 'Atualizar Produto';
        window.scrollTo(0, 0);
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = productForm.querySelector('button[type="submit"]');
    const isEditing = !!currentEditingProductId;

    submitButton.disabled = true;
    submitButton.textContent = isEditing ? 'A atualizar...' : 'A guardar...';

    try {
        let imageUrls = existingImageUrls;
        const files = imageUpload.files;

        if (files.length > 0) {
            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
            }

            const uploadUrl = 'https://us-central1-olomi-7816a.cloudfunctions.net/uploadFile';
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.error || 'Falha no upload do arquivo.');
            }

            const result = await response.json();
            imageUrls = result.imageUrls;

            if (isEditing) {
                 for (const url of existingImageUrls) {
                    await deleteObject(ref(storage, url)).catch(err => console.warn("Falha ao apagar imagem antiga:", err));
                }
            }
        }

        const productData = {
            name: productForm.name.value,
            description: productForm.description.value,
            price: parseFloat(productForm.price.value.replace(',', '.')),
            stock: parseInt(productForm.stock.value),
            category: productForm.category.value,
            imageUrls: imageUrls
        };

        if (isEditing) {
            await updateDoc(doc(db, 'products', currentEditingProductId), productData);
            showToast('Produto atualizado com sucesso!');
        } else {
            await addDoc(collection(db, 'products'), { ...productData, createdAt: new Date() });
            showToast('Produto adicionado com sucesso!');
        }

        productForm.reset();
        imagePreviewContainer.innerHTML = '';
        currentEditingProductId = null;
        existingImageUrls = [];

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showToast(`Falha ao salvar produto: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});
