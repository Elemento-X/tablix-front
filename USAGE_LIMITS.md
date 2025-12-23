# Tablix - Sistema de Limites de Upload

## 📋 Visão Geral

O Tablix implementa um sistema de limites de upload por plano que rastreia o uso mensal de cada usuário **sem requerer autenticação**.

## 🎯 Limites por Plano

### Plano Free
- **Uploads por mês:** 3
- **Tamanho máximo do arquivo:** 2MB
- **Máximo de linhas:** 500
- **Máximo de colunas:** 3

### Plano Pro
- **Uploads por mês:** 20
- **Tamanho máximo do arquivo:** 10MB
- **Máximo de linhas:** 5,000
- **Máximo de colunas:** 10
- **Recursos extras:** Processamento prioritário, sem marca d'água, histórico de 30 dias

### Plano Enterprise
- **Uploads por mês:** Ilimitado
- **Tamanho máximo do arquivo:** 50MB
- **Máximo de linhas:** Ilimitado
- **Máximo de colunas:** Ilimitado
- **Recursos extras:** Todos os recursos Pro + SLA garantido + infraestrutura dedicada

## 🔍 Como Funciona

### 1. Identificação de Usuário (Fingerprint)

O sistema usa uma combinação de **cookie + IP** para identificar usuários:

```typescript
// Cookie persistente (1 ano)
tablix_fp = "timestamp-randomid"

// Fingerprint final (hash)
fingerprint = SHA256(cookie_id + ip_address)
```

**Vantagens:**
- Não requer login
- Rastreamento confiável mesmo sem autenticação
- Hash para privacidade

### 2. Contador de Uploads Mensal

Os uploads são contados **mensalmente** e resetam automaticamente:

```typescript
// Chave no Redis
upload:{fingerprint}:2024-12

// Exemplo
upload:a1b2c3d4...:2024-12 = 2  // 2 uploads em dezembro de 2024
```

**Regras:**
- Contador incrementa apenas **após validação bem-sucedida**
- Reset automático no início de cada mês
- Expiração automática dos dados antigos

### 3. Fluxo de Validação

```
1. Request chega em /api/preview
2. ✅ Verifica rate limiting (anti-DDoS)
3. ✅ Obtém fingerprint do usuário
4. ✅ Verifica quota mensal (upload count)
5. ✅ Valida tamanho do arquivo (plan limit)
6. ✅ Valida tipo e extensão do arquivo
7. ✅ Processa arquivo
8. ✅ Incrementa contador (somente se tudo passou)
9. ✅ Retorna resposta com usage info
```

## 🛠️ Configuração

### 1. Criar Banco Redis (Upstash)

1. Acesse [Upstash Console](https://console.upstash.com/)
2. Crie uma conta (gratuita)
3. Crie um novo Redis database
4. Copie as credenciais:
   - **REST URL**
   - **REST TOKEN**

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Importante:** Se não configurar o Redis, o sistema usa **in-memory fallback** (não recomendado para produção).

### 3. Deploy na Vercel

As variáveis de ambiente são automaticamente detectadas:

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

## 📡 Endpoints da API

### GET /api/usage

Retorna estatísticas de uso do usuário atual:

**Response:**
```json
{
  "plan": "free",
  "uploads": {
    "current": 2,
    "max": 3,
    "remaining": 1
  },
  "limits": {
    "maxFileSize": 2097152,
    "maxRows": 500,
    "maxColumns": 3
  }
}
```

### POST /api/preview

Faz upload e análise do arquivo.

**Success Response (200):**
```json
{
  "columns": ["ID", "Nome", "Email"],
  "usage": {
    "current": 1,
    "max": 3,
    "remaining": 2
  }
}
```

**Error Response (403 - Limite Excedido):**
```json
{
  "error": "Upload limit exceeded. Upgrade to Pro for more uploads.",
  "errorCode": "LIMIT_EXCEEDED",
  "usage": {
    "current": 3,
    "max": 3,
    "remaining": 0
  }
}
```

**Error Response (403 - Arquivo Muito Grande):**
```json
{
  "error": "File too large. Maximum file size for Free plan is 2 MB.",
  "errorCode": "FILE_TOO_LARGE",
  "maxSize": 2097152
}
```

## 🧪 Testes

### Testar Plano Diferente (Development)

Use o header `x-tablix-plan`:

```bash
curl -X POST http://localhost:3000/api/preview \
  -H "x-tablix-plan: pro" \
  -F "files=@test.csv"
```

### Resetar Contador (Development)

O contador reseta automaticamente todo mês, mas você pode limpar manualmente no Redis:

```bash
# Upstash Console -> Data Browser
DEL upload:{fingerprint}:2024-12
```

## 🔒 Segurança

### Proteções Implementadas

1. **Rate Limiting (IP-based)**
   - Previne ataques DDoS
   - 20 uploads/min por IP

2. **Validação de Arquivo**
   - Tipo e extensão verificados
   - Magic number validation
   - Sanitização de nome de arquivo

3. **Quota por Plano**
   - Limite mensal de uploads
   - Limite de tamanho de arquivo
   - Validação antes de processar

4. **Fingerprint Hash**
   - SHA-256 para privacidade
   - Cookie httpOnly + secure

### Limitações Conhecidas

1. **IPs Compartilhados**
   - Usuários em NAT corporativo compartilham contador
   - Mitigado com cookie persistente

2. **Cookie Clearing**
   - Usuário pode limpar cookies para novo fingerprint
   - IP permanece no hash (dificulta bypass)

3. **VPN Rotation**
   - Usuário técnico pode trocar IP + cookie
   - Rate limiting de curto prazo mitiga abuso

## 📊 Monitoramento

### Logs Úteis

```typescript
// Console logs automáticos
[Upload] User uploaded file. New count: 2/3
[Redis] Upstash Redis not configured. Using in-memory fallback.
File name sanitized: ../../../etc/passwd.csv -> etc_passwd.csv
```

### Métricas Importantes

- Uploads por plano (quantos Free vs Pro)
- Taxa de limite excedido (403 errors)
- Tamanho médio de arquivo
- Distribuição de uso mensal

## 🚀 Próximos Passos

Quando implementar autenticação:

1. Substituir fingerprint por **User ID**
2. Associar plano ao usuário no banco
3. Manter rate limiting por IP (anti-DDoS)
4. Adicionar billing integration

```typescript
// Futuro: com autenticação
export function getUserPlan(request: NextRequest): PlanType {
  const token = request.headers.get('authorization')
  const user = await verifyToken(token)
  return user.plan // 'free' | 'pro' | 'enterprise'
}
```

## 📞 Suporte

Para questões sobre limites:
- **Free:** Ver documentação
- **Pro:** Email support
- **Enterprise:** Dedicated support channel

---

**Documentação atualizada em:** 2025-12-22
