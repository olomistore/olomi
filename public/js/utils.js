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
 * ✅ TENTATIVA FINAL: CORRIGE O PROBLEMA DO TOKEN DE ACESSO
 * Converte a URL de uma imagem original para a URL da imagem otimizada.
 * A causa do erro anterior era que a URL gerada não continha o token de acesso
 * necessário para visualizar ficheiros não-públicos no Firebase Storage.
 * Esta versão extrai o token da URL original e anexa-o à nova URL.
 * @param {string} originalUrl A URL da imagem original com token.
 * @returns {string} A URL da imagem otimizada, com token, pronta para ser usada.
 */
export function getResizedImageUrl(originalUrl) {
    if (!originalUrl) return '';

    try {
        // 1. Divide a URL base dos parâmetros de query.
        const urlParts = originalUrl.split('?');
        const baseUrl = urlParts[0];
        
        // 2. Extrai o token de acesso dos parâmetros.
        const queryParams = new URLSearchParams(urlParts.length > 1 ? urlParts[1] : '');
        const token = queryParams.get('token');

        // Se não houver token, não podemos aceder à imagem redimensionada (privada).
        if (!token) {
            return originalUrl;
        }

        // 3. Extrai e descodifica o caminho do ficheiro.
        const encodedPath = baseUrl.split('/o/')[1];
        if (!encodedPath) return originalUrl; // URL inválida
        const decodedPath = decodeURIComponent(encodedPath);

        // 4. Separa o nome do ficheiro da sua extensão.
        const lastDotIndex = decodedPath.lastIndexOf('.');
        if (lastDotIndex === -1) return originalUrl;
        const baseName = decodedPath.substring(0, lastDotIndex);

        // 5. Monta o novo caminho para a imagem redimensionada.
        const newPath = `resized/${baseName}_400x400.webp`;
        const newEncodedPath = encodeURIComponent(newPath);

        // 6. Reconstrói a URL final, incluindo o caminho para o bucket.
        const bucketUrl = baseUrl.split('/o/')[0];
        let finalUrl = `${bucketUrl}/o/${newEncodedPath}?alt=media`;

        // 7. Anexa o token de acesso original, que é a correção crucial.
        finalUrl += `&token=${token}`;

        return finalUrl;

    } catch (error) {
        console.error("Erro ao gerar URL de imagem otimizada:", error, originalUrl);
        return originalUrl; // Retorna a original em caso de erro.
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
