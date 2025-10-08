/**
 * Formata um número para a moeda Real Brasileiro (BRL).
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como uma string de moeda.
 */
export function BRL(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/**
 * ✅ CORREÇÃO FINAL E DEFINITIVA
 * Converte a URL de uma imagem original para a URL da imagem otimizada pela extensão.
 * A lógica agora considera a pasta 'resized/' e o sufixo no nome do ficheiro,
 * com base na configuração da extensão (storage-resize-images.env).
 * @param {string} originalUrl A URL da imagem original com token.
 * @returns {string} A URL da imagem otimizada, pronta para ser usada.
 */
export function getResizedImageUrl(originalUrl) {
    if (!originalUrl) return '';

    try {
        // 1. Isola a parte principal do URL, removendo o token de acesso.
        const baseUrl = originalUrl.split('?')[0];

        // 2. Extrai o caminho do ficheiro, que está codificado no URL.
        // Ex: .../o/products%2Fproduto1%2Fimagem.jpg -> products%2Fproduto1%2Fimagem.jpg
        const encodedPath = baseUrl.split('/o/')[1];
        
        // 3. Descodifica o caminho para poder manipulá-lo como uma string normal.
        // Ex: products%2Fproduto1%2Fimagem.jpg -> products/produto1/imagem.jpg
        const decodedPath = decodeURIComponent(encodedPath);

        // 4. Encontra a posição do último ponto para separar o nome da extensão.
        const lastDotIndex = decodedPath.lastIndexOf('.');
        if (lastDotIndex === -1) return originalUrl; // Retorna original se não houver extensão.
        const baseName = decodedPath.substring(0, lastDotIndex);

        // 5. Monta o novo caminho, adicionando a pasta 'resized' e o sufixo no nome do ficheiro.
        // Ex: resized/products/produto1/imagem_400x400.webp
        const newPath = `resized/${baseName}_400x400.webp`;

        // 6. Codifica o novo caminho para o formato de URL.
        const newEncodedPath = encodeURIComponent(newPath);

        // 7. Monta a URL final, adicionando o parâmetro ?alt=media para visualização.
        const bucketUrl = baseUrl.split('/o/')[0];
        return `${bucketUrl}/o/${newEncodedPath}?alt=media`;

    } catch (error) {
        console.error("Erro ao gerar URL de imagem otimizada:", error, originalUrl);
        return originalUrl; // Em caso de qualquer erro, retorna a imagem original.
    }
}


/**
 * Exibe uma notificação toast simples.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success' | 'error' | 'warning' | 'info'} type - O tipo de notificação.
 */
export function showToast(message, type = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    Toast.fire({
        icon: type,
        title: message
    });
}

/**
 * Exibe um modal de confirmação e retorna uma promessa que resolve para true se confirmado.
 * @param {string} title - O título do modal.
 * @param {string} text - O texto de descrição do modal.
 * @param {string} confirmButtonText - O texto para o botão de confirmação.
 * @returns {Promise<boolean>} - True se o utilizador confirmar, false caso contrário.
 */
export async function showConfirmation(title, text, confirmButtonText = 'Confirmar') {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
}


/**
 * Um objeto para gerir o estado do carrinho de compras, utilizando o localStorage
 * e permitindo que outras partes da aplicação "oiçam" as alterações.
 */
export const cartStore = {
    _listeners: [],
    onChange(listener) {
        this._listeners.push(listener);
    },
    get() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    },
    set(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        this._listeners.forEach(listener => listener());
    },
    clear() {
        this.set([]);
    }
};