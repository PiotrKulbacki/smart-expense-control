# Postęp projektu — Smart Expense Control

## Fazy projektu

1. **Inicjalizacja Monorepo i CI/CD** — [✅ Zrobione]
2. **Baza Danych (Prisma/Drizzle), Auth i i18n** — [✅ Zrobione]
3. **Wielowalutowość i Skaner AI (In-Memory Buffer)** — [✅ Zrobione]
4. **Predykcyjny Czat AI (Asystent Finansowy)** — [✅ Zrobione]
5. **PostHog (Flags & Analytics) i Stripe** — [✅ Zrobione]
6. **UI Dashboard, i18n UI i Sentry** — [✅ Zrobione]
7. **Dashboard UX: formularz ręczny, wykresy, CTA** — [✅ Zrobione]
8. **Dashboard Premium: filtry wykresu, CRUD transakcji, budżet preview** — [✅ Zrobione]

## Latest Handoff Log

**2026-07-13 — Faza 8 zamknięta: tuning Premium dashboardu (filtry, CRUD, budżet preview).**

### Faza 8 — Dashboard Premium: filtry wykresu, CRUD transakcji, budżet preview

- **Typografia i CTA** — tytuł `text-3xl font-bold tracking-tight`; kompaktowy pasek akcji (Dodaj ręcznie + Skanuj z badge quota).
- **Filtr wykresu donut** — `Select` w karcie kategorii: Bieżący okres / Ostatnie 7 dni / Dziś; filtrowanie po stronie klienta z `chartTransactions` z API; skeleton przy przełączaniu.
- **Lista transakcji** — wszystkie transakcje bieżącego miesiąca finansowego (`financialMonthStartDay`); `ScrollArea` max-h; empty state z ikoną i CTA.
- **CRUD UI** — `DropdownMenu` (Edytuj / Usuń); edycja przez ten sam Sheet/Drawer + `PATCH /api/transactions/[id]`; usuwanie z `AlertDialog` + `DELETE /api/transactions/[id]`.
- **Premium sznyt** — pastelowe tła ikon kategorii (`CATEGORY_ICON_STYLES`); `BudgetProgress` (fikcyjny budżet 3000, preview pod sumą wydatków).
- **i18n** — nowe klucze `dashboard.chartFilter.*`, `dashboard.budget.*`, `dashboard.delete.*`, `dashboard.recent.empty*` w en/pl/de/es.
- **Shadcn UI** — `Select`, `DropdownMenu`, `AlertDialog`, `ScrollArea`, `Progress`.

---

**2026-07-13 — Faza 7 zamknięta: formularz ręczny, wykres donut, CTA, rozbudowana lista transakcji.**

### Faza 7 — Dashboard UX: formularz ręczny, wykresy, CTA

- **Formularz ręczny** — `TransactionFormModal`: Sheet (desktop) / Drawer (mobile), React Hook Form + Zod (`transactionFormSchema` w `@shared`), `POST /api/transactions`, toasty sonner, odświeżanie dashboardu po sukcesie.
- **Główne CTA** — `DashboardCtas`: „Dodaj wydatek ręcznie” + „Skanuj paragon” (`/scanner`) z badge quota z `GET /api/ai/scan-quota`.
- **Wykres donut** — `CategoryDonutChart` (Recharts): podział `categoryTotals` z bieżącego okresu rozliczeniowego, legenda z % i kwotami w `primaryCurrency`.
- **Lista transakcji** — `RecentTransactionsList`: ikony kategorii (lucide-react), opis pod kategorią, oryginalna kwota (szara) + skonwertowana (pogrubiona).
- **i18n** — nazwy kategorii (`transactions.categories.*`), etykiety CTA i formularza w en/pl/de/es; skaner używa tłumaczeń kategorii.
- **Walidacja** — `createTransactionSchema.category` jako `z.enum(TRANSACTION_CATEGORIES)`.

---

### Billing i cennik (post-Faza 6)

