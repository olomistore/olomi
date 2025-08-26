const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors")({ origin: true });

exports.calculateShipping = onRequest(
  // ✅ AUMENTA O TIMEOUT PARA 2 MINUTOS
  { region: "us-central1", timeoutSeconds: 120 },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        logger.warn("Método não permitido:", req.method);
        return res.status(405).send({ error: "Method not allowed" });
      }

      try {
        const destinationCep = req.body?.data?.cep;
        if (!destinationCep || !/^\d{8}$/.test(destinationCep)) {
          logger.error("CEP inválido ou ausente:", destinationCep);
          return res.status(400).send({ error: "O CEP é obrigatório e deve ter 8 dígitos." });
        }

        const originCep = "21371121"; // Lembre-se de ajustar para o seu CEP de origem
        const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=10&nVlLargura=15&nCdServico=04510&StrRetorno=xml`;

        const response = await axios.get(correiosUrl);
        const result = await new xml2js.Parser().parseStringPromise(response.data);
        const service = result.Servicos.cServico[0];

        if (service.Erro[0] !== "0" && service.MsgErro[0]) {
          const erroMsg = service.MsgErro[0].trim();
          logger.error("Erro dos Correios:", erroMsg);
          return res.status(400).send({ error: erroMsg });
        }

        const responseData = {
          data: {
            price: parseFloat(service.Valor[0].replace(",", ".")),
            deadline: parseInt(service.PrazoEntrega[0], 10),
          },
        };

        return res.status(200).send(responseData);
      } catch (error) {
        logger.error("Erro inesperado na função:", error);
        return res.status(500).send({ error: "Falha interna ao calcular o frete." });
      }
    });
  }
);