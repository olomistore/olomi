const functions = require("firebase-functions");
const axios = require("axios");
const xml2js = require("xml2js");

// ✅ CORREÇÃO DEFINITIVA: Importa e inicializa o middleware 'cors'
// A opção origin: true permite que a função aceite requisições de qualquer origem.
const cors = require('cors')({ origin: true });

// Opções de execução para a função
const runtimeOpts = {
  timeoutSeconds: 60,
  memory: '256MB'
};

exports.calculateShipping = functions
  .region('us-central1')
  .runWith(runtimeOpts)
  .https.onRequest((req, res) => {
    
    // ✅ CORREÇÃO DEFINITIVA: A primeira coisa que a função faz é chamar o 'cors'.
    // Ele vai lidar com a requisição preflight (OPTIONS) e adicionar os cabeçalhos corretos.
    cors(req, res, async () => {
    
        // Log para registrar que a função foi acionada
        functions.logger.info("Iniciando cálculo de frete...", { body: req.body });

        // Agora o resto da sua lógica só roda se for um POST
        if (req.method !== 'POST') {
            functions.logger.warn("Método não permitido:", req.method);
            return res.status(405).send({ error: 'Method not allowed' });
        }

        try {
            const destinationCep = req.body?.data?.cep;
            if (!destinationCep || !/^\d{8}$/.test(destinationCep)) {
                functions.logger.error("CEP inválido ou ausente:", destinationCep);
                return res.status(400).send({ error: "O CEP é obrigatório e deve ter 8 dígitos." });
            }

            const originCep = "21371121"; // Lembre-se de ajustar para o seu CEP de origem
            const packageWeight = "1";
            const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=${packageWeight}&nCdFormato=1&nVlComprimento=20&nVlAltura=10&nVlLargura=15&nCdServico=04510&StrRetorno=xml`;
            
            functions.logger.info("Requisitando Correios:", { url: correiosUrl });

            const response = await axios.get(correiosUrl);
            const xml = response.data;

            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xml);
            const service = result.Servicos.cServico[0];

            if (service.Erro[0] !== "0" && service.MsgErro && service.MsgErro.length > 0) {
                const erroMsg = service.MsgErro[0].trim();
                functions.logger.error("Erro dos Correios:", erroMsg);
                return res.status(400).send({ error: erroMsg });
            }

            const shippingValue = service.Valor[0].replace(",", ".");
            const deliveryTime = service.PrazoEntrega[0];

            const responseData = {
                data: {
                    price: parseFloat(shippingValue),
                    deadline: parseInt(deliveryTime, 10),
                }
            };
            
            functions.logger.info("Cálculo bem-sucedido:", responseData);
            return res.status(200).send(responseData);

        } catch (error) {
            functions.logger.error("Erro inesperado:", error);
            return res.status(500).send({ error: "Falha interna ao calcular o frete." });
        }
    }); // Fim do wrapper do cors
});