- **Stripe checkout w 3 walutach** — env: `STRIPE_PRO_PRICE_PLN`, `STRIPE_PRO_PRICE_EUR`, `STRIPE_PRO_PRICE_GBP` (zamiast pojedynczego `STRIPE_PRO_PRICE_ID`). Checkout: `POST /api/billing/checkout` z body `{ currency: "PLN"|"EUR"|"GBP" }`.
- **Przełącznik waluty płatności** — `BillingCurrencySwitcher` na landing page (`#pricing`) i w Ustawieniach; wybór zapisywany w `localStorage` (`sec_billing_currency`).
- **Ceny PRO (źródło prawdy)** — `packages/shared/src/features/billing/pricing.ts`:
  - standard: 25 PLN / 6 EUR / 4,50 GBP mies.,
  - promocja: 12 PLN / 4 EUR / 3 GBP mies.
- **Promocja przez PostHog** — flaga boolean `pro-promo-pricing` (`FEATURE_FLAG_PRO_PROMO_PRICING`); komponent `ProPriceDisplay` (przekreślona cena + badge z % rabatu: PLN 52%, EUR/GBP 33%). Landing + Ustawienia (sekcja subskrypcji).
- **Etykieta profilu** — jedno pole `User.name`; etykieta i18n zmieniona na „Imię i nazwisko” / „Full name” (bez migracji na firstName/lastName).
- **Upstash Redis** — prefix kluczy rate limit: `expense-control:ai:scan`, `expense-control:ai:chat` (współdzielona baza z innymi projektami bez kolizji).
- **Migracja DB** — `20260712200000_add_primary_currency` zastosowana lokalnie i w Supabase; **nie usuwać pliku migracji** (wymagany przy `migrate:deploy` na Vercel).

### Następny agent — start tutaj

1. Produkcja live — zmiany przez `dev` → PR → merge `main`.
2. **Vercel env:** `STRIPE_PRO_PRICE_PLN|EUR|GBP`, `NEXT_PUBLIC_SENTRY_DSN` (opcjonalnie org/project/token).
3. **PostHog:** flaga `pro-promo-pricing` — rollout 100% = promocja włączona; 0% lub Disabled = ceny standardowe. MCP wizard (`npx @posthog/wizard mcp add`) opcjonalny — nie wymagany do działania flag.
4. Migracja `primaryCurrency` wdroży się automatycznie przy następnym deployu (`migrate:deploy` w build).

---

**2026-07-12 — Faza 6 zamknięta: UI web, landing page, Sentry.**

### Faza 6 — UI Dashboard, i18n UI i Sentry

- **Route Groups Next.js:**
  - `(public)/` — landing page, login, register, terms, privacy; `PublicHeader` + `PublicFooter`.
  - `(app)/` — chroniona strefa z `AppSidebar` (Dashboard, Skaner, Czat, Ustawienia, menu użytkownika, locale, Stripe, logout).
- **Landing page** — sekcje Hero, Features (skaner + czat AI + waluty), Pricing (FREE/PRO), CTA do rejestracji/logowania.
- **Dashboard** — `GET /api/dashboard`: agregacja wydatków okresu `financialMonthStartDay`, lista transakcji z konwersją na `primaryCurrency`.
- **Skaner paragonów** — quota (`GET /api/ai/scan-quota`), upload → `/api/ai/scan-receipt`, formularz draftu → `POST /api/transactions`.
- **Czat AI** — `GET /api/ai/chat-quota`, interfejs → `POST /api/ai/chat`, stany ładowania, limity planu.
- **Ustawienia** — `PATCH /api/auth/me` (name, `primaryCurrency`, `financialMonthStartDay`), Stripe checkout (`POST /api/billing/checkout`) i portal (`POST /api/billing/portal`), Danger Zone z `DELETE /api/auth/me` (kaskadowe usuwanie).
- **i18n** — pełne klucze UI w en/pl/de/es; `LocaleProvider` + cookie `sec_locale`; interpolacja `{{param}}` w `t()`.
- **Sentry** — `@sentry/nextjs`: client/server/edge config, `instrumentation.ts`, `global-error.tsx`, `withSentryConfig` w `next.config.ts`; env: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.
- **DB** — migracja `20260712200000_add_primary_currency` (`User.primaryCurrency`, domyślnie PLN).
- **Middleware** — `/` publiczny dla gości; zalogowani → `/dashboard`; `/login`, `/register` redirect dla sesji.

---

**2026-07-12 — Produkcja na Vercel działa (deploy, OAuth, PostHog, cron-job.org). Gotowość do Fazy 6.**

### Vercel — deploy i gałęzie Git

