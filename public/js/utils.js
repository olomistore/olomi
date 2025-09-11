// Formata um número para a moeda BRL (Real Brasileiro)
export const BRL = (value) => {
    if (typeof value !== 'number') {
        value = 0;
    }
    // ✅ CORREÇÃO: Remove a divisão por 100, pois o preço já está no formato correto.
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

// Converte um valor em string (ex: "19.90") para cêntimos (ex: 1990)
export const toCents = (value) => {
    if (typeof value === 'string') {
        value = value.replace(',', '.');
    }
    return Math.round(parseFloat(value) * 100);
};

// Armazenamento local para o carrinho de compras
export const cartStore = {
    get: () => {
        const json = localStorage.getItem('cart');
        return json ? JSON.parse(json) : [];
    },
    set: (cart) => {
        localStorage.setItem('cart', JSON.stringify(cart));
    },
    clear: () => {
        localStorage.removeItem('cart');
    }
};

/**
 * Exibe um "toast" (pequena notificação) estilizado.
 * @param {string} title - A mensagem a ser exibida.
 * @param {string} icon - O tipo de ícone ('success', 'error', 'warning', 'info', 'question').
 */
export const showToast = (title, icon = 'success') => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    Toast.fire({
        icon: icon,
        title: title
    });
};

/**
 * Exibe uma caixa de diálogo de confirmação estilizada.
 * @param {string} title - O título da caixa de diálogo.
 * @param {string} text - O texto de apoio da caixa de diálogo.
 * @returns {Promise<boolean>} - Retorna uma promessa que resolve para `true` se o usuário confirmar, e `false` caso contrário.
 */
export const showConfirmation = (title, text) => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f39c12', // Laranja
        cancelButtonColor: '#95a5a6', // Cinza
        confirmButtonText: 'Sim, pode apagar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        return result.isConfirmed;
    });
};
