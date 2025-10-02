const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

const storage = getStorage();
const bucket = storage.bucket("olomi-7816a.appspot.com"); 

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

    busboy.on("file", (fieldname, file, { filename }) => {
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
        const { filepath, filename } = uploads[fieldname];
        const destination = `products/${Date.now()}_${filename}`;
        
        try {
          const [uploadedFile] = await bucket.upload(filepath, {
            destination,
            metadata: {
              contentType: "image/jpeg", 
            },
          });

          await uploadedFile.makePublic();
          publicUrls.push(uploadedFile.publicUrl());
          fs.unlinkSync(filepath); 
        } catch (error) {
          logger.error("Error uploading file:", error);
          return res.status(500).json({ error: "Failed to upload file." });
        }
      }

      res.status(200).json({ imageUrls: publicUrls });
    });

    busboy.end(req.rawBody);
  });
});