- **Production branch:** `main` (deploy produkcyjny na `smart-expense-control-web.vercel.app`).
- **Preview branch:** `dev` (deploy preview po pushu / PR).
- **Root Directory:** `apps/web` (monorepo).
- **Build:** `migrate:deploy` (Prisma) + `next build` — bez `dotenv` w skryptach build na Vercel (env z dashboardu).
- **Baza na Vercel:** `DATABASE_URL` = Transaction pooler (:6543); `DIRECT_DATABASE_URL` = **Session pooler** (`*.pooler.supabase.com:5432`) — **nie** `db.*.supabase.co` (błąd P1001 przy migracji).
- **turbo.json:** env vars dla Stripe/Upstash/PostHog przekazywane do buildu (eliminacja żółtych ostrzeżeń).

### Vercel Cron vs cron-job.org (plan Hobby)

- **Limit Hobby:** max 1 uruchomienie cron/dzień w `vercel.json` — wyrażenie `0 * * * *` **blokuje deploy**.
- **W `vercel.json` zostaje tylko:** `GET /api/cron/reset-quotas` (`5 0 * * *`, codziennie 00:05 UTC).
- **`downgrade-past-due` (co godzinę):** zewnętrzny scheduler **cron-job.org** → `GET https://smart-expense-control-web.vercel.app/api/cron/downgrade-past-due` z nagłówkiem `Authorization: Bearer CRON_SECRET`. Skonfigurowane i zweryfikowane (HTTP 200).

### Google OAuth — produkcja

- Redirect URI w Google Cloud Console (OAuth Client „Smart Expense Control - Web / Dev”):
  - Lokalnie: `http://localhost:3000/api/auth/google/callback`
  - Produkcja: `https://smart-expense-control-web.vercel.app/api/auth/google/callback`
- JavaScript origins: `http://localhost:3000` + `https://smart-expense-control-web.vercel.app`
- **Vercel Production:** `NEXT_PUBLIC_APP_URL=https://smart-expense-control-web.vercel.app` (wymaga redeploy po zmianie — wartość wbudowana w build).
- **Logowanie Google na produkcji:** ✅ działa.

### PostHog — skonfigurowane (Free plan)

- Projekt: `smart-expense-control` (EU: `https://eu.i.posthog.com`).
- Produkty włączone: Product Analytics, Web Analytics, Feature Flags (+ opcjonalnie Session Replay).
- **Pominięto:** GitHub wizard instalacji (SDK już w repo), Data Warehouse, plan Pay-as-you-go.
- **Env (Vercel + lokalnie):** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`; opcjonalnie `POSTHOG_API_KEY` (fallback: public key).
- Eventy serwerowe już w kodzie: `ai_scan_completed`, `ai_chat_message_sent`, `subscription_upgraded`.
- **Feature flags:** `useFeatureFlag()` + flaga produkcyjna `pro-promo-pricing` (cennik promocyjny PRO na landing i w ustawieniach).
- **Nie zrobione:** `identifyPostHogUser()` przy logowaniu/wylogowaniu (opcjonalne usprawnienie Fazy 6).

### Jakość kodu / infra (2026-07-12)

- `packages/database/prisma.config.ts` — seed przeniesiony z `package.json#prisma` (deprecation Prisma 7).
- ESLint: usunięto martwy `mapDbRates`; poprawiono `PostHogProvider` (`useMemo` + `flagsVersion`).
- Ostrzeżenia `npm deprecated` (glob, rimraf) — transitive z Expo; bez zmian do upgrade SDK.

### Stripe (przypomnienie operacyjne)

- Webhook endpoint produkcji: `https://smart-expense-control-web.vercel.app/api/webhooks/stripe`
- `STRIPE_WEBHOOK_SECRET` z **Stripe Dashboard** (nie ze `stripe listen` lokalnego).
- **Nowe (Faza 6):** `STRIPE_PRO_PRICE_PLN`, `STRIPE_PRO_PRICE_EUR`, `STRIPE_PRO_PRICE_GBP` dla checkoutu UI (`POST /api/billing/checkout`).

---

**2026-07-10 — Faza 5 zamknięta + utwardzenie billingu.**

### Stripe — webhooki, idempotency i plany

