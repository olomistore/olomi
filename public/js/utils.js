// Formata um número para a moeda BRL (Real Brasileiro)
export const BRL = (value) => {
    if (typeof value !== 'number') {
        value = 0;
    }
    return (value / 100).toLocaleString('pt-BR', {
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

export function setupCepLookup(formElement) {
    const cepInput = formElement.querySelector('[name="cep"]');
    if (!cepInput) return;

    cepInput.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;

        const streetInput = formElement.querySelector('[name="street"]');
        const neighborhoodInput = formElement.querySelector('[name="neighborhood"]');
        const cityInput = formElement.querySelector('[name="city"]');
        const stateInput = formElement.querySelector('[name="state"]');
        const numberInput = formElement.querySelector('[name="number"]');

        streetInput.value = 'A procurar...';
        neighborhoodInput.value = 'A procurar...';
        cityInput.value = 'A procurar...';
        stateInput.value = 'A procurar...';

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Não foi possível procurar o CEP.');
            
            const data = await response.json();
            if (data.erro) throw new Error('CEP não encontrado.');

            streetInput.value = data.logradouro;
            neighborhoodInput.value = data.bairro;
            cityInput.value = data.localidade;
            stateInput.value = data.uf;
            numberInput.focus();

        } catch (error) {
            console.error("Erro ao procurar CEP:", error);
            streetInput.value = '';
            neighborhoodInput.value = '';
            cityInput.value = '';
            stateInput.value = '';
            // ✅ ALTERAÇÃO: Usa a nova função de notificação
            showNotification(error.message, 'error');
        }
    });
}

/**
 * ✅ NOVO: Mostra uma notificação "toast" no ecrã.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success' ou 'error').
 */
export function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    // Cria o container se ele não existir
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `toast-notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Remove a notificação após a animação de fadeOut terminar (5 segundos no total)
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
