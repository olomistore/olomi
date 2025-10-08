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
 * ✅ FUNÇÃO CORRIGIDA
 * Converte a URL de uma imagem original para a URL da imagem redimensionada pela extensão do Firebase.
 * @param {string} originalUrl A URL da imagem original.
 * @returns {string} A URL da imagem redimensionada.
 */
export function getResizedImageUrl(originalUrl) {
    if (!originalUrl) return '';

    // Divide a URL para separar a base dos parâmetros (como o token de acesso)
    const [baseUrl, params] = originalUrl.split('?');

    // Encontra a posição do último ponto para identificar a extensão do ficheiro
    const lastDotIndex = baseUrl.lastIndexOf('.');
    if (lastDotIndex === -1) return originalUrl; // Retorna a original se não encontrar uma extensão

    // Separa o nome base da extensão
    const baseName = baseUrl.substring(0, lastDotIndex);
    const extension = baseUrl.substring(lastDotIndex);

    // Monta a nova URL com o sufixo da imagem redimensionada ANTES da extensão
    const newBaseUrl = `${baseName}_400x400${extension}`;

    // Junta a nova base com os parâmetros originais e retorna
    return params ? `${newBaseUrl}?${params}` : newBaseUrl;
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
    /**
     * @private
     * @type {Array<() => void>} 
     */
    _listeners: [],

    /**
     * Adiciona um "ouvinte" que será chamado sempre que o carrinho for atualizado.
     * @param {() => void} listener - A função a ser chamada na atualização.
     */
    onChange(listener) {
        this._listeners.push(listener);
    },

    /**
     * Obtém os itens do carrinho a partir do localStorage.
     * @returns {Array<object>} Os itens do carrinho.
     */
    get() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    },

    /**
     * Salva os itens no carrinho no localStorage e notifica todos os "ouvintes".
     * @param {Array<object>} cart - O array de itens do carrinho a ser salvo.
     */
    set(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        // Notifica todos os listeners que o carrinho mudou
        this._listeners.forEach(listener => listener());
    },
    
    /**
     * Limpa completamente o carrinho.
     */
    clear() {
        this.set([]);
    }
};