- **Route:** `POST /api/webhooks/stripe` — weryfikacja podpisu, raw body.
- **Idempotency:** `stripe-webhook-idempotency.ts` + tabela `processed_stripe_events` (claim → process → complete; retry po błędzie).
- **Serwis:** `stripe-webhook.service.ts`
- **Obsługiwane zdarzenia:**
  - `checkout.session.completed` → PRO, `stripeCustomerId`, reset liczników, `financialMonthStartDay` = dzień wykupu.
  - `customer.subscription.updated` → PRO przy `active`/`trialing`/`past_due` (grace 24h); FREE po wygaśnięciu grace lub `canceled`/`unpaid`; **anulowanie na koniec okresu** (`cancel_at_period_end`) = nadal PRO do końca opłaconego okresu.
  - `customer.subscription.deleted` → FREE (koniec opłaconego okresu).
- **Grace `past_due`:** 24h PRO, potem downgrade (`GET /api/cron/downgrade-past-due` co godzinę — zewnętrzny scheduler, np. cron-job.org; nie w `vercel.json` z powodu limitu Hobby).
- **Analityka:** `subscription_upgraded` przy FREE → PRO.

### Reset limitów AI (Vercel Cron)

- **Route:** `GET /api/cron/reset-quotas` — zeruje liczniki użytkowników, u których dziś jest `financialMonthStartDay` i minął okres od `lastQuotaResetAt`.
- **Reguła (FREE i PRO):** jeden cykl — dzień `financialMonthStartDay` (domyślnie dzień rejestracji; przy upgrade PRO = dzień wykupu).
- **Harmonogram:** `5 0 * * *` (codziennie 00:05 UTC) — `apps/web/vercel.json`.
- **Pola User:** `financialMonthStartDay` (1–28), `lastQuotaResetAt`, `pastDueSince`.
- **Shared:** `packages/shared/src/features/billing/financial-month.ts`.

### PostHog — analityka i feature flags

- **Klient:** `posthog-client.ts` + `PostHogProvider` w `layout.tsx`.
- **Serwer:** `posthog-server.ts` — eventy z API.
- **Eventy:** `ai_scan_completed`, `ai_chat_message_sent`, `subscription_upgraded`.
- **Feature flags:** `useFeatureFlag(flagKey)` — gotowe na Fazę 6.

### Rate limiting (Upstash Redis)

- **Moduł:** `apps/web/src/lib/rate-limit.ts`
- **Limity:** 5 req/min **osobno** dla skanu (`sec:ai:scan`) i czatu (`sec:ai:chat`).
- **Produkcja:** fail-closed bez Upstash env (429); dev: fail-open.
- **Odpowiedź:** HTTP 429 + `api.errors.rateLimitExceeded` (toast).

### Predykcyjny czat AI (asystent finansowy) — Faza 4

- **Route:** `POST /api/ai/chat` — JSON `{ message, locale?, history? }`.
- **Serwisy:**
  - `apps/web/src/features/ai/services/chat.service.ts` — orkiestracja (Prisma, quota, OpenAI).
  - `apps/web/src/features/ai/services/chat-context.ts` — czysta logika: agregacja transakcji (`aggregateFinancialContext`) i budowa system promptu (`buildChatSystemPrompt`).
- **Kontekst dla modelu** (pobierany z Prisma przed wywołaniem OpenAI):
  - sumy wydatków bieżącego miesiąca po kategoriach (`categoryTotals`),
  - łączna kwota wydatków w miesiącu (bez konwersji walut),
  - ostatnie 15 transakcji (`recentTransactions`).
- **Model:** `gpt-4o-mini`; odpowiedzi w języku użytkownika (`locale`: en/de/pl/es).
- **Limity:** FREE 10 wiadomości/mies., PRO bez limitu (`UNLIMITED_QUOTA`). Licznik `monthlyAiChatCount` inkrementowany po udanej odpowiedzi.
- **Schematy:** `packages/shared/src/features/ai/schemas.ts` — `chatRequestSchema`, kody błędów `chat.*`.
- **Auth:** `getAuthenticatedUser()` w route handlerze (cookie web + Bearer JWT mobile).
- **Błędy UI:** wyłącznie przez **toast** (sonner) — nigdy inline pod oknem czatu.

### Wspólne limity planów (quota)

| Funkcja        | FREE/mies. | PRO/mies.  |
| -------------- | ---------- | ---------- |
| Skan paragonów | 3          | 150        |
| Czat AI        | 10         | bez limitu |

