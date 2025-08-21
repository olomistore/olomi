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
