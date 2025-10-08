import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDocs, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, showToast, showConfirmation } from './utils.js';

// --- Seletores de DOM ---
const storage = getStorage();
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');
// ✅ NOVOS Seletores para o Corretor de Imagens
const startImageFixButton = document.getElementById('start-image-fix');
const imageFixerContainer = document.getElementById('image-fixer-container');
const imageFixerTableBody = document.querySelector('#image-fixer-table tbody');

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
            loadOrders();
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
    const q = query(productsRef, orderBy("name"));
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
                <td class="actions-cell">
                    <button class="action-btn-icon edit" data-id="${docSnap.id}" title="Editar produto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="action-btn-icon delete" data-id="${docSnap.id}" title="Apagar produto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

const loadOrders = () => {
    // ... (código inalterado)
};


// --- ✅ NOVA FUNCIONALIDADE: CORRETOR DE IMAGENS ---

// Inicia a verificação de imagens quebradas
const startImageFixer = async () => {
    startImageFixButton.disabled = true;
    startImageFixButton.textContent = 'A procurar...';
    imageFixerContainer.style.display = 'block';
    imageFixerTableBody.innerHTML = '<tr><td colspan="3">A verificar produtos...</td></tr>';

    try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        const brokenProducts = [];

        snapshot.forEach(doc => {
            const product = doc.data();
            // Um URL "quebrado" é um que não começa com http (o URL de download do Storage)
            const hasBrokenImage = !product.imageUrls || product.imageUrls.some(url => !url.startsWith('http'));
            if (hasBrokenImage) {
                brokenProducts.push({ id: doc.id, ...product });
            }
        });

        renderBrokenProducts(brokenProducts);

    } catch (error) {
        console.error("Erro ao procurar imagens quebradas:", error);
        showToast('Erro ao procurar produtos.', 'error');
        imageFixerTableBody.innerHTML = '<tr><td colspan="3">Ocorreu um erro.</td></tr>';
    } finally {
        startImageFixButton.disabled = false;
        startImageFixButton.textContent = 'Procurar Imagens Quebradas Novamente';
    }
};

// Renderiza a lista de produtos com imagens a corrigir
const renderBrokenProducts = (products) => {
    imageFixerTableBody.innerHTML = '';
    if (products.length === 0) {
        imageFixerTableBody.innerHTML = '<tr><td colspan="3">Nenhum produto com imagem quebrada encontrado!</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.dataset.productId = product.id;
        tr.innerHTML = `
            <td>${product.name}</td>
            <td><input type="file" class="image-fix-input" accept="image/*" /></td>
            <td><button class="submit-btn fix-btn">Atualizar Imagem</button></td>
        `;
        imageFixerTableBody.appendChild(tr);
    });
};

// Processa a atualização de uma única imagem
const handleImageFix = async (e) => {
    if (!e.target.classList.contains('fix-btn')) return;

    const button = e.target;
    const row = button.closest('tr');
    const productId = row.dataset.productId;
    const fileInput = row.querySelector('.image-fix-input');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Por favor, escolha um ficheiro de imagem primeiro.', 'error');
        return;
    }

    button.disabled = true;
    button.textContent = 'A atualizar...';

    try {
        // 1. Apagar imagem antiga se existir (opcional, mas boa prática)
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
            const oldData = productSnap.data();
            if (oldData.imageUrls && oldData.imageUrls.length > 0) {
                for (const url of oldData.imageUrls) {
                    // Só tenta apagar se for um URL de storage válido
                    if (url.startsWith('http')) {
                       await deleteObject(ref(storage, url)).catch(err => console.warn("Falha ao apagar imagem antiga:", err));
                    } 
                }
            }
        }

        // 2. Fazer upload da nova imagem
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // 3. Atualizar o produto na base de dados com o novo URL
        await updateDoc(productRef, {
            imageUrls: [downloadURL]
        });

        showToast(`Imagem do produto ${productSnap.data().name} atualizada!`, 'success');
        row.remove(); // Remove a linha da tabela após o sucesso

    } catch (error) {
        console.error("Erro ao corrigir imagem:", error);
        showToast('Falha ao atualizar a imagem.', 'error');
        button.disabled = false;
        button.textContent = 'Atualizar Imagem';
    }
};


// --- Listeners de Eventos ---
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

imageUpload.addEventListener('change', (e) => {
    // ... (código inalterado)
});

ordersTableBody.addEventListener('click', async (e) => {
    // ... (código inalterado)
});

productsTableBody.addEventListener('click', async (e) => {
    // ... (código inalterado)
});

productForm.addEventListener('submit', async (e) => {
    // ... (código inalterado)
});

// ✅ NOVOS Listeners para o Corretor de Imagens
startImageFixButton.addEventListener('click', startImageFixer);
imageFixerTableBody.addEventListener('click', handleImageFix);
