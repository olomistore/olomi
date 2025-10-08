
/**
 * Converte a URL de uma imagem original para a URL da imagem redimensionada.
 * Exemplo: 
 *   Entrada: "https://storage.googleapis.com/bucket/produtos/123/imagem.jpg?token=abc"
 *   Saída:  "https://storage.googleapis.com/bucket/produtos/123/imagem_400x400.webp?token=abc"
 * @param {string} originalUrl A URL da imagem original.
 * @returns {string} A URL da imagem redimensionada.
 */
function getResizedImageUrl(originalUrl) {
  // Separa a URL principal dos parâmetros (como o token de acesso)
  const [baseUrl, params] = originalUrl.split('?');

  // Encontra a posição do último ponto para identificar a extensão do ficheiro
  const lastDotIndex = baseUrl.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Se não houver extensão, retorna a URL original para evitar erros
    return originalUrl;
  }

  // Extrai o nome base do ficheiro e a extensão
  const baseName = baseUrl.substring(0, lastDotIndex);
  
  // Monta a nova URL com o sufixo de redimensionamento e a nova extensão
  const newBaseUrl = `${baseName}_400x400.webp`;

  // Junta a nova URL base com os parâmetros originais e retorna
  return params ? `${newBaseUrl}?${params}` : newBaseUrl;
}
