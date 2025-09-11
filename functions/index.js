const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");
const path = require('path');
const os = require('os');
const fs = require('fs');
const Busboy = require('busboy');

admin.initializeApp();

// Define as opções globais para todas as funções (região, memória, etc.)
setGlobalOptions({
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '512MB'
});

// Função de cálculo de frete com a sintaxe v2
exports.calculateShipping = onRequest(
    { cors: true }, // A opção cors integrada lida com o CORS automaticamente
    async (req, res) => {
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
            logger.error("Erro no cálculo de frete:", error);
            return res.status(500).send({ error: "Falha interna ao calcular o frete." });
        }
    }
);

// Função de upload de arquivo com a sintaxe v2
exports.uploadFile = onRequest(
    { cors: true }, // Usa a opção cors integrada
    (req, res) => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        try {
            const busboy = Busboy({ headers: req.headers });
            const tmpdir = os.tmpdir();
            const uploads = [];
            const fileWrites = [];

            busboy.on('file', (fieldname, file, {filename, encoding, mimeType}) => {
                const filepath = path.join(tmpdir, filename);
                uploads.push({ filepath, mimeType });

                const writeStream = fs.createWriteStream(filepath);
                file.pipe(writeStream);

                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => writeStream.end());
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                fileWrites.push(promise);
            });

            busboy.on('error', err => {
                logger.error('Erro do Busboy:', err);
                res.status(400).json({ error: 'Erro ao processar o formulário.' });
            });

            busboy.on('finish', async () => {
                try {
                    await Promise.all(fileWrites);

                    const bucket = admin.storage().bucket();
                    const imageUrls = [];

                    for (const upload of uploads) {
                        const { filepath, mimeType } = upload;
                        const filename = path.basename(filepath);
                        const destination = `products/${Date.now()}-${filename}`;

                        await bucket.upload(filepath, {
                            destination: destination,
                            metadata: { contentType: mimeType },
                            public: true
                        });
                        fs.unlinkSync(filepath);

                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                        imageUrls.push(publicUrl);
                    }
                    
                    return res.status(200).json({ imageUrls });
                } catch (error) {
                    logger.error("Erro no upload para o Storage:", error);
                    return res.status(500).json({ error: 'Falha ao fazer upload do arquivo.' });
                }
            });
            
            // ✅ CORREÇÃO FINAL: Usa req.rawBody para a API v2 em vez de req.pipe()
            busboy.end(req.rawBody);

        } catch (err) {
            logger.error('Erro inesperado na função uploadFile:', err);
            return res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }
);