import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { showNotification } from './utils.js';

const registerForm = document.getElementById('register-form');

if (registerForm) {
    const phoneInput = registerForm.phone;
    const cepInput = registerForm.cep;

    // Aplica a máscara de telefone dinamicamente
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        value = value.substring(0, 11); // Limita a 11 dígitos

        let formattedValue = '';
        if (value.length > 10) {
            // Celular com 9º dígito: (XX) XXXXX-XXXX
            formattedValue = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        } else if (value.length > 6) {
            // Telefone (fixo ou celular): (XX) XXXX-XXXX
            formattedValue = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
        } else if (value.length > 2) {
            // Apenas DDD e início do número: (XX) XXXX
            formattedValue = value.replace(/^(\d{2})(\d*)/, '($1) $2');
        } else if (value.length > 0) {
            // Apenas DDD: (XX
            formattedValue = value.replace(/^(\d*)/, '($1');
        }

        e.target.value = formattedValue;
    });

    // Lógica para buscar o CEP e preencher o endereço
    cepInput.addEventListener('input', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        e.target.value = cep; 

        if (cep.length === 8) {
            // Mostra feedback de carregamento
            registerForm.street.value = 'Buscando...';
            registerForm.neighborhood.value = 'Buscando...';
            registerForm.city.value = 'Buscando...';
            registerForm.state.value = 'Buscando...';

            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado.');
                
                const data = await response.json();
                if (data.erro) {
                    showNotification('CEP não localizado. Por favor, verifique o número.', 'error');
                     // Limpa os campos se o CEP for inválido
                    registerForm.street.value = '';
                    registerForm.neighborhood.value = '';
                    registerForm.city.value = '';
                    registerForm.state.value = '';
                    return;
                }

                registerForm.street.value = data.logradouro;
                registerForm.neighborhood.value = data.bairro;
                registerForm.city.value = data.localidade;
                registerForm.state.value = data.uf;
                
                registerForm.number.focus(); 

            } catch (error) {
                showNotification(`Erro ao buscar CEP: ${error.message}`, 'error');
                 // Limpa os campos em caso de erro
                registerForm.street.value = '';
                registerForm.neighborhood.value = '';
                registerForm.city.value = '';
                registerForm.state.value = '';
            }
        }
    });

    // Lógica para submeter o formulário de registo
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = registerForm.name.value.trim();
        const phone = phoneInput.value.replace(/\D/g, ''); // Limpa a máscara antes de enviar
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
        
        // Validação extra para o telefone
        if (phone.length < 10 || phone.length > 11) {
            showNotification('O telefone deve ter 10 ou 11 dígitos (DDD + número).', 'error');
            return;
        }
        
        // Validação extra para o CEP
        if (cep.length !== 8) {
            showNotification('O CEP deve ter 8 dígitos.', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                name,
                phone, // Salva o número limpo
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
