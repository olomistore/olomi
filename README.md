# Projeto E-commerce Olomi

Este é um projeto de e-commerce completo construído com HTML, CSS e JavaScript puros, utilizando o Firebase como backend. A plataforma inclui funcionalidades tanto para clientes quanto para administradores.

## Visão Geral

O projeto consiste em uma loja virtual onde os clientes podem navegar por produtos, adicioná-los ao carrinho e gerenciar suas contas. Há também um painel administrativo para gerenciar produtos, visualizar pedidos e administrar o site.

## Tecnologias Utilizadas

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript (ES6 Modules)

- **Backend (Firebase):**
  - **Firebase Authentication:** Para autenticação de usuários (clientes e administradores).
  - **Firestore:** Como banco de dados NoSQL para armazenar informações de produtos, pedidos e usuários.
  - **Firebase Storage:** Para armazenamento de imagens de produtos.
  - **Firebase Hosting:** Para hospedar o site.

- **Ferramentas e Bibliotecas:**
  - **SweetAlert2:** Para notificações e modais elegantes.

## Estrutura do Projeto

O projeto está organizado da seguinte forma:

```
/
|-- functions/               # Cloud Functions (backend em Node.js)
|   |-- index.js
|   `-- package.json
|-- public/                  # Arquivos públicos (frontend)
|   |-- css/                 # Estilos CSS
|   |-- js/                  # Scripts JavaScript
|   |-- assets/              # Imagens e outros recursos
|   |-- admin.html           # Painel de administração
|   |-- carrinho.html        # Página do carrinho de compras
|   |-- index.html           # Página inicial da loja
|   |-- login.html           # Página de login do administrador
|   |-- login-cliente.html   # Página de login do cliente
|   |-- produto.html         # Página de detalhes do produto
|   `-- ... (outras páginas)
|-- firebase.json            # Configurações de deploy do Firebase
|-- firestore.rules          # Regras de segurança do Firestore
|-- storage.rules            # Regras de segurança do Firebase Storage
|-- README.md                # Este arquivo
```

## Funcionalidades

### Para Clientes:
- Cadastro e Login de clientes.
- Redefinição de senha.
- Navegação pelo catálogo de produtos.
- Visualização de detalhes dos produtos.
- Adicionar produtos ao carrinho de compras.
- Gerenciar itens no carrinho (adicionar, remover, atualizar quantidade).
- Acesso a uma área "Minha Conta" para visualizar o histórico de pedidos e gerenciar dados pessoais.

### Para Administradores:
- Login seguro em um painel de administração.
- Gerenciamento de produtos (CRUD - Criar, Ler, Atualizar, Deletar).
- Visualização de todos os pedidos realizados.
- Criação de contas de administrador.

## Como Configurar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/arthurcmps/olomi.git
   cd seu-repositorio
   ```

2. **Configure o Firebase:**
   - Crie um novo projeto no [Firebase Console](https://console.firebase.google.com/).
   - Na página do seu projeto, adicione um novo aplicativo da Web.
   - Copie as credenciais de configuração do Firebase.
   - Cole suas credenciais no arquivo `public/js/firebase.js`.
   - Ative os seguintes serviços do Firebase no console:
     - **Authentication:** Ative o provedor "E-mail/senha".
     - **Firestore:** Crie um banco de dados.
     - **Storage:** Configure o armazenamento.

3. **Instale as dependências das Cloud Functions:**
   ```bash
   cd functions
   npm install
   ```

## Como Executar o Projeto Localmente

Para testar o projeto localmente, você pode usar o Firebase Emulator Suite, que permite simular os serviços do Firebase na sua máquina.

1. **Instale o Firebase CLI:**
   Se ainda não o tiver, instale a CLI do Firebase globalmente:
   ```bash
   npm install -g firebase-tools
   ```

2. **Inicie os emuladores:**
   Na raiz do projeto, execute:
   ```bash
   firebase emulators:start
   ```

3. **Acesse o site:**
   - O site estará disponível em `http://localhost:5000`.
   - A interface dos emuladores estará em `http://localhost:4000`.

## Deploy

Para fazer o deploy do projeto no Firebase Hosting, execute o seguinte comando na raiz do projeto:

```bash
firebase deploy
```
