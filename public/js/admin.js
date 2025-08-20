import { requireAdmin } from './auth.js';
import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3 / firebase - firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs / 10.12.3 / firebase - storage.js";
import { BRL, toCents } from './utils.js';
await requireAdmin();
const form = document.getElementById('product-form');
const tableBody = document.querySelector('#products-table tbody');
const ordersBody = document.querySelector('#orders-table tbody');
async function handleUpload(file) {
    if (!file) return '';
    const fileRef = ref(storage, `product-images/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(fileRef, file);
    return await getDownloadURL(snap.ref);
}
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
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
        alert('Produto cadastrado!');
    } catch (err) { alert('Erro: ' + err.message); }
});
function renderProducts() {
    const qy = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(qy, (snap) => {
        tableBody.innerHTML = '';
        snap.forEach(docu => {
            const p = { id: docu.id, ...docu.data() };
            const tr = document.createElement('tr');
            tr.innerHTML = `
 <td><img src="${p.imageUrl || ''}" alt=""></td>
 <td>${p.name}<br><small>${p.category}</small></td>
 <td>${BRL(p.price)}</td>
 <td>${p.stock}</td>
 <td>
 <button data-act="edit" data-id="${p.id}">Editar</button>
 <button data-act="del" data-id="${p.id}">Excluir</button>
 </td>
 `;
            tr.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.act === 'del') {
                    if (confirm('Excluir produto?')) await
                        deleteDoc(doc(db, 'products', id));
                }
                if (btn.dataset.act === 'edit') {
                    const novoPreco = prompt('Novo preço (R$):', (p.price /
                        100).toFixed(2));
                    if (novoPreco) {
                        await updateDoc(doc(db, 'products', id), {
                            price:
                                toCents(novoPreco), updatedAt: serverTimestamp()
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
