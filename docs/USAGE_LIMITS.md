# Tablix - Sistema de Limites e Uso

## Visao Geral

O Tablix controla o uso por plano usando **unificacoes** como unidade de medida. Uma unificacao e o processo completo de enviar planilhas, selecionar colunas e gerar o arquivo unificado.

A identificacao do usuario e feita por **fingerprint** (cookie + IP hash) sem necessidade de login. O plano e determinado via token JWT do backend Fastify (ainda nao integrado — atualmente todos os usuarios sao `free`).

**Fonte de verdade:** `src/lib/limits.ts`

## Limites por Plano

### Free

| Recurso | Limite |
|---------|--------|
| Unificacoes por mes | 1 |
| Arquivos por unificacao | 3 |
| Tamanho maximo (total) | 1MB |
| Linhas (total entre arquivos) | 500 |
| Colunas selecionaveis | 3 |
| Processamento prioritario | Nao |
| Marca d'agua | Sim |
| Historico | Nao |

### Pro

| Recurso | Limite |
|---------|--------|
| Unificacoes por mes | 40 |
| Arquivos por unificacao | 15 |
| Tamanho maximo (por arquivo) | 2MB |
| Tamanho maximo (total) | 30MB |
| Linhas (por arquivo) | 5.000 |
| Colunas selecionaveis | 10 |
| Processamento prioritario | Sim |
| Marca d'agua | Nao |
| Historico | 30 dias |

### Enterprise

| Recurso | Limite |
|---------|--------|
| Unificacoes por mes | Ilimitado |
| Arquivos por unificacao | Ilimitado |
| Tamanho maximo (por arquivo) | 50MB |
| Tamanho maximo (total) | Ilimitado |
| Linhas | Ilimitado |
| Colunas selecionaveis | Ilimitado |
| Processamento prioritario | Sim |
| Marca d'agua | Nao |
| Historico | 90 dias |

## Identificacao de Usuario (Fingerprint)

**Arquivo:** `src/lib/fingerprint.ts`

O sistema usa cookie persistente + IP para identificar usuarios sem login:

1. Cookie httpOnly, Secure em producao, SameSite=Strict, 1 ano de vida
2. IP extraido de headers de proxy reverso com fallback local
3. Fingerprint derivado do cookie + IP, hasheado para privacidade

O fingerprint e temporario. Quando a integracao com o backend Fastify (auth JWT) estiver pronta, a identificacao sera por User ID.

## Contagem de Unificacoes

**Arquivo:** `src/lib/usage-tracker.ts`

- Contadores mensais armazenados no Redis com TTL automatico
- Incremento atomico no Redis para prevenir race conditions
- Fallback in-memory para desenvolvimento (sem persistencia entre restarts)

Fluxo:
1. `/api/preview` — verifica quota mas **nao incrementa**
2. `/api/process` ou `/api/unification/complete` — consome token + incrementa atomicamente

Isso garante que a quota so e consumida apos processamento real, nao no preview.

## Endpoints da API

### GET /api/health

Health check do servico.

**Response shallow (200):**
```json
{ "status": "ok", "timestamp": "<ISO>" }
```

**Response deep com `?deep=true` + `X-Health-Secret` (200):**
```json
{ "status": "ok|degraded", "timestamp": "<ISO>", "checks": { "redis": "ok|error" } }
```

**Rate limiting:** 100 req/min (rateLimiters.api)

---

### GET /api/usage

Retorna estatisticas de uso do usuario.

**Response (200):**
```json
{
  "plan": "free",
  "unifications": {
    "current": 0,
    "max": 1,
    "remaining": 1
  },
  "limits": {
    "maxInputFiles": 3,
    "maxFileSize": 1048576,
    "maxTotalSize": 1048576,
    "maxRows": 500,
    "maxColumns": 3
  }
}
```

### POST /api/preview

Envia 1 arquivo para validacao e extracao de colunas. Nao incrementa a quota.

**Response (200):**
```json
{
  "columns": ["ID", "Nome", "Email"],
  "unificationToken": "<token>",
  "usage": {
    "current": 0,
    "max": 1,
    "remaining": 1
  }
}
```

**Erros possiveis:** 400 (validacao), 403 (quota/CSRF), 413 (body grande), 415 (Content-Type), 429 (rate limit), 500 (interno)

### POST /api/process

Processa unificacao. Consome token + incrementa quota.

**Erros possiveis:** mesmos do preview + 403 (token invalido/expirado)

### POST /api/unification/complete

Registra a conclusao de uma unificacao. Consome token + incrementa quota atomicamente. Usado no fluxo client-side (processamento Free).

**Response (200):**
```json
{
  "success": true,
  "unifications": {
    "current": 1,
    "max": 1,
    "remaining": 0
  }
}
```

**Erros possiveis:** 400 (body invalido), 403 (token/quota), 413 (body grande), 415 (Content-Type), 429 (rate limit), 500 (interno)

## Rate Limiting

**Arquivo:** `src/lib/security/rate-limit.ts`

| Endpoint | Limite | Intervalo |
|----------|--------|-----------|
| Upload (`/api/preview`) | 10 req | 1 min |
| Process (`/api/process`) | 5 req | 1 min |
| Geral (`/api/usage`, `/api/unification/complete`) | 100 req | 1 min |

- **Producao:** Upstash Redis (sliding window) — efetivo em ambiente serverless
- **Desenvolvimento:** in-memory fallback (nao persiste entre invocacoes)
- **Producao sem Redis:** fail-closed (rejeita requests)

Headers na resposta: `X-RateLimit-Remaining`, `Retry-After: 60` (em 429)

## Proximos Passos

1. Integrar auth JWT do backend Fastify — substituir fingerprint por User ID
2. Associar plano ao usuario autenticado
3. Manter rate limiting por IP (anti-DDoS) independente da auth
4. Implementar parsing real de arquivos (atualmente stubs)

---

**Atualizado em:** 2026-04-06
