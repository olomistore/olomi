const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

const storage = getStorage();
// Deixa o SDK encontrar o bucket padrão automaticamente
const bucket = storage.bucket();

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
        file.on("end", () => {
          writeStream.end();
        });
        writeStream.on("finish", () => {
          uploads[fieldname] = {
            filepath,
            filename,
            mimeType,
          };
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
            metadata: {
              contentType: mimeType,
            },
          });

          logger.info(`Making ${filename} public.`);
          try {
            await uploadedFile.makePublic();
          } catch (aclError) {
            logger.error(`Failed to make ${filename} public:`, aclError);
            // Esta é a mensagem de erro que você verá se o bucket estiver com controle de acesso "Uniforme"
            throw new Error(
              "File uploaded, but failed to set public access. Please check your Cloud Storage bucket's permissions. It might be set to 'Uniform' access control."
            );
          }

          const publicUrl = uploadedFile.publicUrl();
          publicUrls.push(publicUrl);
          logger.info(`File ${filename} uploaded successfully. Public URL: ${publicUrl}`);
          
          fs.unlinkSync(filepath);
        } catch (error) {
          logger.error(`Error processing file ${filename}:`, error);
          // Retorna o erro específico que ocorreu
          return res.status(500).json({ error: error.message || "Failed to upload file." });
        }
      }

      res.status(200).json({ imageUrls: publicUrls });
    });

    busboy.end(req.rawBody);
  });
});