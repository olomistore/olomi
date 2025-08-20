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

// --- FUNÇÃO DE BUSCA DE ENDEREÇO (VIA VIACEP) ---
const fetchAddress = async (cep) => {
    // Limpa os campos e mostra feedback de carregamento
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

// --- EVENT LISTENERS ---

// Adiciona o evento para procurar o CEP quando o utilizador sai do campo
cepInput.addEventListener('blur', () => {
    const cep = cepInput.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    if (cep.length === 8) {
        fetchAddress(cep);
    }
});

// Evento de submit do formulário de cadastro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm).entries());

    // --- VALIDAÇÃO DA SENHA ADICIONADA ---
    if (data.password !== data.confirmPassword) {
        alert('As senhas não coincidem. Por favor, tente novamente.');
        return; // Interrompe a execução se as senhas forem diferentes
    }

    if (data.password.length < 6) {
        alert('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    try {
        // 1. Cria o utilizador no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        // 2. Guarda as informações completas no Firestore
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
