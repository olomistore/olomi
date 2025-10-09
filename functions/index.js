const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get references to Firebase services
const db = admin.firestore();
const storage = getStorage();
const bucket = storage.bucket();

// --- CREATE ORDER (v1 Callable Function) ---
exports.createOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Você precisa estar logado para criar um pedido."
        );
    }

    const { items, customer } = data;

    if (!items || items.length === 0 || !customer) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O pedido deve conter itens e informações do cliente."
        );
    }

    return db.runTransaction(async (transaction) => {
        let total = 0;
        const productUpdates = [];

        for (const item of items) {
            const productRef = db.collection("products").doc(item.id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    `Produto com ID ${item.id} não encontrado.`
                );
            }

            const productData = productDoc.data();
            const newStock = productData.stock - item.qty;

            if (newStock < 0) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    `Estoque insuficiente para o produto: ${productData.name}. Disponível: ${productData.stock}, Pedido: ${item.qty}`
                );
            }

            total += productData.price * item.qty;
            productUpdates.push({ ref: productRef, data: { stock: newStock } });
        }

        productUpdates.forEach((update) => {
            transaction.update(update.ref, update.data);
        });

        const orderRef = db.collection("orders").doc();
        transaction.set(orderRef, {
            items,
            customer,
            total,
            status: "Pendente", // Standardize new orders to Portuguese
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userId: context.auth.uid,
        });

        return { orderId: orderRef.id, message: "Pedido criado com sucesso!" };
    }).catch(error => {
        console.error("Erro na transação de criação de pedido:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao processar seu pedido.",
            error
        );
    });
});

// --- UPLOAD FILE (v2 onRequest Function) ---
// Re-integrating the uploadFile function that was accidentally deleted.
exports.uploadFile = onRequest({ cors: true }, (req, res) => {
    cors(req, res, () => {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        const busboy = Busboy({ headers: req.headers });
        const uploads = {};
        const tmpdir = os.tmpdir();
        const fileWrites = [];
        const publicUrls = [];

        busboy.on("file", (fieldname, file, info) => {
            const { filename, mimeType } = info;
            logger.info(`Processing file: ${filename}, mimeType: ${mimeType}`);

            const filepath = path.join(tmpdir, filename);
            const writeStream = fs.createWriteStream(filepath);
            file.pipe(writeStream);

            const promise = new Promise((resolve, reject) => {
                file.on("end", () => writeStream.end());
                writeStream.on("finish", () => {
                    uploads[fieldname] = { filepath, filename, mimeType };
                    resolve();
                });
                writeStream.on("error", reject);
            });
            fileWrites.push(promise);
        });

        busboy.on("finish", async () => {
            await Promise.all(fileWrites);

            for (const fieldname in uploads) {
                const { filepath, filename, mimeType } = uploads[fieldname];
                const destination = `products/${Date.now()}_${filename}`;

                try {
                    logger.info(`Uploading ${filename} to ${destination}`);
                    const [uploadedFile] = await bucket.upload(filepath, {
                        destination,
                        metadata: { contentType: mimeType },
                    });

                    const bucketName = bucket.name;
                    const encodedFilePath = encodeURIComponent(uploadedFile.name);
                    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilePath}?alt=media`;

                    publicUrls.push(downloadUrl);
                    logger.info(`File ${filename} uploaded successfully. URL: ${downloadUrl}`);
                    
                    fs.unlinkSync(filepath);
                } catch (error) {
                    logger.error(`Error processing file ${filename}:`, error);
                    return res.status(500).json({ error: error.message || "Failed to upload file." });
                }
            }

            res.status(200).json({ imageUrls: publicUrls });
        });

        busboy.end(req.rawBody);
    });
});