# Tablix - Testing

## Stack

- **Jest** — test runner e assertions
- **@testing-library/react** — testes de componentes React
- **@testing-library/jest-dom** — matchers customizados
- **ts-jest** — suporte TypeScript

## Comandos

```bash
# Rodar testes de um modulo especifico (padrao do projeto)
npm test -- --testPathPattern=<pattern>

# Exemplos
npm test -- --testPathPattern=limits
npm test -- --testPathPattern=middleware
npm test -- --testPathPattern=file-validator
npm test -- --testPathPattern=components/button

# Coverage completo
npm run test:coverage
```

**Regra:** nunca rodar a suite inteira durante desenvolvimento. Sempre segmentar por modulo alterado.

## Estrutura de Testes

```
__tests__/
├── api/
│   ├── preview.test.ts
│   ├── process.test.ts
│   ├── usage.test.ts
│   └── unification-complete.test.ts
├── components/
│   ├── animated-list.test.tsx
│   ├── badge.test.tsx
│   ├── button.test.tsx
│   ├── dropdown-menu.test.tsx
│   ├── file-dropzone.test.tsx
│   ├── grid-background.test.tsx
│   ├── language-selector.test.tsx
│   ├── step-transition.test.tsx
│   ├── theme-toggle.test.tsx
│   └── upload/
│       ├── columns-step.test.tsx
│       ├── upload-step.test.tsx
│       ├── UploadPageContent.test.tsx
│       └── usage-status.test.tsx
├── hooks/
│   ├── use-file-parser.test.ts
│   ├── use-mobile.test.ts
│   ├── use-reduced-motion.test.ts
│   ├── use-upload-flow.test.ts
│   └── use-usage.test.ts
├── lib/
│   ├── audit-logger.test.ts
│   ├── fingerprint.test.ts
│   ├── limits.test.ts
│   ├── redis.test.ts
│   ├── spreadsheet-merge.test.ts
│   ├── usage-tracker.test.ts
│   ├── i18n/
│   │   ├── config.test.ts
│   │   └── LocaleProvider.test.tsx
│   └── security/
│       ├── file-validator.test.ts
│       ├── rate-limit.test.ts
│       ├── security-attacks.test.ts
│       ├── unification-token.test.ts
│       └── validation-schemas.test.ts
└── middleware.test.ts
```

**Total:** 36 test suites, 940 testes

## Coverage

### Meta

- `src/lib/` e `src/hooks/` — minimo 90% (branches, functions, lines, statements)
- Componentes — testes comportamentais (render, interacao, acessibilidade)
- API routes — testes de integracao cobrindo fluxo completo de validacao

### Como verificar

```bash
npm run test:coverage
# Relatorio HTML em coverage/lcov-report/index.html
```

## Categorias de Teste

### Libs (`__tests__/lib/`)

Testes unitarios das funcoes core do sistema:

- **limits.ts** — constantes de plano, formatacao de tamanho, verificacoes de limite
- **fingerprint.ts** — extracao de IP, geracao de ID, hashing, cookie management, getUserPlan
- **redis.ts** — client singleton, InMemoryStore (get/set/incr/expire/cleanup), storage abstraction, operacoes atomicas
- **usage-tracker.ts** — checkUnificationLimit, atomicIncrementUnification, checkFileSizeLimit, getUserUsage
- **audit-logger.ts** — logging estruturado, mascaramento de IP, truncamento de fingerprint
- **spreadsheet-merge.ts** — logica de merge de planilhas

### Security (`__tests__/lib/security/`)

Testes de seguranca com cobertura extensiva:

- **file-validator.ts** — tamanho, extensao, MIME, filename patterns, magic numbers, zip bomb, PDF disfarce
- **validation-schemas.ts** — schemas Zod, sanitizacao de strings, Content-Type, body size, file limits
- **rate-limit.ts** — limites por namespace, identificacao por IP, cleanup, fallback in-memory
- **unification-token.ts** — geracao, consumo atomico, validacao de formato, binding por fingerprint
- **security-attacks.ts** — cenarios de ataque (path traversal, injection, replay)

### API Routes (`__tests__/api/`)

Testes de integracao das rotas:

- **preview.test.ts** — rate limiting, quota, validacao de arquivo, geracao de token
- **process.test.ts** — fluxo completo (token + quota + validacao + processamento)
- **usage.test.ts** — estatisticas de uso, cookie de fingerprint
- **unification-complete.test.ts** — consumo de token, incremento de quota

### Hooks (`__tests__/hooks/`)

Testes de React hooks:

- **use-usage.ts** — fetch inicial, loading states, erro, refetch
- **use-file-parser.ts** — parsing de CSV/XLSX, validacao
- **use-upload-flow.ts** — fluxo de upload completo
- **use-mobile.ts** — deteccao de viewport mobile
- **use-reduced-motion.ts** — preferencia de reducao de movimento

### Componentes (`__tests__/components/`)

Testes comportamentais de UI:

