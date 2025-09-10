import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { showNotification } from './utils.js';

const registerForm = document.getElementById('register-form');

if (registerForm) {
    const phoneInput = registerForm.phone;
    const cepInput = registerForm.cep;

    // Função para formatar o telefone
    const formatPhone = (value) => {
        if (!value) return "";
        value = value.replace(/\D/g, '');
        value = value.slice(0, 11);

        if (value.length > 10) {
            // (XX) XXXXX-XXXX
            return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length > 6) {
            // (XX) XXXX-XXXX
            return value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            // (XX) XXXX...
            return value.replace(/(\d{2})(\d+)/, '($1) $2');
        } else if (value.length > 0) {
            // (XX
            return `(${value}`;
        }
        return value;
    };

    phoneInput.addEventListener('input', (e) => {
        e.target.value = formatPhone(e.target.value);
    });

    // Função para limpar os campos de endereço
    const clearAddressFields = () => {
        registerForm.street.value = '';
        registerForm.neighborhood.value = '';
        registerForm.city.value = '';
        registerForm.state.value = '';
    };

    // Lógica para buscar o CEP e preencher o endereço
    cepInput.addEventListener('input', async (e) => {
        let cep = e.target.value.replace(/\D/g, '');
        cep = cep.slice(0, 8);
        e.target.value = cep; 

        if (cep.length < 8) {
            clearAddressFields();
            return;
        }

        if (cep.length === 8) {
            registerForm.street.value = 'Buscando...';
            registerForm.neighborhood.value = 'Buscando...';
            registerForm.city.value = 'Buscando...';
            registerForm.state.value = 'Buscando...';

            try {
                // Usando a BrasilAPI, que é mais confiável
                const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                
                if (!response.ok) {
                    // Se a resposta não for OK (ex: 404 Not Found), lança um erro
                    throw new Error('CEP não encontrado.');
                }
                
                const data = await response.json();

                // A BrasilAPI retorna um erro no corpo da resposta para CEPs mal formatados ou não encontrados
                if (data.type === 'service_error' || data.errors) {
                    showNotification('CEP não localizado. Por favor, verifique o número.', 'error');
                    clearAddressFields();
                    return;
                }

                // Preenche os campos com os dados recebidos
                registerForm.street.value = data.street;
                registerForm.neighborhood.value = data.neighborhood;
                registerForm.city.value = data.city;
                registerForm.state.value = data.state;
                
                // Move o foco para o campo de número
                registerForm.number.focus(); 

            } catch (error) {
                showNotification(`Erro ao buscar CEP: ${error.message}`, 'error');
                clearAddressFields();
            }
        }
    });

    // Lógica para submeter o formulário de registo
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = registerForm.name.value.trim();
        const phone = phoneInput.value.replace(/\D/g, '');
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const confirmPassword = registerForm.confirmPassword.value;
        
        const cep = cepInput.value.replace(/\D/g, '');
        const street = registerForm.street.value.trim();
        const number = registerForm.number.value.trim();
        const complement = registerForm.complement.value.trim();
        const neighborhood = registerForm.neighborhood.value.trim();
        const city = registerForm.city.value.trim();
        const state = registerForm.state.value.trim();

        if (password !== confirmPassword) {
            showNotification('As senhas não coincidem. Por favor, tente novamente.', 'error');
            return;
        }
        
        if (phone.length < 10 || phone.length > 11) {
            showNotification('O telefone deve ter 10 ou 11 dígitos (DDD + número).', 'error');
            return;
        }
        
        if (cep.length !== 8) {
            showNotification('O CEP deve ter 8 dígitos.', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                name,
                phone,
                email,
                address: {
                    cep,
                    street,
                    number,
                    complement,
                    neighborhood,
                    city,
                    state
                }
            });
            
            await setDoc(doc(db, 'roles', user.uid), { client: true });

            showNotification('Conta criada com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = 'minha-conta.html';
            }, 2000);

        } catch (error) {
            console.error("Erro no registo:", error);
            let errorMessage = 'Ocorreu um erro ao criar a sua conta.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este e-mail já está a ser utilizado. Tente fazer login.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'A senha é muito fraca. Tente uma mais forte.';
            }
            showNotification(errorMessage, 'error');
        }
    });
}
