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

// Mostra uma notificação de feedback para o usuário
export const showNotification = (message, type = 'info') => {
    // Verifica se já existe um contêiner de notificações, se não, cria um
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);

        // Adiciona estilos para o contêiner
        const style = document.createElement('style');
        style.innerHTML = `
            #notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 9999;
            }
            .notification {
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: #fff;
                font-family: 'Rubik', sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                opacity: 0;
                transform: translateX(100%);
                animation: slideIn 0.5s forwards;
            }
            .notification.success {
                background-color: #28a745;
            }
            .notification.error {
                background-color: #dc3545;
            }
            .notification.info {
                background-color: #17a2b8;
            }
            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Remove a notificação após um tempo
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s forwards';
        // Remove o elemento após a animação
        notification.addEventListener('animationend', () => {
            notification.remove();
        });
    }, 4000); // A notificação fica visível por 4 segundos
};