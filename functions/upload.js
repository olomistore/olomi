const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

const storage = getStorage();
const bucket = storage.bucket(); // Deixa o SDK encontrar o bucket padrão

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

          // MODIFICADO: Constrói o URL de download manualmente, que respeita as Regras de Segurança do Storage.
          // Como suas regras permitem leitura pública (`allow read: if true;`), este URL funcionará.
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