# Postęp projektu — Smart Expense Control

## Fazy projektu

1. **Inicjalizacja Monorepo i CI/CD** — [✅ Zrobione]
2. **Baza Danych (Prisma/Drizzle), Auth i i18n** — [✅ Zrobione]
3. **Wielowalutowość i Skaner AI (In-Memory Buffer)** — [✅ Zrobione]
4. **Predykcyjny Czat AI i PDF**
5. **PostHog (Flags & Analytics) i Stripe**
6. **UI Dashboard, i18n UI i Sentry**

## Latest Handoff Log

**2026-07-09 — Faza 3 uzupełniona (limity planów skanera AI). Gotowość do Fazy 4.**

### Limity skanera AI (decyzja produktowa)

| Plan     | Limit skanów/mies. | Po wyczerpaniu                                                           |
| -------- | ------------------ | ------------------------------------------------------------------------ |
| **FREE** | **3** (trial)      | Przycisk **widoczny, zablokowany** + CTA „Przejdź na Pro” (UI w Fazie 6) |
| **PRO**  | **150**            | Komunikat `scanner.errors.monthlyLimitReached`                           |

- **Shared:** `packages/shared/src/features/billing/plan-limits.ts` — `PLAN_LIMITS`, `getAiScanQuotaStatus()`, `getAiScanLimit()`.
- **Backend:** `checkAiScanQuota()` używa wspólnych limitów; FREE → `quotaExceeded`, PRO → `monthlyLimitReached`.
- **API quota (dla UI):** `GET /api/ai/scan-quota` → `{ plan, quota: { limit, used, remaining, canScan, isBlocked } }`.
- **Licznik:** inkrementowany tylko po **udanym** skanie (po walidacji Zod).

### Wielowalutowość

- **Shared:** `packages/shared/src/features/currency/` — `convertAmount()`, `fetchRatesFromFrankfurter()`, stałe fallback (`STABLE_FALLBACK_RATES`), TTL cache 24h.
- **Web service:** `apps/web/src/features/currency/services/currency.service.ts` — `syncExchangeRates()` zapisuje kursy do `exchange_rates`, fallback: API → DB → stałe kursy.
- **API:** `GET /api/currency/rates` — zwraca mapę kursów (wymaga auth).
- **Przeliczanie:** `convertToPrimaryCurrency(amount, from, primaryCurrency='PLN')` — domyślna waluta główna PLN (brak pola `primaryCurrency` na `User` — do dodania w Fazie 6 UI).

### Skaner AI (In-Memory Buffer)

- **Route:** `POST /api/ai/scan-receipt` — `multipart/form-data`, pole `receipt` (plik graficzny).
- **Serwis:** `apps/web/src/features/ai/services/receipt-scanner.service.ts`
  - Model: `gpt-4o-mini` (vision via base64, bez zapisu pliku na dysk/S3).
  - Walidacja Zod: `receiptScanResultSchema` w `@shared/features/transactions/schemas`.
  - Zwraca `{ draft, message }` — **nie zapisuje** transakcji; użytkownik potwierdza przez `POST /api/transactions`.
  - Flaga `needsManualReview: true` gdy AI niepewne — klient pokazuje ostrzeżenie (toast), draft i tak jest zwracany.
- **Env:** `OPENAI_API_KEY` (opcjonalne w t3-env, wymagane runtime do skanowania).

### CRUD Transakcji

- **Serwisy:**
  - `apps/web/src/features/transactions/services/transaction.service.ts`
  - `apps/web/src/features/transactions/services/recurring-expense.service.ts`
- **API:**
  - `GET/POST /api/transactions`
  - `GET/PATCH/DELETE /api/transactions/[id]`
  - `GET/POST /api/recurring-expenses`
  - `GET/PATCH/DELETE /api/recurring-expenses/[id]`
- **Auth:** `getAuthenticatedUser()` — cookie (web) lub Bearer JWT (mobile).
- **Middleware:** wszystkie `/api/*` omijają redirect do loginu (auth w route handlerach).

### i18n (Faza 3)

Klucze `scanner.*`, `currency.*`, `recurring.*`, rozszerzone `transactions.*` w `en`, `pl`, `de`, `es`.

---

## Plan na przyszłe fazy

### Faza 4 — Predykcyjny Czat AI i PDF

- Czat asystenta finansowego z kontekstem transakcji użytkownika (OpenAI/Anthropic).
- Import i analiza PDF wyciągów bankowych.
- Wspólne limity planów dla operacji AI (analogicznie do `plan-limits.ts`).

### Faza 5 — PostHog i Stripe

- Stripe webhooki → aktualizacja `currentPlan` (FREE ↔ PRO).
- Reset `monthlyAiScansCount` przy zmianie miesiąca (Vercel Cron lub Stripe billing cycle).
- PostHog: eventy skanowania, konwersja FREE → PRO, feature flags.
- **Rate limiting** na `POST /api/ai/scan-receipt` (Upstash Redis, np. max 10 skanów/godzinę) — ochrona przed botami oprócz limitu 150/mies.

### Faza 6 — UI Dashboard, i18n UI i Sentry

- Dashboard wydatków z wielowalutowością.
- **Skaner paragonów w UI:**
  - Przycisk „Skanuj paragon” **zawsze widoczny**.
  - Gdy `quota.isBlocked === true`: przycisk `disabled`, styl zablokowany, badge „Pro” (FREE) lub komunikat limitu (PRO).
  - `GET /api/ai/scan-quota` do stanu UI przed kliknięciem.
  - Formularz potwierdzenia draftu ze skanera.
  - Błędy wyłącznie przez **toast** (sonner).
- Pole `primaryCurrency` na `User` + wybór w ustawieniach.
- Sentry: monitoring błędów AI i API.

---

## Ostatnie zmiany

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
