import { requireAdmin } from './auth.js'; // Importa a função de segurança
import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { BRL, toCents } from './utils.js';

// A LINHA MAIS IMPORTANTE: Bloqueia o acesso imediato se não for administrador
await requireAdmin();

const form = document.getElementById('product-form');
const tableBody = document.querySelector('#products-table tbody');
const ordersBody = document.querySelector('#orders-table tbody');
const imageInput = form.querySelector('input[name="image"]');

// --- MELHORIA: Pré-visualização da Imagem ---
const imagePreview = document.createElement('img');
imagePreview.style.maxWidth = '100px';
imagePreview.style.maxHeight = '100px';
imagePreview.style.marginTop = '10px';
imagePreview.style.display = 'none';
imagePreview.style.borderRadius = '8px';
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

async function handleUpload(file) {
    if (!file) return '';
    const fileRef = ref(storage, `product-images/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
}

form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A guardar...';

    const data = Object.fromEntries(new FormData(form).entries());
    try {
        const imageUrl = await handleUpload(form.image.files[0]);
        await addDoc(collection(db, 'products'), {
            name: data.name,
            description: data.description || '',
            price: toCents(data.price),
            category: data.category || '',
            stock: parseInt(data.stock || '0'),
            imageUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        form.reset();
        imagePreview.style.display = 'none';
        alert('Produto guardado com sucesso!');
    } catch (err) {
        console.error("Erro ao guardar o produto:", err);
        alert('Erro ao guardar o produto: ' + err.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Produto';
    }
});

function renderProducts() {
    const qy = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(qy, (snap) => {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        snap.forEach(d => {
            const p = { id: d.id, ...d.data() };
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
                    if (confirm('Tem a certeza que deseja excluir?')) {
                        await deleteDoc(doc(db, 'products', id));
                    }
                } else if (btn.dataset.act === 'edit') {
                    const novoPreco = prompt('Novo preço (R$):', (p.price / 100).toFixed(2));
                    if (novoPreco) {
                        await updateDoc(doc(db, 'products', id), {
                            price: toCents(novoPreco),
                            updatedAt: serverTimestamp()
                        });
                    }
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
        snap.forEach(docu => {
            const o = { id: docu.id, ...docu.data() };
            const tr = document.createElement('tr');
            const itemsTxt = o.items.map(i => `${i.qty}x ${i.name}`).join(', ');
            tr.innerHTML = `
                <td>${o.customer?.name || ''}</td>
                <td>${itemsTxt}</td>
                <td>${BRL(o.total)}</td>
                <td>${o.status}</td>
                <td>
                    <button data-act="status" data-id="${o.id}">Marcar enviado</button>
                </td>
            `;
            tr.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.act === 'status') {
                    await updateDoc(doc(db, 'orders', id), { status: 'sent' });
                }
            });
            ordersBody.appendChild(tr);
        });
    });
}

renderProducts();
renderOrders();
