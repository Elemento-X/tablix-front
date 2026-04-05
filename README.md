# Tablix

Tablix is a spreadsheet merge tool built for teams and professionals who deal with fragmented data across multiple CSV and XLSX files. Upload your files, select the columns that matter, and download a single unified spreadsheet — no formulas, no manual copy-paste, no data loss.

Built for the Brazilian market. Available in Portuguese, English, and Spanish.

---

## The Problem

Every day, thousands of professionals waste hours manually merging spreadsheets. They copy columns between files, lose rows, duplicate data, and break formatting. The larger the dataset, the worse it gets.

Tablix eliminates this entirely. Upload, select, download. Done.

---

## How It Works

1. **Upload** up to 3 files (Free) or 15 files (Pro) in CSV or XLSX format
2. **Select** the columns you want in the final output
3. **Download** a single, clean, unified spreadsheet

No account required for the Free plan. No data is stored — files are processed and immediately discarded.

---

## Plans

| | Free | Pro |
|---|---|---|
| Unifications per month | 1 | 40 |
| Files per unification | 3 | 15 |
| Max file size | 1 MB total | 2 MB per file |
| Max rows | 500 total | 5,000 per file |
| Selectable columns | 3 | 10 |
| Processing | Client-side | Server-side (priority) |
| Watermark | Yes | No |
| File history | No | 30 days |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Language | TypeScript (strict mode) |
| Testing | Jest (1,700+ unit tests), Playwright (129 E2E tests) |
| Error Monitoring | Sentry |
| Rate Limiting | Upstash Redis (sliding window) |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| i18n | Custom Context API (pt-BR, en, es) |

Backend (auth, billing, Pro processing) is a separate service built with Fastify 5.

---

## Security

Tablix is built with a security-first approach. Key controls:

- **CSRF protection** — Origin header validation + double-submit cookie pattern
- **Content Security Policy** — Nonce-based CSP in production, per-request generation
- **Rate limiting** — Sliding window per endpoint via Upstash Redis with circuit breaker fallback
- **File validation** — 7-layer validation: size, extension, MIME type, filename patterns, magic numbers, PDF disguise detection, zip bomb protection
- **Input sanitization** — All user strings validated through Zod schemas before processing
- **Audit logging** — Structured JSON logs for security events with PII masking

See [docs/SECURITY.md](docs/SECURITY.md) for the full security reference.

---

## License

Private — all rights reserved.