- **Shared:** `packages/shared/src/features/billing/plan-limits.ts` — `getAiChatQuotaStatus()`.
- **DB:** `User.monthlyAiChatCount`, `financialMonthStartDay`, `lastQuotaResetAt`, `pastDueSince` (migracja `20260710160000_billing_quota_and_stripe_idempotency`).

### i18n (Fazy 4–5)

Klucze `chat.*`, `scanner.*`, `api.errors.rateLimitExceeded` w `en`, `pl`, `de`, `es`. Błędy zwracane jako klucze i18n — klient wyświetla je przez **toast**.

### Świadomie odłożone (kolejne fazy)

- Rozdzielenie `User.name` na `firstName` / `lastName` (wymaga migracji DB — na razie jedno pole + etykieta „Imię i nazwisko”).
- `identifyPostHogUser()` przy logowaniu/wylogowaniu (opcjonalne usprawnienie).

---

## Plan na przyszłe fazy

_(Brak zaplanowanych faz — każda nowa funkcja wymaga zatwierdzenia przez użytkownika.)_

---

## Ostatnie zmiany

**2026-07-13 — Dashboard Premium (Faza 8): filtry wykresu, CRUD transakcji, budżet preview**

- Kompaktowy pasek CTA, większy tytuł dashboardu, filtr dat wykresu donut (okres / 7 dni / dziś).
- Lista transakcji z bieżącego miesiąca finansowego w `ScrollArea`; empty state z CTA.
- Edycja (`PATCH`) i usuwanie (`DELETE`) transakcji z DropdownMenu + AlertDialog.
- Pastelowe ikony kategorii; `BudgetProgress` (preview budżetu pod sumą wydatków).
- Nowe komponenty Shadcn: Select, DropdownMenu, AlertDialog, ScrollArea, Progress.
- i18n: `dashboard.chartFilter.*`, `dashboard.budget.*`, `dashboard.delete.*` w 4 językach.

**2026-07-13 — Billing wielowalutowy, cennik promocyjny, Upstash prefix**

- Checkout Stripe w PLN/EUR/GBP (`STRIPE_PRO_PRICE_*`, `BillingCurrencySwitcher`).
- Ceny PRO w `pricing.ts`; promocja sterowana flagą PostHog `pro-promo-pricing` + `ProPriceDisplay`.
- Etykieta pola profilu: „Imię i nazwisko” (4 języki).
- Upstash rate limit: prefix `expense-control:ai:*`.
- Migracja `primaryCurrency` zastosowana lokalnie.

**2026-07-12 — Faza 6 zakończona (UI web, landing, Sentry, ustawienia użytkownika)**

- Route groups `(public)` i `(app)` z headerem/stopką i sidebar.
- Landing page SaaS z sekcjami Hero, Features, Pricing, CTA.
- Dashboard, skaner paragonów (draft flow), czat AI, ustawienia + Danger Zone.
- API: `GET /api/dashboard`, `GET /api/ai/chat-quota`, `PATCH/DELETE /api/auth/me`, `POST /api/billing/checkout|portal`.
- Migracja `primaryCurrency` na `User`; Sentry (`@sentry/nextjs`).
- i18n UI w 4 językach; `LocaleProvider` z cookie.

**2026-07-12 — Deploy produkcyjny Vercel, PostHog, OAuth Google, cron-job.org**

- Naprawiono deploy Vercel: cron Hobby (usunięto `downgrade-past-due` z `vercel.json`), `DIRECT_DATABASE_URL` przez session pooler, build bez dotenv.
- Skonfigurowano gałęzie: `main` → production, `dev` → preview.
- cron-job.org: hourly `downgrade-past-due` + `CRON_SECRET` (test 200).
- PostHog: projekt EU, env na Vercel, plan Free; pominięto wizard/Data Warehouse.
- Google OAuth: redirect URI + origins dla produkcji Vercel; logowanie działa.
- `prisma.config.ts`, poprawki ESLint (`currency.service.ts`, `PostHogProvider.tsx`).
- Commity m.in.: `88b383c` (cron-job), `4a632ff` (PostHog env).

**2026-07-10 — Utwardzenie Fazy 5 (idempotency, grace past_due, cykl limitów, rate limit)**

