E-commerce Olomi - Artigos Africanos e Religiosos
Bem-vindo ao repositório do projeto Olomi, um e-commerce completo desenvolvido com tecnologias web modernas e focado numa experiência de utilizador limpa e segura.

📜 Descrição
Olomi é uma plataforma de e-commerce concebida para a venda de artigos africanos e religiosos. O site permite que os clientes naveguem por um catálogo de produtos, calculem o frete, criem uma conta e finalizem as suas compras, enquanto oferece um painel administrativo completo para a gestão da loja.

O projeto foi construído inteiramente com tecnologias do lado do cliente (frontend), utilizando o Firebase como um poderoso Backend como um Serviço (BaaS) para gerir todos os dados e a autenticação.

✨ Funcionalidades Implementadas
Para Clientes:
Catálogo de Produtos: Visualização de produtos com pesquisa e filtro por categoria.

Página de Detalhes do Produto: Vista detalhada de cada item com descrição e imagens.

Controlo de Stock: Exibição da quantidade de stock disponível e bloqueio de compra para itens esgotados.

Carrinho de Compras: Adição de produtos, gestão de quantidades e remoção de itens.

Cálculo de Frete: Integração com a API dos Correios através de uma Cloud Function para calcular o valor do frete em tempo real.

Sistema de Autenticação: Os clientes podem criar uma conta, iniciar sessão e ter os seus dados guardados para compras futuras.

Painel "Minha Conta": Área para o cliente visualizar o seu histórico de encomendas e atualizar os seus dados de registo.

Checkout Seguro: O processo de finalização de compra exige que o utilizador esteja autenticado e preenche automaticamente os seus dados, finalizando o pedido através de uma mensagem formatada para o WhatsApp.

Para Administradores:
Painel de Administração Seguro: Acesso restrito a uma área de gestão protegida por autenticação e verificação de permissões.

Gestão Completa de Produtos: Funcionalidades para criar, editar (incluindo nome, preço, descrição, stock e imagem) e apagar produtos.

Gestão de Encomendas: Visualização de todas as encomendas recebidas, com a opção de atualizar o status para "Enviado" ou "Cancelado".

Redefinição de Senha: Opção para o administrador recuperar o acesso à sua conta.

🛠️ Tecnologias Utilizadas
Frontend:

HTML5

CSS3 (com Variáveis e Flexbox/Grid)

JavaScript (ES6 Modules, Vanilla JS)

Backend (Serviços Firebase):

Firebase Authentication: Para a gestão de utilizadores (clientes e administradores).

Firestore Database: Base de dados NoSQL para guardar produtos, encomendas, dados de utilizadores e permissões.

Firebase Storage: Para o armazenamento de imagens dos produtos.

Firebase Cloud Functions: Para a lógica do lado do servidor, como o cálculo de frete (resolvendo problemas de CORS).

Ferramentas e APIs:

Git & GitHub: Para o controlo de versão e alojamento do código.

API ViaCEP: Para o preenchimento automático de endereços durante o registo do cliente.

API dos Correios: Para o cálculo de frete em tempo real.

🚀 Como Executar o Projeto Localmente
Para configurar e executar este projeto na sua máquina local, siga os passos abaixo.

1. Clonar o Repositório
git clone https://github.com/arthurcmps/olomi.git
cd olomi

2. Configurar o Firebase
Aceda ao Console do Firebase e crie um novo projeto.

Ative os seguintes serviços no seu projeto: Authentication (com o provedor E-mail/Senha), Firestore Database e Storage.

Vá para Configurações do projeto (⚙️) > Geral e, na secção "Seus apps", crie uma nova aplicação Web.

Copie o objeto de configuração firebaseConfig.

3. Configurar as Credenciais
No seu projeto, localize o ficheiro js/firebase.js.

Cole o objeto firebaseConfig que copiou do Firebase, substituindo os valores de exemplo.

4. Configurar as Cloud Functions
Navegue para a pasta functions no seu terminal:

cd functions

Instale as dependências necessárias:

npm install firebase-functions firebase-admin axios xml2js cors

Volte para a pasta principal (cd ..).

5. Executar o Emulador Local
Para testar tudo localmente, utilize o emulador do Firebase:

firebase emulators:start

O site estará disponível em http://localhost:5000.

🔒 Nota de Segurança Importante: Criação do Administrador
O projeto inclui os ficheiros criar-admin.html e js/criar-admin.js com o único propósito de criar o primeiro utilizador administrador.

Após criar a sua conta de administrador com sucesso, é OBRIGATÓRIO apagar estes dois ficheiros do seu projeto antes de o publicar online. Deixá-los no site publicado representa uma falha de segurança.
