# Tablix - Security

## Sumario

1. [Security Headers e CSP](#security-headers-e-csp)
2. [CSRF Protection](#csrf-protection)
3. [Rate Limiting](#rate-limiting)
4. [Validacao de Arquivos](#validacao-de-arquivos)
5. [Sanitizacao de Input](#sanitizacao-de-input)
6. [Unification Token](#unification-token)
7. [Audit Logging](#audit-logging)
8. [API Routes](#api-routes)

---

## Security Headers e CSP

**Arquivo:** `src/proxy.ts`

Todos os headers sao aplicados via funcao `proxy()` exportada de `src/proxy.ts`, invocada pelo middleware do Next.js em todas as rotas (exceto assets estaticos definidos no matcher).

### Headers fixos

| Header | Valor |
|--------|-------|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| X-DNS-Prefetch-Control | `on` |

### Permissions-Policy

Desabilita APIs desnecessarias: camera, microphone, geolocation, accelerometer, gyroscope, magnetometer, payment, usb, bluetooth, serial, midi, display-capture, xr-spatial-tracking, browsing-topics.

### Content-Security-Policy

**Producao:**
- `script-src 'self' 'nonce-{random}' 'strict-dynamic' https://vercel.live https://*.vercel-scripts.com` — nonce gerado por request, propagado via request headers (invisivel ao browser)
- `style-src 'self' 'unsafe-inline'` — necessario para Framer Motion (inline style attributes) e componentes com style={} dinamico
- `connect-src 'self' https://vercel.live https://*.vercel-insights.com https://*.vercel-scripts.com https://*.ingest.sentry.io <NEXT_PUBLIC_POSTHOG_HOST>` (PostHog host injetado dinamicamente via `process.env.NEXT_PUBLIC_POSTHOG_HOST`; padrão `https://us.i.posthog.com`)
- `worker-src 'self'`
- `frame-src 'self' https://vercel.live`
- `default-src 'self'`, `img-src 'self' data: blob: https:`, `font-src 'self' data:`
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`
- `upgrade-insecure-requests` (somente producao)

**Desenvolvimento:**
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com` — HMR requer eval
- `connect-src` inclui `ws://localhost:* ws://127.0.0.1:* ws://0.0.0.0:*` para WebSocket do HMR
- Sem nonce, strict-dynamic ou upgrade-insecure-requests

**Fluxo do nonce:**
1. `proxy()` gera nonce unico por request
2. Nonce injetado como request header (`x-nonce`) pelo proxy, consumido exclusivamente em server components — nunca chega ao browser
3. Layout server-side le o nonce e injeta nos scripts permitidos

---

## CSRF Protection

**Arquivo:** `src/proxy.ts`

Protecao CSRF em duas camadas para requests state-changing em `/api/*`:

### Camada 1: Validacao de Origin

- Metodos protegidos: POST, PUT, PATCH, DELETE
- Metodos isentos: GET, HEAD, OPTIONS
- Rotas protegidas: apenas `/api/*`
- Verificacao: `Origin` header deve ter mesmo host que `Host` header
- Sem Origin ou com Origin malformada: 403 `{ error: "Forbidden" }`
- Mensagem generica — nao revela detalhes da validacao

### Camada 2: Double-Submit Cookie

- Cookie `__csrf` setado automaticamente pelo proxy quando ausente
- Configuracao do cookie: `httpOnly: false` (deve ser legivel por JS), `sameSite: strict`, `secure` em producao, `maxAge: 24h`
- Validacao: header `X-CSRF-Token` deve ser identico ao valor do cookie `__csrf`
- Ausencia do cookie, do header, ou divergencia entre eles: 403 `{ error: "Forbidden" }`
- O frontend deve ler o cookie `__csrf` e enviar como header `X-CSRF-Token` em toda request state-changing

---

## Rate Limiting

**Arquivo:** `src/lib/security/rate-limit.ts`

### Configuracoes

| Endpoint | Limite | Intervalo |
|----------|--------|-----------|
| `/api/preview` | 10 req/min | 60s |
| `/api/process` | 5 req/min | 60s |
| `/api/usage`, `/api/unification/complete` | 100 req/min | 60s |

### Implementacao

- **Producao:** Upstash Redis (sliding window)
- **Desenvolvimento:** in-memory fallback com cleanup periodico
- **Producao sem Redis:** fail-closed — rejeita request (in-memory nao funciona em serverless)

### Circuit Breaker

Previne falhas em cascata quando o Redis esta indisponivel:

- **Closed** (normal): requests vao ao Redis normalmente
- **Open** (apos 3 falhas consecutivas): pula Redis por 30s, usa in-memory como fallback degradado
- **Half-Open** (apos 30s): tenta 1 request ao Redis. Se sucesso, volta a Closed. Se falha, volta a Open.

Em producao, se o circuito nao esta aberto e o Redis falha, o comportamento e fail-closed (rejeita o request). Se o circuito esta aberto, usa in-memory como modo degradado.

### Identificacao

IP extraido via headers padrao de proxy reverso com fallback seguro

### Resposta 429

```json
{ "error": "Too many requests. Please try again later." }
```
Headers: `X-RateLimit-Remaining: 0`, `Retry-After: 60`

---

## Validacao de Arquivos

**Arquivo:** `src/lib/security/file-validator.ts`

### Camadas de validacao

1. **Tamanho:** minimo > 0, maximo 10MB (validacao generica do validator; limites por plano aplicados separadamente em `usage-tracker.ts`)
2. **Extensao:** `.csv`, `.xls`, `.xlsx` (case-insensitive)
3. **MIME type:** `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
4. **Filename patterns:** rejeita path traversal (`..`), caracteres invalidos, null bytes, nomes reservados do Windows, extensoes executaveis (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`)
5. **Magic numbers:** ZIP signature para XLSX, CDF signature para XLS, texto valido para CSV
6. **PDF disfarce:** rejeita arquivos com magic bytes `%PDF` nomeados como `.csv`
7. **Zip bomb:** protecao contra zip bombs via analise de compression ratio

### Sanitizacao de nomes

- Remove `..` (path traversal)
- Substitui caracteres especiais por `_`
- Previne arquivos ocultos (prefixo `.`)
- Limita a 255 caracteres (preserva extensao)

---

## Sanitizacao de Input

**Arquivo:** `src/lib/security/validation-schemas.ts`

### Schemas Zod

- **Column name:** 1-255 chars, alphanumerico + espacos + underscores + hifens + acentos
- **File metadata:** nome, tamanho (positivo), MIME type (enum)
- **Process request:** colunas selecionadas + nome do arquivo
- **Body size:** multipart max 60MB, JSON max 1MB — validado antes de parsear

### Sanitizacao de strings

- Remove tags HTML (`<>`)
- Remove caracteres nao-imprimiveis (preserva acentos `\u00C0-\u024F`)
- Trim de whitespace

### Content-Type validation

Valida header `Content-Type` antes de processar body: `multipart/form-data` ou `application/json`.

---

## Unification Token

**Arquivo:** `src/lib/security/unification-token.ts`

Token one-time para prevenir replay attacks:

1. Gerado em `/api/preview` apos todas as validacoes passarem
2. Armazenado no Redis com TTL curto, vinculado ao fingerprint do usuario
3. Consumido atomicamente em `/api/process` ou `/api/unification/complete` (operacao atomica no Redis)
4. Validacao: formato hex, existencia no storage, e binding correto ao fingerprint

Garante que cada preview gera no maximo 1 processamento.

---

## Audit Logging

**Arquivo:** `src/lib/audit-logger.ts`

Logging estruturado em JSON para acoes de seguranca:

### Acoes rastreadas

| Acao | Quando |
|------|--------|
| `upload.preview` | Preview de arquivo bem-sucedido |
| `upload.process` | Processamento de unificacao |
| `unification.complete` | Unificacao concluida |
| `rate_limit.hit` | Rate limit excedido |
| `quota.exceeded` | Quota mensal excedida |
| `validation.failed` | Validacao de input falhou |
| `csrf.blocked` | Request bloqueado por CSRF |
| `auth.token_invalid` | Token de unificacao invalido |

### Privacidade

- IP mascarado: ultimo octeto substituido por `***`
- Fingerprint truncado: apenas 8 primeiros caracteres + `...`
- Sem dados sensiveis (tokens, cookies, conteudo de arquivos)

---

## API Routes

### POST /api/preview

**Fluxo de seguranca:**
1. Valida Content-Type (multipart/form-data)
2. Valida tamanho do body (max 60MB)
3. Rate limiting (10 req/min)
4. Fingerprint + plano do usuario
5. Verifica quota mensal de unificacoes
6. Extrai formData e arquivos
7. Valida contagem de arquivos (max 1 por upload)
8. Valida tamanho do arquivo (limite do plano)
9. Valida MIME type
10. Sanitiza nome do arquivo
11. Valida extensao (pos-sanitizacao)
12. Valida conteudo (magic numbers + zip bomb)
13. Sanitiza nomes de colunas extraidos do arquivo (prevencao de XSS)
14. Gera unification token
15. Retorna colunas + token + usage

### POST /api/process

**Fluxo de seguranca:**
1. Valida Content-Type (multipart/form-data)
2. Valida tamanho do body (max 60MB)
3. Rate limiting (5 req/min)
4. Fingerprint + plano do usuario
5. Valida presenca do token
6. Valida contagem e tamanho de arquivos (limites do plano)
7. Valida tamanho total (soma de todos os arquivos)
8. Valida e sanitiza colunas selecionadas
9. Valida limite de colunas do plano
10. Valida MIME type de cada arquivo
11. Sanitiza nome de cada arquivo
12. Valida extensao de cada arquivo (pos-sanitizacao)
13. Valida conteudo de cada arquivo (magic numbers + zip bomb)
14. Consome unification token (atomico)
15. Incrementa quota atomicamente
16. Processa e retorna arquivo

### POST /api/unification/complete

**Fluxo de seguranca:**
1. Rate limiting (100 req/min)
2. Valida Content-Type (application/json)
3. Valida tamanho do body (max 1MB)
4. Fingerprint do usuario
5. Parseia body JSON
6. Valida presenca do token
7. Consome unification token (atomico, vinculado ao fingerprint)
8. Incrementa quota atomicamente (previne race condition)
9. Retorna contagem atualizada + usage

### GET /api/usage

**Fluxo de seguranca:**
1. Rate limiting (100 req/min)
2. Fingerprint do usuario
3. Busca uso atual no Redis
4. Retorna estatisticas

### Praticas comuns

- Erros genericos ao cliente: `{ error: string }` — sem stack traces
- Logging detalhado server-side via audit logger
- Fingerprint cookie setado em toda resposta (usuarios novos)
- Nenhum dado sensivel em logs (tokens, IPs completos, cookies)

---

## Protecoes adicionais

1. **Sem persistencia de dados:** arquivos processados em memoria e descartados
2. **TypeScript strict:** sem `any`, validacao em tempo de compilacao
3. **Cookies de fingerprint:** httpOnly, Secure (prod), SameSite=Strict
4. **Redis com timeout:** 5s por operacao, 2 retries com backoff
5. **Circuit breaker:** 3 falhas consecutivas no Redis abrem circuito por 30s, degraded mode com in-memory
6. **Nonce por request:** previne execucao de scripts injetados

---

**Atualizado em:** 2026-04-06
