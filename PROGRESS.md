# Postęp projektu — Smart Expense Control

## Fazy projektu

1. **Inicjalizacja Monorepo i CI/CD** — [✅ Zrobione]
2. **Baza Danych (Prisma/Drizzle), Auth i i18n** — [✅ Zrobione]
3. **Wielowalutowość i Skaner AI (In-Memory Buffer)**
4. **Predykcyjny Czat AI i PDF**
5. **PostHog (Flags & Analytics) i Stripe**
6. **UI Dashboard, i18n UI i Sentry**

## Latest Handoff Log

**2026-07-09 — Faza 2 zakończona (Baza, Auth, i18n)**

### ORM & Baza danych
- Wybrano **Prisma** w pakiecie `packages/database/`.
- Schemat: `packages/database/prisma/schema.prisma`
- Migracja inicjalizacyjna: `packages/database/prisma/migrations/20260709120000_init/migration.sql`
- Tabele: `users`, `accounts`, `sessions`, `refresh_tokens`, `transactions`, `recurring_expenses`, `exchange_rates`
- Indeksy: `transactions(userId, date)`, `recurring_expenses(userId, nextDueDate)`
- Klient Prisma: `packages/database/src/index.ts` → import `@smart-expense-control/database`
- Skrypty root: `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:status`
- Build web: `migrate deploy && next build` (Vercel-ready)

### Walidacja Zod (shared)
- Auth: `packages/shared/src/features/auth/schemas.ts` (`loginSchema`, `registerSchema`, silne hasło)
- Transakcje: `packages/shared/src/features/transactions/schemas.ts` (`createTransactionSchema`, `updateTransactionSchema`)
- Re-export: `packages/shared/src/schemas/index.ts`

### i18n
- Klucze auth + transactions w `packages/shared/src/features/i18n/{en,de,pl,es}.json`
- Helper `t()` i `translateError()` w `packages/shared/src/features/i18n/index.ts`

### Auth Web (`apps/web`)
- t3-env: `apps/web/src/env.ts`
- Route Handlers: `/api/auth/{register,login,logout,me,refresh,google,google/callback}`
- Serwisy: `apps/web/src/features/auth/services/auth.service.ts`
- UI: `/login`, `/register` z toast (sonner) — zero statycznych błędów pod inputami
- Web sesje: httpOnly cookie `sec_session`; Mobile: JWT + refresh token (header `x-client-platform: mobile`)

### Auth Mobile (`apps/mobile`)
- Env: `apps/mobile/src/env.ts` (Zod)
- SecureStore: `apps/mobile/src/features/auth/lib/token-storage.ts`
- Serwis API: `apps/mobile/src/features/auth/services/auth.service.ts`
- Ekrany: `app/login.tsx`, `app/register.tsx` z toast (`react-native-toast-message`)
- Context: `AuthProvider` w `app/_layout.tsx`

**Następny agent:** Rozpocznij Fazę 3 — moduł wielowalutowości (ExchangeRate API + fallback) i skaner AI z In-Memory Buffer.

## Ostatnie zmiany

**2026-07-09 — Faza 2 zakończona**

- Zainicjowano Prisma ORM z pełnym schematem domenowym i migracją SQL.
- Wdrożono wspólne schematy Zod (auth, transactions) i t3-env (web + mobile).
- Zaimplementowano Auth: Email/Hasło + Google OAuth (web), JWT + SecureStore (mobile).
- Rozszerzono i18n o klucze auth/transactions w 4 językach.
- Zaktualizowano CI (Postgres service, env vars dla buildu).

**2026-07-09 — Faza 1.1 (uzupełnienie fundamentu)**

- Dodano `README.md` z onboardingiem i opisem aplikacji (AI paragony, czat, waluty PLN/EUR/GBP, Stripe).
- Dodano `.env.example` ze szkieletem zmiennych publicznych i tajnych.
- Rozszerzono CI: `format`, `typecheck`, `build` + trigger na Pull Request do `dev`.
- Utworzono scaffold Zod w `packages/shared/src/schemas/` (`loginSchema`).
- Dodano `.vscode/extensions.json`, `.nvmrc` i `engines` w `package.json`.

**2026-07-09 — Faza 1 zakończona**

- Zainicjowano repozytorium Git z gałęziami `main` (produkcja) i `dev` (domyślna robocza).
- Utworzono monorepo Turborepo: `apps/web` (Next.js 15), `apps/mobile` (Expo 53), `packages/shared`.
- Skonfigurowano CI (`.github/workflows/ci.yml`) — lint + test przy pushu do `dev`.
- Wdrożono Prettier (100 znaków, `prettier-plugin-tailwindcss`) i `.vscode/settings.json`.
- Skonfigurowano Path Aliases: `@shared/*`, `@web/*`, `@mobile/*`.
- Utworzono `.cursorrules`, `ARCHITECTURE.md` oraz scaffold i18n (`en`, `de`, `pl`, `es`).
