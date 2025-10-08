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
 * ✅ CORREÇÃO FINAL
 * Converte a URL de uma imagem original para a URL da imagem redimensionada, removendo
 * o token de acesso original, que é inválido para o novo ficheiro.
 * A função agora depende da regra de leitura pública do Firebase Storage.
 * @param {string} originalUrl A URL da imagem original com token.
 * @returns {string} A URL da imagem redimensionada, sem token.
 */
export function getResizedImageUrl(originalUrl) {
    if (!originalUrl) return '';

    // Remove o token e outros parâmetros (tudo depois de '?').
    const baseUrl = originalUrl.split('?")[0];

    const lastDotIndex = baseUrl.lastIndexOf('.');
    if (lastDotIndex === -1) return originalUrl; // Retorna a original se não tiver extensão

    // Pega no nome do ficheiro sem a extensão.
    const baseName = baseUrl.substring(0, lastDotIndex);
    
    // Gera a URL para a versão .webp redimensionada, e adiciona o parâmetro `alt=media` 
    // para que o browser a exiba como uma imagem e não faça o download.
    const newResizedUrl = `${baseName}_400x400.webp?alt=media`;

    return newResizedUrl;
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