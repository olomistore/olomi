// Importa as ferramentas necessárias para a Cloud Function
const functions = require("firebase-functions");
const axios = require("axios"); // Para fazer chamadas a outras APIs
const xml2js = require("xml2js"); // Para converter a resposta dos Correios de XML para JSON

/**
 * Cloud Function que pode ser chamada para calcular o frete dos Correios.
 * @param {object} data - Objeto enviado do frontend, deve conter a propriedade 'cep'.
 * @param {object} context - Informações de autenticação do utilizador que fez a chamada.
 * @returns {Promise<object>} Uma promessa que resolve com o preço e o prazo do frete.
 */
exports.calculateShipping = functions.https.onCall(async (data, context) => {
  // Pega no CEP de destino enviado pelo seu carrinho.js
  const destinationCep = data.cep;

  // Validação para garantir que o CEP foi enviado
  if (!destinationCep) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O CEP de destino é obrigatório."
    );
  }

  // --- CONFIGURAÇÕES DO SEU ENVIO ---
  // TODO: Altere estas informações para corresponderem aos seus dados
  const originCep = "21371121"; // CEP de origem (o seu CEP)
  const packageWeight = "1"; // Peso médio do pacote em KG
  const packageLength = "20"; // Comprimento médio em cm
  const packageHeight = "10"; // Altura média em cm
  const packageWidth = "15"; // Largura média em cm
  // --- FIM DAS CONFIGURAÇÕES ---

  // Monta a URL da API dos Correios com os parâmetros necessários
  // 04510 = PAC sem contrato
  const correiosUrl = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&sCepOrigem=${originCep}&sCepDestino=${destinationCep}&nVlPeso=${packageWeight}&nCdFormato=1&nVlComprimento=${packageLength}&nVlAltura=${packageHeight}&nVlLargura=${packageWidth}&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&nCdServico=04510&nVlDiametro=0&StrRetorno=xml&nIndicaCalculo=3`;

  try {
    // Faz a chamada à API dos Correios
    const response = await axios.get(correiosUrl);
    const xml = response.data;

    // Converte a resposta (que é em XML) para um objeto JavaScript
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);

    const service = result.Servicos.cServico[0];
    const shippingValue = service.Valor[0].replace(",", ".");
    const deliveryTime = service.PrazoEntrega[0];

    // Verifica se houve algum erro na resposta dos Correios (código de erro diferente de '0')
    if (service.Erro[0] !== "0") {
      // Se houver um erro, lança uma exceção com a mensagem de erro dos Correios
      throw new Error(service.MsgErro[0]);
    }

    // Devolve o resultado formatado para o seu site
    return {
      price: parseFloat(shippingValue),
      deadline: parseInt(deliveryTime),
    };
  } catch (error) {
    console.error("Erro ao calcular o frete:", error);
    // Em caso de erro, lança uma HttpsError para que o frontend possa lidar com ela
    throw new functions.https.HttpsError(
      "internal",
      "Não foi possível calcular o frete. Tente novamente."
    );
  }
});
