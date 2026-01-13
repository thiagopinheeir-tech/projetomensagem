# Top Active WhatsApp 2.0 - Backend Local

Backend completo para automação de WhatsApp usando Node.js, Express e PostgreSQL.

## 📋 Pré-requisitos

- Node.js (v16 ou superior)
- Docker e Docker Compose
- npm ou yarn

## 🚀 Instalação e Configuração

### 1. Clonar e instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações. O arquivo já vem configurado para uso local.

### 3. Subir o banco de dados PostgreSQL

```bash
npm run db:up
```

Ou usando docker-compose diretamente:

```bash
docker-compose up -d
```

Isso irá iniciar um container PostgreSQL na porta 5432.

### 4. Criar as tabelas no banco de dados

Você pode executar o schema SQL de várias formas:

**Opção 1: Usando script npm (Recomendado)**

```bash
npm run db:init
```

**Opção 2: Usando psql via Docker**

```bash
# Copiar o arquivo para o container e executar
docker cp sql/schema.sql top_active_db:/tmp/schema.sql
docker exec -it top_active_db psql -U postgres -d top_active_whatsapp -f /tmp/schema.sql
```

**Opção 3: Usando psql diretamente no container**

```bash
# Conectar ao container
docker exec -it top_active_db psql -U postgres -d top_active_whatsapp

# Dentro do psql, copiar e colar o conteúdo do arquivo sql/schema.sql
```

**Opção 4: Usando psql localmente (se instalado)**

```bash
psql -h localhost -U postgres -d top_active_whatsapp -f sql/schema.sql
```

### 5. Iniciar o servidor

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:5000`

## 🏗️ Estrutura do Projeto

```
top-active-whatsapp/
├── config/
│   └── database.js          # Configuração do PostgreSQL
├── controllers/
│   ├── authController.js    # Lógica de autenticação
│   └── userController.js    # Lógica de usuários
├── middleware/
│   ├── auth.js              # Middleware de autenticação JWT
│   ├── errorHandler.js      # Tratamento de erros
│   └── logger.js            # Logger de requisições
├── routes/
│   ├── auth.js              # Rotas de autenticação
│   └── users.js             # Rotas de usuários
├── sql/
│   └── schema.sql           # Schema do banco de dados
├── docker-compose.yml       # Configuração do Docker
├── server.js                # Entry point da aplicação
└── package.json
```

## 🔌 Endpoints da API

### Autenticação (Público)

#### POST /api/auth/register
Registra um novo usuário.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "full_name": "João Silva",
  "company_name": "Minha Empresa"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso",
  "user": {
    "id": 1,
    "uuid": "abc-123...",
    "email": "user@example.com",
    "full_name": "João Silva",
    "company_name": "Minha Empresa",
    "plan": "free",
    "created_at": "2026-01-09T..."
  },
  "token": "eyJhbGc..."
}
```

#### POST /api/auth/login
Autentica um usuário existente.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "uuid": "abc-123...",
    "email": "user@example.com",
    "full_name": "João Silva",
    "plan": "free"
  },
  "token": "eyJhbGc..."
}
```

#### GET /api/auth/verify
Verifica se o token JWT é válido (requer autenticação).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "uuid": "abc-123...",
    "email": "user@example.com",
    ...
  }
}
```

### Usuários (Protegido - requer autenticação)

#### GET /api/users/profile
Retorna o perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /api/users/profile
Atualiza o perfil do usuário.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "full_name": "João Pedro Silva",
  "company_name": "Nova Empresa",
  "phone": "5511999999999",
  "plan": "pro"
}
```

### Health Check

#### GET /health
Verifica o status da aplicação e conexão com o banco.

**Response:**
```json
{
  "status": "ok",
  "database": true,
  "timestamp": "2026-01-09T...",
  "uptime": 123.456
}
```

## 🧪 Testando os Endpoints

### Usando curl

```bash
# Registrar usuário
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123",
    "full_name": "Teste Usuário"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'

# Verificar perfil (substitua YOUR_TOKEN pelo token retornado no login)
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Atualizar perfil
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Nome Atualizado",
    "company_name": "Nova Empresa"
  }'

# Health check
curl http://localhost:5000/health
```

### Usando Insomnia/Postman

1. Importe os endpoints acima
2. Para endpoints protegidos, adicione o header `Authorization: Bearer <seu_token>`
3. Use o token retornado no `/api/auth/login` ou `/api/auth/register`

## 🛠️ Scripts NPM

```bash
npm run dev        # Inicia servidor em modo desenvolvimento (nodemon)
npm start          # Inicia servidor em modo produção
npm run db:up      # Sobe o banco de dados via Docker
npm run db:down    # Para e remove o container do banco
npm run db:init    # Executa o schema SQL para criar as tabelas
```

## 🗄️ Banco de Dados

### Estrutura das Tabelas

- **users**: Usuários do sistema
- **messages**: Mensagens enviadas
- **contacts**: Contatos dos usuários

### Acessar o banco via Docker

```bash
# Entrar no container
docker exec -it top_active_db psql -U postgres -d top_active_whatsapp

# Comandos úteis
\dt              # Listar tabelas
\d users         # Descrever tabela users
\q               # Sair
```

### Parar o banco

```bash
npm run db:down
```

## 🔒 Segurança

- Passwords são hashados com bcrypt (10 rounds)
- JWT tokens com expiração configurável (padrão: 7 dias)
- Rate limiting: 100 requisições por 15 minutos
- CORS configurado
- Helmet.js para headers de segurança

## 📝 Variáveis de Ambiente

Principais variáveis no arquivo `.env`:

- `PORT`: Porta do servidor (padrão: 5000)
- `DATABASE_URL`: URL completa de conexão do banco
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Configurações individuais do banco
- `JWT_SECRET`: Chave secreta para JWT (gerar uma chave forte!)
- `CORS_ORIGIN`: Origem permitida para CORS

## 🐛 Troubleshooting

### Erro de conexão com o banco

1. Verifique se o Docker está rodando: `docker ps`
2. Verifique se o container está ativo: `docker ps | grep top_active_db`
3. Teste a conexão: `npm run dev` e acesse `/health`

### Erro ao criar tabelas

1. Verifique se o banco existe: `docker exec -it top_active_db psql -U postgres -l`
2. Certifique-se de estar executando o schema no banco correto

### Porta 5432 já em uso

Se você já tem PostgreSQL rodando localmente, você pode:
- Parar o PostgreSQL local
- Ou alterar a porta no `docker-compose.yml` e no `.env`

## 📚 Próximos Passos

Após configurar localmente, você pode:

1. Implementar as outras rotas (mensagens, contatos, grupos, chatbots)
2. Adicionar validação mais robusta com express-validator
3. Implementar testes automatizados
4. Migrar para Supabase quando estiver pronto

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação completa em `README-BACKEND.md`.
