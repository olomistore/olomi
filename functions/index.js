const { initializeApp } = require("firebase-admin/app");
initializeApp();

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { uploadFile } = require("./upload.js");

exports.uploadFile = uploadFile;

/**
 * Cloud Function "Chamável" para criar um pedido.
 * Executa validações de segurança e de negócio no lado do servidor.
 *
 * @param {object} request - O objeto da requisição, contendo os dados enviados pelo cliente.
 * @returns {Promise<{orderId: string}>} - Retorna o ID do pedido criado.
 */
exports.createorder = onCall({ cors: true }, async (request) => {

    // 1. Validação de Autenticação
    if (!request.auth) {
        logger.error("Tentativa de criação de pedido por utilizador não autenticado.");
        throw new HttpsError('unauthenticated', 'Você precisa estar autenticado para fazer um pedido.');
    }

    const userId = request.auth.uid;
    const items = request.data.items;
    const customer = request.data.customer; // --- MODIFICAÇÃO ---

    // 2. Validação de Input
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new HttpsError('invalid-argument', 'O carrinho está vazio ou os dados do pedido são inválidos.');
    }
    // --- INÍCIO DA MODIFICAÇÃO ---
    if (!customer || !customer.name || !customer.address || !customer.phone) {
        throw new HttpsError('invalid-argument', 'Os dados do cliente estão em falta ou são inválidos.');
    }
    // --- FIM DA MODIFICAÇÃO ---


    const db = getFirestore();
    let totalAmount = 0;

    try {
        const orderDetails = await db.runTransaction(async (transaction) => {
            const productRefs = items.map(item => db.collection('products').doc(item.id));
            const productDocs = await transaction.getAll(...productRefs);

            const itemsForOrder = [];
            const stockUpdates = [];

            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                const item = items[i];

                if (!productDoc.exists) {
                    throw new HttpsError('not-found', `Produto com ID ${item.id} não encontrado.`);
                }

                const productData = productDoc.data();
                const requestedQty = Number(item.qty);

                if (isNaN(requestedQty) || requestedQty <= 0) {
                     throw new HttpsError('invalid-argument', `Quantidade inválida para o produto ${productData.name}.`);
                }
                if (productData.stock < requestedQty) {
                    throw new HttpsError('failed-precondition', `Stock insuficiente para o produto: ${productData.name}.`);
                }

                totalAmount += (productData.price * requestedQty);
                
                itemsForOrder.push({
                    id: productDoc.id,
                    name: productData.name,
                    price: productData.price,
                    qty: requestedQty,
                    imageUrl: productData.imageUrls && productData.imageUrls.length > 0 ? productData.imageUrls[0] : null
                });

                stockUpdates.push({
                    ref: productDoc.ref,
                    newStock: productData.stock - requestedQty
                });
            }

            stockUpdates.forEach(update => {
                transaction.update(update.ref, { stock: update.newStock });
            });

            const orderRef = db.collection('orders').doc();
            
            // --- INÍCIO DA MODIFICAÇÃO ---
            const newOrder = {
                userId: userId,
                customer: customer, // Adiciona os dados do cliente
                items: itemsForOrder,
                total: totalAmount,
                status: 'Pendente',
                createdAt: Timestamp.now()
            };
            // --- FIM DA MODIFICAÇÃO ---
            transaction.set(orderRef, newOrder);

            // Retorna os detalhes completos do pedido
            return { orderId: orderRef.id, ...newOrder };
        });

        logger.info(`Pedido ${orderDetails.orderId} criado com sucesso para o utilizador ${userId}.`);
        // Retorna os detalhes completos, que o frontend agora espera
        return orderDetails;

    } catch (error) {
        logger.error(`Erro ao criar pedido para o utilizador ${userId}:`, error);

        if (error instanceof HttpsError) {
            throw error;
        } else {
            throw new HttpsError('internal', 'Ocorreu um erro interno ao processar o seu pedido.');
        }
    }
});
