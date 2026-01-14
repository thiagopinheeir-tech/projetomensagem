# 🔑 Como Configurar API_KEY no Lovable

## 📋 Contexto

O campo **API_KEY** no Lovable (Add Secret) é uma **variável de ambiente** que será usada pela edge function do Premium Shears para validar requisições que chegam na API REST.

---

## 🎯 O Que Colocar no API_KEY do Lovable?

### **OPÇÃO 1: Deixar Vazio (Recomendado para começar)**

Como a autenticação é **OPCIONAL**, você pode:

1. **Não adicionar o secret ainda** - Deixar vazio
2. A API funcionará sem validação de API Key
3. Você pode adicionar depois quando necessário

**Quando usar:** Para desenvolvimento/testes iniciais

---

### **OPÇÃO 2: Chave Global Temporária (Para testes)**

Se você quiser testar a autenticação, pode criar uma chave simples:

**Exemplo de chave:**
```
premium-shears-dev-key-2026-01-13
```

Ou gerar uma chave mais segura:
```
ps_sk_test_51a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6
```

**Quando usar:** Para testes da funcionalidade de autenticação

---

### **OPÇÃO 3: Chave por Usuário (Multi-tenant - Mais Avançado)**

Se você quiser suportar múltiplos usuários com diferentes API Keys, o Lovable precisaria:

1. **Criar uma tabela** no banco de dados do Premium Shears para armazenar:
   - `user_id` (ID do usuário do Premium Shears)
   - `api_key` (chave única por usuário)
   - `created_at`, `updated_at`

2. **Modificar a validação** para:
   - Buscar a API Key na tabela baseada no `userId` enviado
   - Validar se a key enviada no header corresponde à key armazenada

**Quando usar:** Produção com múltiplos clientes/estabelecimentos

---

## ✅ Recomendação Inicial

### Para Começar Agora:

**Deixe o campo API_KEY vazio ou use uma chave temporária simples:**

```
premium-shears-test-key-12345
```

**Motivos:**
1. ✅ A autenticação é opcional na especificação
2. ✅ Você pode testar a API sem precisar de chave
3. ✅ Pode adicionar validação mais complexa depois
4. ✅ Permite desenvolvimento rápido

---

## 🔄 Como Funciona na Prática

### Fluxo de Autenticação:

```
1. Nosso sistema faz requisição:
   POST https://premium-shears.com/api/appointments
   Authorization: Bearer {API_KEY_DO_USUARIO}
   
2. Edge Function do Premium Shears recebe
   
3. Se API_KEY secret estiver configurado:
   - Compara: API_KEY do header vs API_KEY do secret
   - Se for igual: ✅ Permite requisição
   - Se for diferente: ❌ Retorna 401
   
4. Se API_KEY secret NÃO estiver configurado:
   - ✅ Permite requisição (autenticação opcional)
```

---

## 📝 Implementação no Lovable

### Função de Validação (que o Lovable vai criar):

```typescript
function validateApiKey(requestHeaders: Headers): boolean {
  const apiKeySecret = Deno.env.get('API_KEY'); // Secret configurado no Lovable
  
  // Se não houver secret configurado, autenticação é opcional
  if (!apiKeySecret) {
    return true; // Permite requisição
  }
  
  // Buscar Authorization header
  const authHeader = requestHeaders.get('Authorization');
  if (!authHeader) {
    return false; // Se secret existe mas não tem header, nega
  }
  
  // Extrair token (Bearer {token})
  const token = authHeader.replace('Bearer ', '');
  
  // Comparar com secret
  return token === apiKeySecret;
}
```

---

## 🔧 Como Cada Usuário Configura Sua API Key

### No Nosso Frontend ("Chaves e Integrações"):

Cada usuário do nosso sistema pode configurar sua própria API Key no frontend:

```
1. Usuário acessa "Chaves e Integrações"
2. Seção "Sistema de Agendamento"
3. Campo "API Key" (opcional)
4. Usuário digita: "premium-shears-test-key-12345"
5. Sistema salva criptografado no banco
6. Quando nosso sistema faz requisição, envia essa key no header
```

### Problema de Multi-tenancy:

Se cada usuário tiver sua própria API Key, o Premium Shears precisa saber qual key é válida para qual usuário.

**Soluções possíveis:**

1. **Todas as keys iguais** (mais simples):
   - Todos os usuários usam a mesma key que está no secret do Lovable
   - Funciona, mas menos seguro

2. **Tabela de validação** (mais seguro):
   - Premium Shears tem tabela com userId → apiKey
   - Valida baseado no userId + apiKey
   - Mais complexo de implementar

3. **Sem autenticação** (para começar):
   - Deixar API_KEY vazio no Lovable
   - Todos podem acessar sem autenticação
   - Adicionar autenticação depois

---

## ✅ Resposta Final: O Que Fazer Agora

### **Coloque no API_KEY do Lovable:**

```
premium-shears-test-key-2026
```

**OU**

```
Deixe vazio (não adicione o secret)
```

**Recomendação:** Use uma chave simples para testes:
```
ps_test_key_123456
```

---

## 🔄 Próximos Passos

1. **Agora:** Configure uma chave simples no Lovable (ou deixe vazio)
2. **Teste:** Configure a mesma chave no nosso frontend e teste
3. **Depois:** Se precisar de multi-tenancy real, implemente tabela de validação

---

## 📞 Se Precisar de Multi-tenancy Completo

Se você precisar que cada usuário tenha sua própria API Key única, avise o Lovable:

**Prompt para o Lovable:**

```
Preciso implementar autenticação multi-tenant onde cada usuário tem sua própria API Key única.

Crie uma tabela no banco:
- user_api_keys: user_id, api_key, created_at, updated_at

Modifique a função validateApiKey() para:
1. Receber o userId da requisição (pode vir no body ou header)
2. Buscar a api_key correspondente ao userId na tabela
3. Comparar com a key enviada no header Authorization
4. Retornar true se válida, false se inválida
```

---

**Última atualização:** 13/01/2026 - 21:40
