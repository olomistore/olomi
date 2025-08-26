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


/**
 * ✅ NOVO: Configura a procura automática de endereço via CEP para um formulário.
 * @param {HTMLFormElement} formElement - O elemento do formulário que contém os campos de endereço.
 */
export function setupCepLookup(formElement) {
    const cepInput = formElement.querySelector('[name="cep"]');
    if (!cepInput) return; // Não faz nada se o campo CEP não existir

    cepInput.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, ''); // Remove tudo o que não for dígito

        if (cep.length !== 8) {
            return; // Não faz a procura se o CEP não tiver 8 dígitos
        }

        // Seleciona os campos de endereço dentro do formulário específico
        const streetInput = formElement.querySelector('[name="street"]');
        const neighborhoodInput = formElement.querySelector('[name="neighborhood"]');
        const cityInput = formElement.querySelector('[name="city"]');
        const stateInput = formElement.querySelector('[name="state"]');
        const numberInput = formElement.querySelector('[name="number"]');

        // Mostra um feedback de carregamento
        streetInput.value = 'A procurar...';
        neighborhoodInput.value = 'A procurar...';
        cityInput.value = 'A procurar...';
        stateInput.value = 'A procurar...';

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Não foi possível procurar o CEP.');
            
            const data = await response.json();

            if (data.erro) {
                throw new Error('CEP não encontrado.');
            }

            // Preenche os campos com os dados recebidos
            streetInput.value = data.logradouro;
            neighborhoodInput.value = data.bairro;
            cityInput.value = data.localidade;
            stateInput.value = data.uf;

            // Foca no campo de número, que é o próximo a ser preenchido
            numberInput.focus();

        } catch (error) {
            console.error("Erro ao procurar CEP:", error);
            // Limpa os campos em caso de erro para que o utilizador possa preencher manualmente
            streetInput.value = '';
            neighborhoodInput.value = '';
            cityInput.value = '';
            stateInput.value = '';
            alert(error.message);
        }
    });
}
