const functions = require("firebase-functions");
const axios = require("axios");
const xml2js = require("xml2js");
// ✅ CORREÇÃO: Importa o middleware 'cors' para lidar com o CORS automaticamente
const cors = require('cors')({ origin: true });

exports.calculateShipping = functions.region('us-central1').https.onRequest((req, res) => {
    // ✅ CORREÇÃO: Usa o middleware 'cors' para tratar os cabeçalhos de CORS.
    // Isso substitui toda a configuração manual que você tinha.
    cors(req, res, async () => {
        // Apenas requisições POST são permitidas após o tratamento de CORS
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method not allowed' });
        }

        try {
            const destinationCep = req.body?.data?.cep;
            if (!destinationCep) {
                return res.status(400).send({ error: "O CEP de destino é obrigatório." });
            }

            const originCep = "21371121"; // Lembre-se de ajustar para o seu CEP de origem
            const packageWeight = "1";    // Defina um peso padrão ou receba do frontend
            const packageLength = "20";
            const packageHeight = "10";
            const packageWidth = "15";

            const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=${packageWeight}&nCdFormato=1&nVlComprimento=${packageLength}&nVlAltura=${packageHeight}&nVlLargura=${packageWidth}&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&nCdServico=04510&nVlDiametro=0&StrRetorno=xml&nIndicaCalculo=3`;

            const response = await axios.get(correiosUrl);
            const xml = response.data;

            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xml);
            const service = result.Servicos.cServico[0];

            // ✅ CORREÇÃO: Envia o erro específico dos Correios para o frontend
            if (service.Erro[0] !== "0" && service.MsgErro && service.MsgErro.length > 0) {
                 // Usamos status 400 (Bad Request) pois o erro é do lado do cliente (ex: CEP inválido)
                return res.status(400).send({ error: service.MsgErro[0] });
            }

            const shippingValue = service.Valor[0].replace(",", ".");
            const deliveryTime = service.PrazoEntrega[0];

            return res.status(200).send({
                data: {
                    price: parseFloat(shippingValue),
                    deadline: parseInt(deliveryTime, 10),
                }
            });

        } catch (error) {
            console.error("Erro interno ao calcular o frete:", error);
            // ✅ CORREÇÃO: Envia uma mensagem de erro mais clara em caso de falha interna
            return res.status(500).send({ error: "Ocorreu um erro inesperado no servidor de frete." });
        }
    });
});