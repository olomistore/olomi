import { requireAdmin } from './auth.js';
import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, toCents } from './utils.js';

await requireAdmin();

const form = document.getElementById('product-form');
const formTitle = document.querySelector('.admin-section-title');
const tableBody = document.querySelector('#products-table tbody');
const ordersBody = document.querySelector('#orders-table tbody');
const imageInput = form.querySelector('input[name="image"]');
let allProducts = []; // Guarda os produtos para a função de edição

// --- LÓGICA DE EDIÇÃO ---
let editingProductId = null; // Guarda o ID do produto que está a ser editado

// Cria um campo oculto para guardar o ID do produto
const hiddenIdInput = document.createElement('input');
hiddenIdInput.type = 'hidden';
hiddenIdInput.name = 'productId';
form.appendChild(hiddenIdInput);

// Cria um botão para cancelar a edição
const cancelEditButton = document.createElement('button');
cancelEditButton.type = 'button';
cancelEditButton.textContent = 'Cancelar Edição';
cancelEditButton.className = 'cancel-btn';
cancelEditButton.style.display = 'none';
form.querySelector('button[type="submit"]').insertAdjacentElement('afterend', cancelEditButton);

// Cria o elemento de pré-visualização da imagem
const imagePreview = document.createElement('img');
imagePreview.style.cssText = 'max-width: 100px; max-height: 100px; margin-top: 10px; display: none; border-radius: 8px;';
imageInput.parentNode.insertBefore(imagePreview, imageInput.nextSibling);

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = 'none';
    }
});


function switchToEditMode(product) {
    editingProductId = product.id;
    hiddenIdInput.value = product.id;

    // Preenche o formulário com os dados do produto
    form.name.value = product.name;
    form.description.value = product.description;
    form.price.value = (product.price / 100).toFixed(2);
    form.category.value = product.category;
    form.stock.value = product.stock;
    
    // Mostra a pré-visualização da imagem existente
    imagePreview.src = product.imageUrl;
    imagePreview.style.display = product.imageUrl ? 'block' : 'none';

    // Altera a interface para o modo de edição
    formTitle.textContent = 'Editar Produto';
    form.querySelector('button[type="submit"]').textContent = 'Atualizar Produto';
    cancelEditButton.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchToCreateMode() {
    editingProductId = null;
    form.reset();
    hiddenIdInput.value = '';
    imagePreview.style.display = 'none';
    formTitle.textContent = 'Adicionar Novo Produto';
    form.querySelector('button[type="submit"]').textContent = 'Salvar Produto';
    cancelEditButton.style.display = 'none';
}

cancelEditButton.addEventListener('click', switchToCreateMode);

async function handleUpload(file) {
    if (!file) return '';
    const fileRef = ref(storage, `product-images/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
}

// --- LÓGICA DO FORMULÁRIO (AGORA COMBINA CRIAR E EDITAR) ---
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A guardar...';

    const data = Object.fromEntries(new FormData(form).entries());
    const productData = {
        name: data.name,
        description: data.description || '',
        price: toCents(data.price),
        category: data.category || '',
        stock: parseInt(data.stock || '0'),
        updatedAt: serverTimestamp(),
    };

    try {
        // Se uma nova imagem for selecionada, faz o upload dela
        if (form.image.files[0]) {
            productData.imageUrl = await handleUpload(form.image.files[0]);
        }

        if (editingProductId) {
            // MODO DE ATUALIZAÇÃO
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Produto atualizado com sucesso!');
        } else {
            // MODO DE CRIAÇÃO
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            alert('Produto guardado com sucesso!');
        }
        switchToCreateMode();
    } catch (err) {
        console.error("Erro ao guardar o produto:", err);
        alert('Erro ao guardar o produto: ' + err.message);
    } finally {
        submitButton.disabled = false;
        // O texto do botão é reposto pela função switchToCreateMode
    }
});


// --- RENDERIZAÇÃO DA TABELA (COM LÓGICA DE EDIÇÃO) ---
function renderProducts() {
    const qy = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(qy, (snap) => {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        allProducts = []; // Limpa e preenche novamente a lista de produtos
        snap.forEach(d => {
            const p = { id: d.id, ...d.data() };
            allProducts.push(p); // Adiciona à lista
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.imageUrl || 'https://placehold.co/100x100/f39c12/fff?text=Olomi'}" alt="${p.name}"></td>
                <td>${p.name}</td>
                <td>${BRL(p.price)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="action-btn delete" data-act="del" data-id="${p.id}">Excluir</button>
                    <button class="action-btn edit" data-act="edit" data-id="${p.id}">Editar</button>
                </td>
            `;
            tr.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.act === 'del') {
                    if (confirm('Tem a certeza que deseja excluir?')) await deleteDoc(doc(db, 'products', id));
                } else if (btn.dataset.act === 'edit') {
                    // Procura o produto na lista e entra no modo de edição
                    const productToEdit = allProducts.find(prod => prod.id === id);
                    if (productToEdit) switchToEditMode(productToEdit);
                }
            });
            tableBody.appendChild(tr);
        });
    });
}

function renderOrders() {
    const qy = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

    onSnapshot(qy, (snap) => {
        if (!ordersBody) return;
        ordersBody.innerHTML = '';

        const statusMap = {
            pending: { text: 'Pendente', class: 'pending' },
            sent: { text: 'Enviado', class: 'sent' },
            canceled: { text: 'Cancelado', class: 'canceled' }
        };

        snap.forEach(docu => {
            const o = { id: docu.id, ...docu.data() };
            const tr = document.createElement('tr');
            const itemsTxt = o.items.map(i => `${i.qty}x ${i.name}`).join('<br>');
            
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

            tr.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;

                const id = btn.dataset.id;
                const action = btn.dataset.act;

                if (action === 'sent') {
                    if (confirm('Tem a certeza que deseja marcar este pedido como ENVIADO?')) {
                        await updateDoc(doc(db, 'orders', id), { status: 'sent' });
                    }
                } else if (action === 'cancel') {
                    if (confirm('Tem a certeza que deseja CANCELAR este pedido? Esta ação não pode ser desfeita.')) {
                        await updateDoc(doc(db, 'orders', id), { status: 'canceled' });
                    }
                }
            });
            ordersBody.appendChild(tr);
        });
    });
}

renderProducts();
renderOrders();
