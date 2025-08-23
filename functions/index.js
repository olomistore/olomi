const functions = require("firebase-functions");
const axios = require("axios");
const xml2js = require("xml2js");

// Deixe explícita a região, igual à do endpoint que você usa (us-central1)
exports.calculateShipping = functions.region('us-central1').https.onRequest(async (req, res) => {
  // === CORS: sempre setar cabeçalhos ===
  const origin = req.get('Origin') || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin'); // boa prática de cache
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Apenas POST
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  try {
    const destinationCep = req.body?.data?.cep;
    if (!destinationCep) {
      res.status(400).send({ error: "O CEP de destino é obrigatório." });
      return;
    }

    const originCep = "21371121"; // TODO: ajuste para o seu CEP real
    const packageWeight = req.body?.data?.peso || "1";
    const packageLength = "20";
    const packageHeight = "10";
    const packageWidth = "15";

    const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=${packageWeight}&nCdFormato=1&nVlComprimento=${packageLength}&nVlAltura=${packageHeight}&nVlLargura=${packageWidth}&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&nCdServico=04510&nVlDiametro=0&StrRetorno=xml&nIndicaCalculo=3`;

    const response = await axios.get(correiosUrl);
    const xml = response.data;

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);

    const service = result.Servicos.cServico[0];
    const shippingValue = service.Valor[0].replace(",", ".");
    const deliveryTime = service.PrazoEntrega[0];

    if (service.Erro[0] !== "0") {
      throw new Error(service.MsgErro[0]);
    }

    res.status(200).send({
      data: {
        price: parseFloat(shippingValue), // em R$
        deadline: parseInt(deliveryTime, 10),
      }
    });
  } catch (error) {
    console.error("Erro ao calcular o frete:", error);
    res.status(500).send({ error: "Não foi possível calcular o frete." });
  }
});
