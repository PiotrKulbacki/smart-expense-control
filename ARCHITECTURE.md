# Architektura — Smart Expense Control

Aplikacja webowa (Next.js) + mobilna (Expo) do zarządzania finansami osobistymi z modułami AI (skaner paragonów, predykcyjny czat asystenta finansowego).

## Stack technologiczny

| Warstwa           | Technologia                                             |
| ----------------- | ------------------------------------------------------- |
| Monorepo          | Turborepo + npm workspaces                              |
| Web               | Next.js 15, React 19, TypeScript (strict), Tailwind CSS |
| Mobile            | Expo 53, Expo Router, React Native                      |
| Współdzielony kod | `@shared` — schematy Zod, i18n, typy, logika domenowa   |
| Baza danych       | Prisma lub Drizzle (migracje plikowe, IaC)              |
| Auth              | OAuth (dostawca TBD)                                    |
| Walidacja env     | t3-env                                                  |
| AI                | OpenAI / Anthropic (skaner OCR, czat predykcyjny)       |
| Płatności         | Stripe (webhooki z idempotency)                         |
| Analityka & Flagi | PostHog                                                 |
| Monitoring        | Sentry / Axiom                                          |
| Rate Limiting     | Upstash Redis na Route Handlers                         |
| Hosting Web       | Vercel (`migrate deploy && next build`)                 |

## Struktura Monorepo

```
/
├── apps/
│   ├── web/          # Next.js — frontend + API routes
│   └── mobile/       # Expo — aplikacja mobilna
├── packages/
│   └── shared/       # Zod schemas, i18n, typy, logika wspólna
│       └── src/
│           └── features/
│               └── i18n/   # en, de, pl, es
├── .github/workflows/  # CI (lint + test na push do dev)
├── ARCHITECTURE.md
├── PROGRESS.md
└── COMPLIANCE_PHASE_11.md  # Faza 11.0 — analiza prawna / struktury ToS+PP
```

## Path Aliases

| Alias       | Ścieżka                 |
| ----------- | ----------------------- |
| `@shared/*` | `packages/shared/src/*` |
| `@web/*`    | `apps/web/src/*`        |
| `@mobile/*` | `apps/mobile/src/*`     |

## Architektura modułowa (Feature-Driven)

Każdy moduł domenowy w `features/` zawiera:

- routing (web/mobile)
- serwisy i API
- walidację (Zod w `@shared/schemas`)
- typy TypeScript
- komponenty UI

Planowane moduły: `auth`, `billing`, `ai`, `i18n`, `expenses`, `currency`.

## i18n

Scentralizowane tłumaczenia w `packages/shared/src/features/i18n/`:

- `en.json` — angielski (domyślny)
- `de.json` — niemiecki
- `pl.json` — polski
- `es.json` — hiszpański

Zakaz hardkodowania tekstów w komponentach.

## Baza danych

- Migracje wyłącznie przez ORM (Prisma/Drizzle), commitowane do Git
- Indeksy od dnia 1: `user_id`, `date`, `status`
- Tabela cache dla agregacji analitycznych (aktualizacja Cron)
- Kaskadowe usuwanie danych (RODO — prawo do zapomnienia)

## Bezpieczeństwo

- Rate limiting na API Route Handlers (nie globalne Middleware)
- Fallback kursów walut z lokalnej bazy przy awarii zewnętrznego API
- Quota limits AI (`monthly_ai_scans_count`, `monthly_ai_chat_count`) — ochrona przed nadużyciami
- In-Memory Buffer dla OCR — brak permanentnego storage paragonów

## UX

- Błędy użytkownika → toast (nigdy statyczny tekst pod inputami)
- Formularze → blokada po submit (`loading`/`disabled`)
- Szkielety i Optimistic UI dla operacji asynchronicznych
- Webhooki Stripe z idempotency

## CI/CD

- Gałąź `dev` — aktywny development, CI na push (lint + test)
- Gałąź `main` — produkcja
- Vercel: migracje przed buildem

## Monitoring & Analityka

- Sentry — błędy produkcyjne (webhooki, API AI)
- PostHog — event tracking + feature flags
- Silne typowanie eventów w TypeScript

## Gałęzie Git

| Gałąź  | Cel                            |
| ------ | ------------------------------ |
| `main` | Produkcja                      |
| `dev`  | Aktywny development (domyślna) |
