# 🔧 Solução - Erro de Permissão RLS no Supabase

## Problema

Mesmo usando `SUPABASE_SERVICE_KEY`, ainda está recebendo o erro:
```
permission denied for table configurations
```

## Possíveis Causas

1. **RLS está habilitado na tabela** - Mesmo com SERVICE_KEY, às vezes há problemas se RLS estiver habilitado
2. **SERVICE_KEY incorreta** - A chave pode estar incorreta ou expirada
3. **Configuração do Supabase** - Pode haver políticas RLS conflitantes

## Soluções

### Solução 1: Desabilitar RLS temporariamente (RECOMENDADO PARA DESENVOLVIMENTO)

Execute este SQL no Supabase SQL Editor:

```sql
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;
```

**Como fazer:**
1. Acesse: https://app.supabase.com/project/hhhifxikyhvruwvmaduq
2. Vá em "SQL Editor"
3. Cole o comando acima
4. Execute (Run)
5. Teste novamente

### Solução 2: Verificar SERVICE_KEY

1. Acesse: https://app.supabase.com/project/hhhifxikyhvruwvmaduq
2. Vá em Settings → API
3. Copie a "service_role" key (a secreta, não a anon)
4. Confirme que está no `.env` como `SUPABASE_SERVICE_KEY`
5. Reinicie o servidor

### Solução 3: Criar política RLS permissiva (ALTERNATIVA)

Se quiser manter RLS habilitado:

```sql
-- Criar política que permite tudo (apenas para desenvolvimento)
CREATE POLICY "Allow all for service role" ON public.configurations
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**NOTA:** Esta política permite tudo, use apenas para desenvolvimento!

## Recomendação

Para desenvolvimento, a **Solução 1** (desabilitar RLS) é a mais simples e recomendada.

Para produção, você deve:
1. Manter RLS habilitado
2. Usar SERVICE_KEY no backend (já está configurado)
3. Criar políticas RLS apropriadas para segurança

## Após aplicar a solução

1. Execute o SQL no Supabase
2. Não precisa reiniciar o servidor (mudança no banco)
3. Teste salvar configurações novamente
4. Deve funcionar!