- Idempotency webhooków Stripe (`processed_stripe_events`, `stripe-webhook-idempotency.ts`).
- Grace `past_due`: 24h PRO, cron `downgrade-past-due` co godzinę (cron-job.org + `CRON_SECRET`).
- Anulowanie subskrypcji: PRO do końca opłaconego okresu (`active` + `cancel_at_period_end`).
- Reset limitów: `financialMonthStartDay` (rejestracja / dzień wykupu PRO), cron dzienny.
- Rate limit: osobne kubełki scan/chat, fail-closed w produkcji.
- Optymalizacja AI serwisów (jeden odczyt planu przy quota check).
- Migracja `20260710160000_billing_quota_and_stripe_idempotency`.
- Testy: `financial-month.test.ts`, rozszerzone `stripe-webhook.service.test.ts`.

**2026-07-10 — Faza 5 zakończona (Stripe webhooki, PostHog, rate limiting, cron reset)**

- Webhook Stripe: `POST /api/webhooks/stripe` + serwis `stripe-webhook.service.ts` (FREE ↔ PRO).
- Cron reset limitów: `GET /api/cron/reset-quotas` + `vercel.json` (1. dzień miesiąca).
- PostHog: provider klienta, capture serwerowy, eventy AI i `subscription_upgraded`.
- Rate limiting Upstash: 5 req/min na endpointach AI (`apps/web/src/lib/rate-limit.ts`).
- Zaktualizowano `.env.example`, `env.ts`, `turbo.json`, i18n (`api.errors.rateLimitExceeded`).
- Testy: `stripe-webhook.service.test.ts`.

**2026-07-10 — Domknięcie Fazy 4 (testy czatu + refaktoryzacja kontekstu)**

- Wydzielono `chat-context.ts` — testowalna agregacja transakcji i budowa system promptu.
- Dodano testy jednostkowe: `chat-context.test.ts`, `chat.service.test.ts`.
- Skonfigurowano aliasy Vitest w `apps/web/vitest.config.ts`.
- Uaktualniono `PROGRESS.md` — Faza 4 zamknięta, gotowość do Fazy 5.

**2026-07-10 — Usunięcie analizy PDF z zakresu; Faza 4 odchudzona do czatu AI**

- Usunięto endpoint `/api/ai/analyze-statement`, serwis `statement-analyzer.service.ts`, zależność `pdf-parse`.
- Usunięto limity i licznik `monthlyAiPdfAnalysisCount` z planów i schematu Prisma.
- Zaktualizowano dokumentację (`PROGRESS.md`, `ARCHITECTURE.md`) i reguły agenta (`.cursorrules`).
- Zachowano pełną implementację predykcyjnego czatu AI z kontekstem transakcji z bazy.

**2026-07-09 — Limity planów skanera AI (FREE 3 / PRO 150)**

- Wspólne limity w `@shared/features/billing/plan-limits.ts`.
- Rozdzielone komunikaty i18n: `quotaExceeded` (FREE) vs `monthlyLimitReached` (PRO).
- Endpoint `GET /api/ai/scan-quota` dla przyszłego UI (widoczny, zablokowany przycisk).
- Testy jednostkowe limitów planów.

**2026-07-09 — Faza 3 zakończona**

- Moduł walut: frankfurter.app + cache w `exchange_rates` + fallback.
- Skaner paragonów AI: in-memory buffer, Zod, quota, draft bez auto-zapisu.
- CRUD `Transaction` i `RecurringExpense` z pełnym API.
- i18n dla skanera, walut, transakcji cyklicznych (4 języki).
- Middleware: `/api/*` z własną autoryzacją (wsparcie mobile Bearer).

**2026-07-09 — Faza 2 zamknięta (weryfikacja E2E)**

- Zastosowano migrację na Supabase i seed danych deweloperskich.
- Naprawiono ładowanie `.env` w dev (błąd 500 „Invalid environment variables” przy logowaniu).
- Potwierdzono działanie auth: `POST /api/auth/login` → **200 OK**.
- Zaktualizowano `.env.example` (dual Supabase URLs, uwagi o haśle).

**2026-07-09 — Faza 2.1 (utwardzenie fundamentu)**

- Dodano auth guard (middleware web + AuthGuard mobile).
- Skonfigurowano dual Supabase connection strings (`DATABASE_URL` pooler + `DIRECT_DATABASE_URL`).
- Dodano seed deweloperski (`npm run db:seed`) z przykładowym użytkownikiem i danymi.
- Dodano endpoint `GET /api/health` do monitoringu deployu.
- Naprawiono CI: Turbo `globalPassThroughEnv`, job-level env, Prettier formatting.

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
