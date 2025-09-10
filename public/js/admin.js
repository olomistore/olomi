import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js';

// --- VARIÁVEIS GLOBAIS E ELEMENTOS DO DOM ---
const productForm = document.getElementById('product-form');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const logoutButton = document.getElementById('logout');

let currentEditingProductId = null; // Guarda o ID do produto em edição
let existingImageUrls = []; // Guarda os URLs das imagens do produto em edição

// --- FUNÇÕES AUXILIARES ---

// Formata o preço para exibição na tabela
const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
};

// --- LÓGICA PRINCIPAL ---

// Verifica a autenticação do utilizador e as suas permissões
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const roleRef = doc(db, 'roles', user.uid);
        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists() || !roleSnap.data().admin) {
            alert('Acesso negado. Apenas administradores podem aceder a esta página.');
            window.location.href = 'index.html';
        } else {
            // Utilizador é admin, carregar dados
            loadProducts();
            loadOrders();
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        window.location.href = 'index.html';
    }
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// Pré-visualização de imagens
imageUpload.addEventListener('change', (e) => {
    imagePreviewContainer.innerHTML = ''; // Limpa as pré-visualizações
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

// Carregar e exibir produtos na tabela
const loadProducts = () => {
    const productsRef = collection(db, 'products');
    onSnapshot(productsRef, (snapshot) => {
        productsTableBody.innerHTML = ''; // Limpa a tabela antes de preencher
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.imageUrls[0]}" alt="${product.name}" width="50"></td>
                <td>${product.name}</td>
                <td>${formatPrice(product.price)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="edit-btn" data-id="${docSnap.id}">Editar</button>
                    <button class="delete-btn" data-id="${docSnap.id}">Apagar</button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });
    });
};

// Carregar e exibir pedidos na tabela
const loadOrders = () => {
    const ordersRef = collection(db, 'orders');
    onSnapshot(ordersRef, (snapshot) => {
        ordersTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const tr = document.createElement('tr');
            // Simplificado - pode ser expandido com mais detalhes
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

// Lidar com cliques na tabela de produtos (delegação de eventos)
productsTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');

    if (target.classList.contains('delete-btn')) {
        if (confirm('Tem a certeza de que deseja apagar este produto? Esta ação não pode ser desfeita.')) {
            try {
                // Apagar imagens do Storage e depois o documento do Firestore
                const productRef = doc(db, 'products', id);
                const productSnap = await getDoc(productRef);
                const productData = productSnap.data();
                for (const url of productData.imageUrls) {
                    const imageRef = ref(storage, url);
                    await deleteObject(imageRef);
                }
                await deleteDoc(productRef);
                alert('Produto apagado com sucesso!');
            } catch (error) {
                console.error('Erro ao apagar produto:', error);
                alert('Falha ao apagar o produto.');
            }
        }
    }

    if (target.classList.contains('edit-btn')) {
        // Preencher o formulário com os dados do produto para edição
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        const product = productSnap.data();

        productForm.name.value = product.name;
        productForm.description.value = product.description;
        productForm.price.value = product.price.toFixed(2).replace('.', ',');
        productForm.stock.value = product.stock;
        productForm.category.value = product.category;
        
        imagePreviewContainer.innerHTML = ''; // Limpar preview
        product.imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            imagePreviewContainer.appendChild(img);
        });
        
        currentEditingProductId = id;
        existingImageUrls = product.imageUrls;
        productForm.querySelector('button[type="submit"]').textContent = 'Atualizar Produto';
        window.scrollTo(0, 0); // Rolar para o topo da página
    }
});

// Submissão do formulário (para adicionar ou editar)
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = productForm.querySelector('button[type="submit"]');
    const isEditing = !!currentEditingProductId;

    submitButton.disabled = true;
    submitButton.textContent = isEditing ? 'A atualizar...' : 'A guardar...';

    try {
        let imageUrls = existingImageUrls;
        const files = imageUpload.files;

        // Se novas imagens foram selecionadas, faz o upload delas
        if (files.length > 0) {
            if(isEditing) { // Se está editando, apaga as imagens antigas
                 for (const url of existingImageUrls) {
                    await deleteObject(ref(storage, url));
                }
            }
            imageUrls = []; // Zera o array para receber as novas URLs
            for (const file of files) {
                const imageRef = ref(storage, `products/${Date.now()}-${file.name}`);
                await uploadBytes(imageRef, file);
                imageUrls.push(await getDownloadURL(imageRef));
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
            // Atualiza o documento existente
            await updateDoc(doc(db, 'products', currentEditingProductId), productData);
            alert('Produto atualizado com sucesso!');
        } else {
            // Adiciona um novo documento
            await addDoc(collection(db, 'products'), { ...productData, createdAt: new Date() });
            alert('Produto adicionado com sucesso!');
        }

        // Limpa o estado de edição e o formulário
        productForm.reset();
        imagePreviewContainer.innerHTML = '';
        currentEditingProductId = null;
        existingImageUrls = [];
        submitButton.textContent = 'Salvar Produto';

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert(`Falha ao salvar produto: ${error.message}`);
    } finally {
        submitButton.disabled = false;
    }
});
