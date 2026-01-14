# 🔑 API Key Configurada no Lovable

## ✅ Configuração Atual

**API Key no Lovable:**
```
ps_test_key_123456
```

**Data de Configuração:** 13/01/2026

**Status:** ✅ Configurado e pronto para uso

---

## 📝 Como Usar

### 1. **No Frontend (Chaves e Integrações)**

Quando um usuário configurar o Premium Shears Scheduler no nosso frontend:

**Em "Chaves e Integrações" → "Sistema de Agendamento":**

- **URL da API:** `https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api`
- **API Key:** `ps_test_key_123456` ← **Usar esta chave**

### 2. **Como Funciona**

```
Nosso sistema faz requisição:
POST https://premium-shears-url/api/appointments
Authorization: Bearer ps_test_key_123456

Premium Shears valida:
- Se API_KEY secret = "ps_test_key_123456" → ✅ Permite
- Se diferente ou ausente → ❌ Retorna 401 (se validação obrigatória)
```

---

## 🔄 Fluxo de Autenticação

1. Usuário configura no frontend: `ps_test_key_123456`
2. Nosso sistema armazena criptografado no banco
3. Quando faz requisição para Premium Shears, envia no header:
   ```
   Authorization: Bearer ps_test_key_123456
   ```
4. Premium Shears compara com o secret `API_KEY` configurado
5. Se igual → ✅ Sucesso
6. Se diferente → ❌ Erro 401 (se validação obrigatória)

---

## ⚠️ Importante

- **Todos os usuários** do nosso sistema que quiserem usar autenticação devem usar esta mesma chave: `ps_test_key_123456`
- Esta é uma chave de **teste/desenvolvimento**
- Para produção, considere criar chaves únicas por usuário (multi-tenancy avançado)

---

## 🔐 Segurança

**Para produção futura:**

1. Gerar chaves únicas por usuário/estabelecimento
2. Armazenar no Premium Shears em uma tabela de validação
3. Validar baseado em `userId` + `apiKey`

**Para desenvolvimento atual:**

- Chave única compartilhada: `ps_test_key_123456`
- Funciona perfeitamente para testes

---

## 📞 Referências

- Documento completo: `LOVABLE-API-KEY-CONFIG.md`
- Especificação da API: `API-REST-PREMIUM-SHEARS.md`
- Prompt enviado ao Lovable: `PROMPT-LOVABLE.txt`

---

**Última atualização:** 13/01/2026
