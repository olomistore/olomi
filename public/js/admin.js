import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getStorage, ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation } from './utils.js';

const storage = getStorage();

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
    const q = query(productsRef, orderBy("name")); // Ordena os produtos por nome
    onSnapshot(q, (snapshot) => {
        productsTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.imageUrls[0] || 'https://placehold.co/100x100/f39c12/fff?text=Olomi'}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>${BRL(product.price)}</td>
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
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        ordersTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const tr = document.createElement('tr');
            tr.dataset.orderId = docSnap.id;

            const orderDate = order.createdAt && order.createdAt.toDate 
                ? order.createdAt.toDate().toLocaleDateString('pt-BR') 
                : 'Pendente';

            let statusText = 'Pendente';
            let statusClass = 'pending';
            if (order.status === 'shipped') {
                statusText = 'Enviado';
                statusClass = 'shipped';
            } else if (order.status === 'cancelled') {
                statusText = 'Cancelado';
                statusClass = 'cancelled';
            }

            tr.innerHTML = `
                <td>${docSnap.id.substring(0, 6)}...</td>
                <td>${order.customer.name || 'Não disponível'}</td>
                <td>${orderDate}</td>
                <td>${BRL(order.total)}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td class="order-actions">
                    ${order.status === 'pending' ? 
                    `<button class="action-btn ship" data-id="${docSnap.id}">Marcar como Enviado</button>
                     <button class="action-btn cancel" data-id="${docSnap.id}">Cancelar Pedido</button>` : ''
                    }
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    });
};

ordersTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');
    if (!id) return;

    const orderRef = doc(db, 'orders', id);

    // ✅ CORREÇÃO: Texto do botão de confirmação personalizado
    if (target.classList.contains('ship')) {
        const confirmed = await showConfirmation('Marcar como Enviado?', 'O estado do pedido será alterado para "Enviado".', 'Sim, enviar');
        if (confirmed) {
            try {
                await updateDoc(orderRef, { status: 'shipped' });
                showToast('Pedido marcado como enviado!', 'success');
            } catch (error) {
                showToast('Erro ao atualizar o pedido.', 'error');
            }
        }
    }

    // ✅ CORREÇÃO: Texto do botão de confirmação personalizado
    if (target.classList.contains('cancel')) {
        const confirmed = await showConfirmation('Cancelar este Pedido?', 'Esta ação não pode ser revertida e o pedido será cancelado.', 'Sim, cancelar');
        if (confirmed) {
            try {
                await updateDoc(orderRef, { status: 'cancelled' });
                showToast('Pedido cancelado.', 'info');
            } catch (error) {
                showToast('Erro ao cancelar o pedido.', 'error');
            }
        }
    }
});

productsTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');

    // ✅ CORREÇÃO: Texto do botão de confirmação personalizado
    if (target.classList.contains('delete')) {
        const confirmed = await showConfirmation('Tem a certeza?', 'O produto será apagado permanentemente.', 'Sim, apagar');
        if (confirmed) {
            try {
                const productRef = doc(db, 'products', id);
                const productSnap = await getDoc(productRef);
                if(productSnap.exists()) {
                    const productData = productSnap.data();
                    if (productData.imageUrls && productData.imageUrls.length > 0) {
                        for (const url of productData.imageUrls) {
                            const imageRef = ref(storage, url);
                            await deleteObject(imageRef).catch(err => console.warn("Falha ao apagar imagem antiga:", err));
                        }
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
        productForm.price.value = product.price;
        productForm.stock.value = product.stock;
        productForm.category.value = product.category;
        
        imagePreviewContainer.innerHTML = '';
        if (product.imageUrls && product.imageUrls.length > 0) {
            product.imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                imagePreviewContainer.appendChild(img);
            });
        }
        
        currentEditingProductId = id;
        existingImageUrls = product.imageUrls || [];
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

            if (isEditing && existingImageUrls.length > 0) {
                 for (const url of existingImageUrls) {
                    await deleteObject(ref(storage, url)).catch(err => console.warn("Falha ao apagar imagem antiga:", err));
                }
            }
        }

        const productData = {
            name: productForm.name.value,
            description: productForm.description.value,
            price: parseFloat(productForm.price.value),
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
        imageUpload.value = '';
    }
});