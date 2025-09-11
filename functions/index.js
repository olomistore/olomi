const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require('cors')({ origin: true });
const path = require('path');
const os = require('os');
const fs = require('fs');
const Busboy = require('busboy');

admin.initializeApp();

const runtimeOpts = {
  timeoutSeconds: 120,
  memory: '512MB'
};

const regionalFunctions = functions.region('us-central1').runWith(runtimeOpts);

exports.calculateShipping = regionalFunctions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method not allowed' });
        }
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
            console.error("Erro no cálculo de frete:", error);
            return res.status(500).send({ error: "Falha interna ao calcular o frete." });
        }
    });
});

exports.uploadFile = regionalFunctions.https.onRequest((req, res) => {
    // O cors wrapper garante que os headers estarão presentes em TODAS as respostas.
    cors(req, res, () => {
        try {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }

            const busboy = new Busboy({ headers: req.headers });
            const tmpdir = os.tmpdir();
            const uploads = [];
            const fileWrites = [];

            // ✅ CORREÇÃO: Adiciona um handler de erros para o busboy.
            // Se o formulário for mal formatado, isto evita que a função crashe.
            busboy.on('error', (err) => {
                console.error('Erro do Busboy:', err);
                return res.status(400).json({ error: 'Erro ao processar o formulário.' });
            });

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
                            metadata: { contentType: mimetype },
                            public: true
                        });
                        fs.unlinkSync(filepath);

                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                        imageUrls.push(publicUrl);
                    }
                    
                    // Responde com sucesso.
                    return res.status(200).json({ imageUrls: imageUrls });
                } catch (error) {
                    console.error("Erro no upload para o Storage:", error);
                    return res.status(500).json({ error: 'Falha ao fazer upload do arquivo.' });
                }
            });

            if (req.rawBody) {
                busboy.end(req.rawBody);
            } else {
                req.pipe(busboy);
            }
        } catch (err) {
            console.error('Erro inesperado na função uploadFile:', err);
            return res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    });
});
