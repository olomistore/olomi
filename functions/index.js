const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");

// Middleware para CORS
const cors = require('cors')({ origin: true });

// Módulos para upload de arquivos
const path = require('path');
const os = require('os');
const fs = require('fs');
const Busboy = require('busboy');

// Inicializa o Firebase Admin SDK para ter acesso aos serviços no backend
admin.initializeApp();

const runtimeOpts = {
  timeoutSeconds: 120, // Aumentado para uploads
  memory: '512MB'
};

// Função existente para calcular o frete
exports.calculateShipping = functions
  .region('us-central1')
  .runWith(runtimeOpts)
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method not allowed' });
        }
        // ... (o restante da sua função de frete continua aqui, sem alterações)
        try {
            const destinationCep = req.body?.data?.cep;
            if (!destinationCep || !/^\d{8}$/.test(destinationCep)) {
                return res.status(400).send({ error: "O CEP é obrigatório e deve ter 8 dígitos." });
            }
            const originCep = "21371121";
            const packageWeight = "1";
            const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=${packageWeight}&nCdFormato=1&nVlComprimento=20&nVlAltura=10&nVlLargura=15&nCdServico=04510&StrRetorno=xml`;
            const response = await axios.get(correiosUrl);
            const xml = response.data;
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xml);
            const service = result.Servicos.cServico[0];
            if (service.Erro[0] !== "0" && service.MsgErro && service.MsgErro.length > 0) {
                return res.status(400).send({ error: service.MsgErro[0].trim() });
            }
            const shippingValue = service.Valor[0].replace(",", ".");
            const deliveryTime = service.PrazoEntrega[0];
            const responseData = { data: { price: parseFloat(shippingValue), deadline: parseInt(deliveryTime, 10) } };
            return res.status(200).send(responseData);
        } catch (error) {
            return res.status(500).send({ error: "Falha interna ao calcular o frete." });
        }
    });
});

// NOVA FUNÇÃO PARA UPLOAD DE ARQUIVOS
exports.uploadFile = functions
  .region('us-central1')
  .runWith(runtimeOpts)
  .https.onRequest((req, res) => {
    cors(req, res, () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method not allowed' });
        }

        const busboy = new Busboy({ headers: req.headers });
        const tmpdir = os.tmpdir();
        const uploads = []; // Array para guardar informações dos arquivos
        const fileWrites = []; // Array para promessas de escrita de arquivo

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            const filepath = path.join(tmpdir, filename);
            uploads.push({ filepath, mimetype });

            const writeStream = fs.createWriteStream(filepath);
            file.pipe(writeStream);

            const promise = new Promise((resolve, reject) => {
                file.on('end', () => writeStream.end());
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            fileWrites.push(promise);
        });

        busboy.on('finish', async () => {
            try {
                await Promise.all(fileWrites);

                const bucket = admin.storage().bucket();
                const imageUrls = [];

                for (const upload of uploads) {
                    const { filepath, mimetype } = upload;
                    const filename = path.basename(filepath);
                    const destination = `products/${Date.now()}-${filename}`;

                    await bucket.upload(filepath, {
                        destination: destination,
                        metadata: { contentType: mimetype }
                    });
                    fs.unlinkSync(filepath); // Limpa o arquivo temporário

                    // URL pública do arquivo. As regras do Storage devem permitir leitura pública.
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                    imageUrls.push(publicUrl);
                }
                
                res.status(200).json({ imageUrls: imageUrls });
            } catch (error) {
                console.error("Erro no upload para o Storage:", error);
                res.status(500).send({ error: 'Falha ao fazer upload do arquivo.' });
            }
        });

        busboy.end(req.rawBody);
    });
});
