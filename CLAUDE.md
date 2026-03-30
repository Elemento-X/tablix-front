# Tablix Frontend

## Comandos

- Dev: `npm run dev`
- Build: `npm run lint && npm run build`
- Lint: `npx eslint .`
- Test (específico): `npm test -- --testPathPattern=<pattern>`
- Test coverage: `npm run test:coverage`
- ESLint config: @rocketseat/eslint-config (padrão do projeto)

## Regras de código

- Todo texto visível ao usuário DEVE usar `t()` do sistema i18n — nunca hardcodar string em nenhum idioma
- Ao alterar texto em um idioma, OBRIGATÓRIO sincronizar os 3 arquivos: pt-BR.json, en.json, es.json
- Limites de plano vêm exclusivamente de `src/lib/limits.ts` — nunca hardcodar valores
- Validação de input externo via Zod schemas em `src/lib/security/validation-schemas.ts`
- Componentes: máximo 500 linhas — se passar, extrair lógica ou subcomponentes
- Conventional commits obrigatório: feat:, fix:, chore:, refactor:, test:, docs:
- Não commitar sem instrução explícita do usuário
- Não criar arquivos novos sem necessidade comprovada
- Não refatorar código fora do escopo solicitado

## Segurança (inegociável)

- Toda entrada de usuário (upload, form, query param, header) DEVE ser validada e sanitizada
- Validação de arquivos: MIME type + extensão + magic numbers + zip bomb check (`src/lib/security/file-validator.ts`)
- CSP, HSTS, X-Frame-Options e demais headers de segurança via `src/middleware.ts`
- Rate limiting obrigatório em toda API route (Upstash Redis + fallback in-memory)
- Nunca logar dados sensíveis (tokens, fingerprints, IPs completos em produção)
- Nunca expor stack traces ou detalhes internos em respostas de erro para o cliente
- Sanitizar nomes de arquivo antes de qualquer operação (`sanitizeFileName`)
- Ao introduzir código novo, avaliar OWASP Top 10: injection, XSS, CSRF, broken access control, security misconfiguration, SSRF
- Validar Content-Type de requests antes de processar body
- Nunca confiar em dados do client-side para decisões de segurança server-side
- Cookies sensíveis: httpOnly, Secure (produção), SameSite=Strict
- Inputs de string: limitar tamanho, remover caracteres de controle, prevenir ReDoS em regex
- Toda validação client-side é UX, não segurança — o server é a única barreira real

## Arquitetura

- Frontend: Next.js 16 (App Router) + React 19 + TypeScript strict
- Backend: Fastify 5 (repositório separado: tablix-back) — fonte de verdade para auth, billing e processamento Pro
- Processamento Free: 100% client-side (< 10MB, XLSX + PapaParse)
- Processamento Pro: server-side via Fastify (`/process/sync`)
- Auth: token-based (Stripe checkout → email com token → JWT session) — sem tela de login
- Redis Upstash: compartilhado entre front e back (prefixos `front:` e `tablix:ratelimit:`)
- Identificação Free: fingerprint (cookie + IP hash) — temporário, será complementado pelo token
- API routes do Next.js (`/api/preview`, `/api/process`): stubs — processamento real vai pelo Fastify
- i18n: sistema próprio com Context API, 3 idiomas (pt-BR default, en, es)

## Proibições

- NÃO duplicar lógica que existe no backend (billing, auth, processamento Pro)
- NÃO alterar arquivos de i18n em um idioma sem atualizar os outros dois
- NÃO usar `any` em TypeScript
- NÃO adicionar dependências sem discutir justificativa
- NÃO gerar documentação (.md, README) sem instrução explícita
- NÃO fazer push sem instrução explícita
- NÃO ignorar erros de lint ou TypeScript — corrigir antes de considerar a tarefa concluída
- NÃO rodar a suíte de testes inteira — sempre rodar testes específicos do arquivo ou módulo alterado (`npm test -- --testPathPattern=<pattern>`)

## Pipeline QA (obrigatorio)

Toda entrega de codigo passa pelo pipeline completo, sem excecao:

```
(@tester + @security) em paralelo → @reviewer → Trello
```

- **@tester** escreve testes, valida coverage, edge cases (CI rodara automaticamente no futuro)
- **@security** audita seguranca: OWASP, injection, headers, rate limit
- **@reviewer** faz code review direto no codigo, recebe achados dos dois como contexto, emite veredito final
- **@planner** nao faz parte do pipeline — e chamado sob demanda para planejamento e estruturacao de cards
- 1 comentario consolidado por card por execucao do pipeline (contendo VALIDACAO, AUDITORIA, REVISAO)
- Reprovacao de QUALQUER agente reinicia o ciclo completo apos correcao
- Correcoes vao no card existente; descobertas novas viram card novo
- Historico de reprovacoes no Trello e sagrado — nunca apagar, nunca pular

Regra detalhada em `.claude/rules/qa-pipeline.md`

## Documentação e qualidade

- Toda feature nova precisa de testes (mínimo 90% coverage em `src/lib/` e `src/hooks/`)
- Alterações em segurança ou regras de negócio devem ser documentadas internamente
- docs/SECURITY.md, docs/FREE_PLAN.md, docs/PRO_PLAN.md, docs/USAGE_LIMITS.md devem refletir o estado real do código
- Se uma mudança contradiz a documentação existente: PARAR e perguntar ao usuário qual está correto antes de qualquer ação
