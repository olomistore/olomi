import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// --- ELEMENTOS DO FORMULÁRIO ---
const registerForm = document.getElementById('register-form');
const cepInput = registerForm.cep;
const streetInput = registerForm.street;
const neighborhoodInput = registerForm.neighborhood;
const cityInput = registerForm.city;
const stateInput = registerForm.state;
const numberInput = registerForm.number;
const phoneInput = registerForm.phone;

// --- FUNÇÕES ---

/**
 * Procura um endereço através da API ViaCEP e preenche os campos do formulário.
 * @param {string} cep - O CEP a ser procurado.
 */
const fetchAddress = async (cep) => {
    // Limpa os campos e mostra um feedback de carregamento
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

        // Preenche os campos com os dados da API
        streetInput.value = data.logradouro;
        neighborhoodInput.value = data.bairro;
        cityInput.value = data.localidade;
        stateInput.value = data.uf;

        // Move o foco para o campo de número para o utilizador preencher
        numberInput.focus();

    } catch (error) {
        alert(error.message);
        // Limpa os campos em caso de erro
        streetInput.value = '';
        neighborhoodInput.value = '';
        cityInput.value = '';
        stateInput.value = '';
    }
};

/**
 * Aplica uma máscara de telefone (ex: (XX) XXXXX-XXXX) a um campo de input.
 */
const maskPhone = (event) => {
    let input = event.target;
    input.value = phoneMask(input.value);
}

const phoneMask = (value) => {
    if (!value) return ""
    value = value.replace(/\D/g,'')
    value = value.replace(/(\d{2})(\d)/,"($1) $2")
    value = value.replace(/(\d)(\d{4})$/,"$1-$2")
    return value
}

// --- EVENT LISTENERS ---

cepInput.addEventListener('blur', () => {
    const cep = cepInput.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    if (cep.length === 8) {
        fetchAddress(cep);
    }
});

// Adiciona o evento de máscara ao campo de telefone
phoneInput.addEventListener('keyup', maskPhone);

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm).entries());

    if (data.password !== data.confirmPassword) {
        alert('As senhas não coincidem. Por favor, tente novamente.');
        return;
    }

    // A validação de minlength e pattern já é feita pelo HTML5,
    // mas mantemos a verificação de senha aqui.

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: {
                cep: data.cep,
                street: data.street,
                number: data.number,
                complement: data.complement || '',
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state
            },
            createdAt: new Date()
        });

        alert('Conta criada com sucesso!');
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Erro ao registar:", err);
        alert('Erro ao registar: ' + err.message);
    }
});