- **button.tsx** — variantes, tamanhos, className, onClick, disabled, type
- **badge.tsx** — variantes, data-slot, tagName, className
- **dropdown-menu.tsx** — toggle, aria-expanded, Escape, click outside, asChild, alignment
- **file-dropzone.tsx** — render, drag/drop, disabled, accept, onFilesAccepted
- **language-selector.tsx** — idiomas, setLocale, highlight, dropdown
- **theme-toggle.tsx** — toggle de tema
- **grid-background.tsx** — render, animacao
- **animated-list.tsx** — render, transicoes
- **step-transition.tsx** — transicao entre steps
- **upload/** — UploadPageContent (quota ordering, double-spend prevention), upload-step, columns-step, usage-status

### Middleware (`__tests__/middleware.test.ts`)

- Security headers (HSTS, X-Frame-Options, CSP, Permissions-Policy)
- CSP em producao (nonce + strict-dynamic) vs desenvolvimento (unsafe-eval)
- CSRF protection (Origin validation, metodos isentos)
- Config matcher (exclusao de assets estaticos)

## Padroes de Teste

### Environment

- Testes de componente/hook: `@jest-environment jsdom` (declarado no topo do arquivo)
- Testes de lib/API: `@jest-environment node` (padrao)

### Mocks

- i18n: mock de `useLocale` com mapa de traducoes
- next-themes: mock de `useTheme`
- Redis: mock de `storage` para evitar dependencia de infra
- fetch: `jest.fn()` para chamadas de API

### Assertivas de seguranca

Testes de seguranca validam que:
- Inputs maliciosos sao rejeitados (path traversal, injection, XSS)
- Rate limiting bloqueia apos exceder threshold
- Tokens expiram e nao podem ser reusados
- Quota e incrementada atomicamente (sem race conditions)
- Erros nao expoe informacoes internas

## Testes E2E (Playwright)

### Stack E2E

- **Playwright** — test runner E2E (chromium)
- **Page Object Model** — abstração de paginas em classes reutilizaveis

### Comandos E2E

```bash
npm run test:e2e                            # Roda todos os E2E
npm run test:e2e:ui                         # Modo interativo
npm run test:e2e -- --grep "sanity"         # Filtrar por nome
npm run test:e2e -- --grep "free-flow"
npm run test:e2e -- --grep "limits"
npm run test:e2e -- --grep "rate-limiting"
```

### Estrutura E2E

```
e2e/
├── fixtures/
│   ├── files/           # Gerados no global-setup (gitignored)
│   └── test.fixture.ts  # Extensao do test com page objects + mocks
├── pages/               # Page Object Models
│   ├── landing.page.ts
│   ├── upload.page.ts
│   └── columns.page.ts
├── helpers/
│   ├── locale.helper.ts   # t() para i18n assertions
│   ├── toast.helper.ts    # Assertions em toasts Sonner
│   └── download.helper.ts # Parse de XLSX baixado
├── specs/
│   ├── 7.1-sanity.spec.ts        # 6 testes
│   ├── 7.2-free-flow.spec.ts     # 7 testes
│   ├── 7.3-limits.spec.ts        # 5 testes
│   └── 7.4-rate-limiting.spec.ts # 3 testes
├── global-setup.ts       # Gera fixture files
└── .eslintrc.json
playwright.config.ts      # Na raiz
```

### Specs E2E (21 testes)

**7.1 Sanity (6 testes):** landing page, CTA navigation, dropzone visible, usage status, continue disabled, back link

**7.2 Free Flow (7 testes):** single CSV full flow com validacao de conteudo XLSX, two CSVs merge, XLSX upload, column toggle (select/deselect/individual), start over, file removal, success toast

**7.3 Limits (5 testes):** max 3 arquivos, arquivo > 1MB, > 500 rows, sem colunas em comum, quota esgotada

**7.4 Rate Limiting (3 testes):** mock 429 no preview, mock 429 no process, teste real de rate limit com Retry-After

### Mocks padrao (fixture)

- `GET /api/usage` — plano Free com quota disponivel (mockado no test.fixture.ts)
- `POST /api/preview` — colunas + token (mockado nos specs)
- `POST /api/unification/complete` — sucesso (mockado nos specs)

### Fixtures geradas

- `valid-3col-5row.csv` / `.xlsx` — 3 colunas, 5 linhas
- `valid-common-cols-a.csv` / `b.csv` — CSVs com colunas em comum
- `no-common-cols.csv` — sem colunas em comum
- `large-501-rows.csv` — excede limite de 500 linhas
- `large-1.1mb.csv` — excede limite de 1MB

### Config (playwright.config.ts)

- Browser: chromium
- Locale: pt-BR
- webServer: `npm run dev` (porta 3000, timeout 60s)
- Traces: on-first-retry
- Screenshots: only-on-failure
- CI: retries 2, workers 1, reporter github

---

**Atualizado em:** 2026-03-30
**Status na data:** 36 suites Jest (940 testes) + 4 suites Playwright E2E (21 testes) passando (sujeito a variacao conforme evolucao do codigo)
