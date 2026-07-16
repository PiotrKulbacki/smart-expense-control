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
9. **Faza 8.1: layout, budżet, historia, koszty stałe** — [✅ Zrobione]
10. **Faza 8.1.2: poprawki filtra wykresu i kalendarza** — [✅ Zrobione]
11. **Faza 8.3: integracja dashboardu — sync filtrów, statystyki dzienne** — [✅ Zrobione]
12. **Faza 8.4: kategorie, CTA, sidebar, tryb analizy średnich** — [✅ Zrobione]
13. **Faza 8.5: UX czatu AI — awatary, kolejność wiadomości, ikona wysyłania** — [✅ Zrobione]
14. **Faza 8.6: dynamiczny budżet miesięczny w kontekście czatu AI** — [✅ Zrobione]
15. **Faza 8.7: precyzyjna zmienna `daysRemainingInCycle` w kontekście czatu AI** — [✅ Zrobione]
16. **Faza 8.8: pełny kontekst panelu „Suma wydatków" w czacie AI (koszty stałe, metryki dzienne)** — [✅ Zrobione]
17. **Faza 8.9: naprawa rate-limitera skanowania paragonów** — [✅ Zrobione]
18. **Faza 9.0: split paragonów (podział kwotowy + AI grouping)** — [✅ Zrobione]
19. **Faza 9.1: interaktywny split, klasyfikacja AI, grupowanie w Historii** — [✅ Zrobione]
20. **Faza 9.2: dynamiczne kategorie, ustawienia, scroll pulpitu, grupowanie historii** — [✅ Zrobione]
21. **Faza 9.3: persystencja zdjęć (Supabase Storage) i archiwum dokumentów** — [✅ Zrobione]
22. **Faza 9.4: cennik PRO, waluta USD, kampania PROMO50 (Stripe)** — [✅ Zrobione]
23. **Faza 9.5: refaktoryzacja UI Archiwum, audyt modelu AI, poprawa dokładności skanera** — [✅ Zrobione]
24. **Faza 9.6: metryka „Dni bez wydatków" i AI Insights na Dashboardzie** — [✅ Zrobione]
25. **Faza 9.7: limity wydatków na kategorie (settings + dashboard + AI)** — [✅ Zrobione]
26. **Faza 9.8: optymalizacja wydajności ładowania widoków (prefetch, cache, API)** — [✅ Zrobione]
27. **Faza 9.9: zgoda na ciasteczka (Cookie Consent Banner & Preferences, RODO/GDPR)** — [✅ Zrobione]
28. **Faza 10: cennik 3-poziomowy (Premium), retencja nieaktywnych, dunning Resend, rolling photo retention** — [✅ Zrobione]

## Żelazne zasady agentów (obowiązkowe)

### Formatowanie Prettier — zawsze na koniec pracy

Każdy agent AI **musi** wykonać poniższe kroki przed zakończeniem sesji, jeśli w trakcie pracy zmodyfikował jakiekolwiek pliki kodu lub konfiguracji objęte Prettierem.

1. **Napraw formatowanie** — z katalogu głównego repozytorium:

   ```bash
   npx prettier --write .
   ```

   (Dopuszczalna wariantacja: `--write` tylko na zmienionych plikach, jeśli zakres zmian jest wąski.)

2. **Zweryfikuj** — CI uruchamia dokładnie ten check; musi przejść bez ostrzeżeń:

   ```bash
   npm run format
   ```

3. **Jeśli krok 2 zwraca błąd** — napraw pliki wskazane przez Prettier i powtórz kroki 1–2 aż `npm run format` zakończy się sukcesem (`All matched files use Prettier code style!`).

**Nie pomijaj tego kroku.** Brak formatowania powoduje fail joba `format` w GitHub Actions (`prettier --check .`).

### Loadery i stany ładowania — obowiązkowe przy akcjach asynchronicznych

Każda akcja użytkownika, która wywołuje **fetch API**, **nawigację** lub **odświeżenie widoku** musi dawać natychmiastowy feedback wizualny. Użytkownik nie może klikać wielokrotnie ani zgadywać, czy coś się dzieje.

1. **Przyciski akcji (submit, zapis, usuwanie, billing, logout)** — stan `loading` / `disabled` po kliknięciu:
   - komponent `Button` z propem `loading` (spinner + blokada),
   - lub `LoadingSpinner` obok etykiety w `AlertDialogAction` / przyciskach niestandardowych.
   - Wzorzec: `isSaving` / `isDeleting` / `isBillingLoading` ustawiane na `true` przed `fetch`, `false` w `finally`.

2. **Odświeżanie sekcji / całego widoku (np. dashboard po filtrze, zakresie dat, CRUD)** — rozróżnij:
   - **pierwsze ładowanie strony** → pełne szkielety (`animate-pulse`) zamiast pustego ekranu;
   - **ciche odświeżenie** (`silent: true`, `isRefreshing`) → szkielety / spinnery **w obrębie sekcji**, bez przeładowania całej strony.
   - Przekazuj `isRefreshing` do kart, list i filtrów; blokuj interakcję (select, toggle) na czas fetchu.

3. **Nawigacja (sidebar, linki do wolnych widoków)** — spinner przy klikniętej pozycji menu do momentu zmiany `pathname` (`pendingHref` + `LoadingSpinner`).

4. **Komponenty wspólne** — nie wymyślaj nowych spinnerów:
   - `LoadingSpinner` z `@web/components/ui/loading-spinner`,
   - szkielety sekcji: `bg-elevated … animate-pulse` (jak w `RecentTransactionsList`, `CategoryDonutChart`, `BudgetProgress`).

5. **Dostępność** — przy globalnym odświeżeniu: `role="status"`, `aria-live="polite"`, `aria-busy` na przyciskach w trakcie ładowania.

6. **i18n** — komunikaty statusu (np. „Aktualizowanie pulpitu…") w `@shared/features/i18n`, nie hardkod w komponentach.

**Reguła praktyczna:** jeśli dodajesz `onClick` → `fetch` lub `router.push`, dodaj też loader lub szkielet i `disabled` na czas operacji.

## Latest Handoff Log

**2026-07-16 — Faza 10 zamknięta: Premium, TTL kont, dunning Resend, retencja zdjęć.**

### Faza 10 — Cennik 3-poziomowy + polityki retencji i dunningu

- **Plany:** `FREE` | `PRO` | `PREMIUM` (enum Prisma + `PlanType`).
- **Limity:** FREE 5 skanów / 10 czat; PRO 50 / 50; PREMIUM 120 / 250; retencja zdjęć 0 / 60 dni / 365 dni (`plan-limits.ts`).
- **Ceny Premium UI:** 46 PLN / 11 EUR / 8.50 GBP / 12 USD; PRO bez zmian; `PROMO50` (−50%) dla PRO i Premium.
- **Stripe:** `STRIPE_PREMIUM_PRICE_{PLN,EUR,GBP,USD}`; checkout z `{ currency, plan }`; webhook rozróżnia PRO/PREMIUM po metadata/price ID; `invoice.payment_failed` → karencja + 1. mail.
- **Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; serwis `resend.service.ts` + `dunning-email.service.ts` (link do Stripe Billing Portal).
- **Cron `downgrade-past-due` (cron-job.org, co godzinę):** po ~12h 2. mail reminder; po 24h downgrade do FREE (PRO i PREMIUM).
- **TTL kont:** `User.lastActiveAt` (throttled touch przy auth); cron dzienny `DELETE /api/cron/delete-inactive-accounts` (2 lata) — storage receipts + cascade Prisma.
- **Photo retention:** `Transaction.imageExpiresAt`; FREE bez trwałego storage; cron `cleanup-expired-receipts` czyści tylko pliki/URL (transakcje zostają).
- **UI/i18n:** landing 3 kolumny; Settings upgrade PRO/Premium + notice TTL; en/pl/de/es.
- **Migracja:** `20260716200000_phase10_premium_retention_dunning` (do `migrate:deploy`).

**Deploy / ops:**

1. `migrate:deploy` — `20260716200000_phase10_premium_retention_dunning` ✅ zastosowana.
2. Env Vercel: `STRIPE_PREMIUM_PRICE_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
3. **Vercel Cron (Hobby — 1 slot):** tylko `/api/cron/reset-quotas` (`5 0 * * *`).
4. **cron-job.org:** `downgrade-past-due` (co godzinę), `refresh-aggregations`, `cleanup-expired-receipts`, `delete-inactive-accounts` — header `Authorization: Bearer CRON_SECRET`.
5. Stripe webhook: `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.payment_failed`.

---

**2026-07-16 — Faza 9.9 zamknięta: Cookie Consent Banner & Preferences (RODO/GDPR).**

### Faza 9.9 — Cookie consent

- **Context/hook:** `CookieConsentProvider` + `useCookieConsent()` w `apps/web/src/features/cookie-consent/` — kategorie `necessary` (zawsze on), `analytics`, `marketing`.
- **Persystencja:** cookie przeglądarki `sec_cookie_consent` (JSON, `max-age` 365 dni, SameSite=Lax); helpery `canUseAnalytics` / `canUseMarketing`.
- **UI:** miękki floating banner (lewy dolny róg, dark glass) — Akceptuj wszystkie / Odrzuć opcjonalne / Zarządzaj preferencjami; modal z toggle’ami (niezbędne zablokowane).
- **Integracja:** PostHog inicjalizowany dopiero przy `consent.analytics === true`; `opt_out_capturing` przy odmowie/wycofaniu.
- **i18n:** `cookies.*` w en/pl/de/es.
- **Testy:** `storage.test.ts` (parsowanie cookie).

---

**2026-07-16 — Faza 9.8 zamknięta: optymalizacja wydajności ładowania widoków aplikacji.**

### Faza 9.8 — Performance: prefetch, cache, API

- **TanStack Query:** `QueryProvider` w root layout; `staleTime` 30s; klucze w `query-keys.ts`; fetchery w `fetchers.ts`.
- **Server prefetch:** `dashboard/page.tsx` — `getDashboardData` + `getUserAiScanQuota` na serwerze, hydracja do klienta; `history/page.tsx` — transakcje okresu + `resolveHistoryInitialState`; `settings/page.tsx` — `initialUser` z sesji (bez `GET /api/auth/me`).
- **`(app)/layout.tsx`:** `getUserFromSession` opakowane w `cache()` (deduplikacja w obrębie requestu); `AppUserProvider`; prefetch kategorii (`listUserCategories`) + `HydrationBoundary`.
- **`loading.tsx`:** per route (`dashboard`, `history`, `settings`, `chat`, `scanner`) + fallback `(app)/loading.tsx`; szkielety w `RouteLoadingSkeletons.tsx` (identyczne klasy jak dotychczas).
- **API dashboard:** jedno zapytanie transakcji zamiast dwóch (chart + recent); filtrowanie okresu w pamięci.
- **Kursy walut:** jedno `findMany` + deduplikacja par w pamięci; cache in-process 60s (`IN_MEMORY_CACHE_TTL_MS`).
- **Klient:** `CategoriesProvider` na `useQuery`; `DashboardView` / `HistoryView` na React Query z `initialData`; loader do momentu gotowości kategorii + danych widoku; AI Insights ładowane przez `requestIdleCallback` (defer); Recharts w `CategoryDonutChartPie` przez `next/dynamic`.
- **Scanner:** `scanner/page.tsx` — server prefetch dla `/api/ai/scan-quota` i archiwum dokumentów; `ReceiptScanner` oraz `ReceiptArchive` oparte o React Query zamiast pierwszego `useEffect` po wejściu do zakładki.
- **Settings:** `settings/page.tsx` — hydracja danych dla `CategoryLimitsSection`, `RecurringExpensesSection` i kursów walut; obie sekcje korzystają z query cache zamiast osobnych initial fetchy po renderze paneli.
- **Chat AI:** `chat/page.tsx` — server prefetch quota + pierwszej strony historii; `AiChatView` startuje z gotowym stanem rozmowy, a dalsze strony historii są dociągane lazy przy scrollu.
- **Sidebar:** `router.prefetch` + prefetch dashboard API przy hover/focus na linku.
- **Zależność:** `@tanstack/react-query` w `apps/web`.

---

**2026-07-16 — Faza 9.7 zamknięta: limity wydatków na kategorie (settings, dashboard, AI).**

### Faza 9.7 — Category spending limits

- **DB:** model `UserCategoryLimit` (`userId` + `categoryKey` + `limitAmount`); migracja `20260716120000_add_user_category_limits`; kaskadowe usuwanie limitu przy usuwaniu własnej kategorii.
- **API:** `GET/PUT/DELETE /api/category-limits` — limity dla kategorii wbudowanych i custom (`custom:<id>`); walidacja Zod w `@shared/.../category-limit-schemas`.
- **Settings:** sekcja `CategoryLimitsSection` — dodawanie/usuwanie limitów w walucie głównej.
- **Dashboard:** `summary.categoryLimits` z `GET /api/dashboard`; karta `CategoryLimitsProgressCard` z paskami postępu (kolor HSL: zieleń → czerwień wraz ze zbliżaniem się do limitu).
- **AI:** limity w kontekście AI Insights oraz system promptu czatu (spent/limit/percentage/isOverLimit).
- **Fix:** `React.FormEvent` (deprecated) → `{ preventDefault(): void }` w `SettingsView`.
- **i18n:** `settings.categoryLimits.*`, `dashboard.categoryLimits.*` (en/pl/de/es).
- **Testy:** `category-limit-schemas.test.ts`, rozszerzony `chat-context.test.ts`.
- **UX (dalsze):** sortowanie list rozwijanych kategorii A–Z (`sortCategoriesForSelect`, `useSortedCategoriesForSelect`) z „Inne/Other" zawsze na końcu; loadery przy odświeżaniu dashboardu (filtr wykresu, suma wydatków, budżet, limity, statystyki, CTA, nawigacja sidebar); i18n `dashboard.refreshing`.

**Deploy:** migracja `20260716120000_add_user_category_limits` (`migrate:deploy` na Vercel).

---

**2026-07-16 — Faza 9.6 zamknięta: metryka „Dni bez wydatków" oraz AI Insights na Dashboardzie.**

### Faza 9.6 — No-Spend Days + AI Insights

- **DB:** model `AiInsight` (cache spostrzeżeń per user, `content` JSON, TTL 24h po `updatedAt`); migracja `20260716000000_add_ai_insight`.
- **No-Spend Days:** `computeNoSpendDays()` liczy dni bez transakcji w okresie rozliczeniowym (koszty stałe z `RecurringExpense` pomijane); wynik w `summary.noSpendDays` z `GET /api/dashboard` (format `X / Y`).
- **API:** `GET /api/dashboard/insights?locale=&force=` — cache 24h, regeneracja przez OpenAI (`gpt-4o-mini`, `response_format: json_object`), walidacja Zod (`insightSchema`: type/metric/message/actionableStep); force-refresh z rate limitem.
- **Kontekst AI:** wydatki wg kategorii, budżet/pozostało, no-spend days, 10 ostatnich transakcji + dynamiczna data serwera w prompcie.
- **UI:** karta transakcji → układ 2-kolumnowy (`TransactionsInsightsCard`): lewa — licznik + no-spend; prawa — boks spostrzeżenia (kolory wg `type`) + przycisk odśwież; skeletony `animate-pulse`.
- **i18n:** `dashboard.noSpendDays.*`, `dashboard.insights.*` (en/pl/de/es).
- **Testy:** `no-spend-days.test.ts`.

---

**2026-07-15 — Faza 9.5 zamknięta: refaktoryzacja UI Archiwum, audyt modelu AI Vision, poprawa dokładności skanera (Lidl receipt bugfix).**

### Faza 9.5 — UI Archiwum, audyt modelu AI, poprawa dokładności skanera

- **Model Vision:** domyślny model skanera zmieniony z `gpt-4o-mini` na `gpt-4o`; konfigurowalny przez `OPENAI_VISION_MODEL` (env, `turbo.json`, `.env.example`).
- **Dynamiczna kotwica temporalna:** przy każdym wywołaniu API do promptu wstrzykiwana jest aktualna data serwera (`YYYY-MM-DD`) — poprawna interpretacja skróconych dat (np. `02.07.26` → `2026-07-02`).
- **Strict OCR Integrity:** prompt zabrania modyfikacji cen w celu dopasowania sumy; rabaty jako osobne pozycje ujemne; `detail: 'high'` dla Vision API; serwer wymusza `needsManualReview` gdy suma pozycji ≠ total.
- **Archiwum UI:** foldery miesięczne w responsywnej siatce (`grid-cols-1…4`); nawigacja folder → lista dokumentów z przyciskiem „Wróć"; kompaktowe karty poziome z miniaturą `w-16 h-24` / `w-20 h-28`.
- **i18n:** `scanner.archive.backToFolders` (en/pl/de/es).
- **Test Lidl:** paragon IMG_9903 — data `2026-07-02`, kwota `36.52 EUR`, pozycja „Salat Hähnchen" `2.49` odczytana bez fudgingu cen.
- **Waluta USD:** dodana do transakcji, skanera, kursów walut i waluty głównej użytkownika (`CURRENCY_CODES`, migracja `20260715164500_add_currency_usd`); rabaty ujemne w `receiptLineItemAmountSchema`.

---

**2026-07-14 — Faza 9.4 zamknięta: nowy cennik PRO, waluta USD, integracja kodu promocyjnego PROMO50 (Stripe).**

### Faza 9.4 — Cennik PRO, USD, kampania PROMO50

- **Cennik UI:** bazowe ceny PRO — 34 PLN, 8 EUR, 6.5 GBP, 9 USD; podgląd ceny promocyjnej (−50%) z badge „Użyj kodu PROMO50 przy kasie".
- **Waluta USD:** dodana do `BILLING_CURRENCIES`, switchera walut płatności, mapowania Stripe Price ID (`STRIPE_PRO_PRICE_USD`).
- **Stripe Checkout:** `allow_promotion_codes: true` — użytkownik wpisuje `PROMO50` na stronie Stripe; ceny bazowe w Stripe = ceny regularne w UI.
- **Strategia rabatu:** natywne Stripe Coupons + Promotion Codes (nie osobne Price ID promocyjne) — jeden kupon procentowy 50% na wszystkie waluty.
- **Env:** `STRIPE_PRO_PRICE_USD` w `.env.example`, `apps/web/src/env.ts`, `turbo.json`.
- **i18n:** `landing.pricing.free.priceUsd`, `landing.pricing.pro.promoCodeBadge` (en/pl/de/es).
- **Testy:** `pricing.test.ts` — weryfikacja cen bazowych i obliczeń promo 50%.

**Deploy Stripe (Test mode):** utwórz 4 ceny bazowe (PLN/EUR/GBP/USD) → kupon 50% off → promotion code `PROMO50` → skopiuj Price ID do env.

---

**2026-07-14 — Faza 9.3 zamknięta: Supabase Storage dla paragonów, archiwum dokumentów w Skanerze, garbage collector.**

### Faza 9.3 — Persystencja zdjęć i archiwum dokumentów

- **DB:** `Transaction.receiptImageUrl` (nullable) + indeks `(userId, receiptImageUrl)`; migracja `20260714140000_add_transaction_receipt_image_url`.
- **Supabase Storage:** prywatny bucket `receipts`, ścieżka `{userId}/{receiptGroupId}.{ext}`; SQL IaC w `packages/database/supabase/receipts-storage.sql`; env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Skaner (backend):** przed analizą AI upload do Storage → signed URL do OpenAI Vision (zamiast base64); draft z `receiptGroupId` + `receiptImageUrl`; rollback pliku przy błędzie AI/parsowania.
- **Zapis transakcji:** `receiptGroupId`/`receiptImageUrl` przekazywane z draftu do `POST /api/transactions` i `POST /api/transactions/batch`.
- **Garbage collector:** `deleteReceiptImageIfOrphaned()` przy usuwaniu transakcji/grupy; `POST /api/receipts/discard` dla anulowanych skanów bez zapisu.
- **Archiwum UI:** `ReceiptArchive` — foldery miesięczne (accordion), podział na dni, karty z miniaturą, lightbox, link do `/history?receiptGroupId=…`; `GET /api/receipts/archive`.
- **Skaner (UI):** drag & drop, kompresja WebP/JPG po stronie klienta (`compress-receipt-image.ts`).
- **Historia:** filtr `receiptGroupId` w API i auto-rozwijanie grupy z URL.
- **i18n:** `scanner.archive.*`, `scanner.errors.storage*`, `scanner.labels.chooseFile|dropDocument|dragDropHint` (en/pl/de/es).

**Deploy:** migracja `20260714140000_add_transaction_receipt_image_url` + uruchomienie `receipts-storage.sql` w Supabase + ustawienie env Storage.

---

**2026-07-14 — Faza 9.2 zamknięta: reaktywne kategorie w skanerze, uporządkowane ustawienia, scroll pulpitu, dopracowane grupowanie w Historii.**

### Faza 9.2 — Poprawki UX splitów i kategorii

- **Reaktywne kategorie w skanerze** — `CategoriesProvider` (wspólny kontekst React) w `layout.tsx`; `reload()` po utworzeniu kategorii inline odświeża wszystkie dropdowny `CategorySelectWithCreate` na ekranie skanera.
- **Ustawienia kategorii** — `CategoriesSection`: kategorie systemowe jako zwarte tagi (read-only); lista edytowalna tylko dla kategorii użytkownika (`isCustom`).
- **Historia** — dopracowane grupowanie splitów: płynna animacja rozwijania pod-wierszy (`grid-rows` transition); badge + ikona paragonu.
- **Dashboard** — panel „Ostatnie transakcje" z natywnym przewijaniem (`overflow-y-auto`, `max-h-[350px]`, klasa `.recent-transactions-scroll`); `GET /api/dashboard` zwraca `receiptGroupId` w `recentTransactions`; grupowanie splitów (`groupReceiptSplits`) z edycją/usuwaniem całej grupy jak w Historii.
- **i18n** — `settings.categories.systemTitle|systemHint|customTitle|customEmpty` (en/pl/de/es).

---

**2026-07-14 — Faza 9.1 zamknięta: interaktywny split pozycji, wzmocniona klasyfikacja AI, grupowanie w Historii.**

### Faza 9.1 — Interaktywny split paragonów

- **Prompt AI** — reguły heurystyczne: alkohol (`% Vol.`, Spritz, Bier, Wein… → `Alcohol`), toniki/napoje → `Groceries` (nie `Other`), Pfand → kategoria koszyka/produktu; wymagane `lineItems[]` z `{ name, amount, category }`.
- **Schemat** — `receiptLineItemSchema`, `receiptSplitItemSchema` (name+amount); preprocess legacy string items.
- **Shared** — `receipt-split-state.ts`: `groupLineItemsToSplits`, `moveLineItemCategory`, `flattenSplitsToLineItems`.
- **UI skanera** — interaktywna lista pozycji z dropdownem kategorii per pozycja; auto-sync kwot grup; zablokowana kwota total w trybie split; `CategorySelectWithCreate` (+ POST `/api/categories`).
- **Historia** — grupowanie po `receiptGroupId`: jeden wiersz zbiorczy z badge „Split", rozwijane pod-wiersze; `DELETE/PATCH /api/transactions/group/[receiptGroupId]` dla całej grupy.
- **Testy** — `receipt-split-state.test.ts`, `transaction-groups.test.ts`, rozszerzone `receipt-scanner.service.test.ts`.
- **i18n** — `scanner.split.createCategory*`, `history.split.*` (en/pl/de/es).

---

**2026-07-14 — Faza 9.0 zamknięta: split paragonów (Faza 1 + Faza 2 planu hybrydowego).**

### Faza 9.0 — Split paragonów na wiele kategorii

**Problem:** Paragon z supermarketu (np. Kaufland) miał jedną kategorię AI → brak widoczności wydatków na Chemię/Household/Cosmetics w wykresie donut i czacie AI.

**Faza 1 — podział kwotowy (opt-in):**

- **DB:** `Transaction.receiptGroupId` (nullable) + indeks `(userId, receiptGroupId)`; migracja `20260714120000_add_transaction_receipt_group_id`.
- **API:** `POST /api/transactions/batch` — atomowy zapis N transakcji; wspólny `receiptGroupId` gdy `splits.length > 1`.
- **Shared:** `createTransactionBatchSchema`, `splitAmountsMatchTotal()`, `MAX_TRANSACTION_SPLITS = 5`; testy w `schemas.test.ts`.
- **UI:** `ReceiptScanner.tsx` — przycisk „Rozbij wydatek", wiersze kategoria+kwota, walidacja sumy na żywo, Zapisz disabled gdy suma ≠ total.
- **i18n:** `scanner.split.*`, `transactions.errors.splitSumMismatch|tooManySplits`, `transactions.success.batchCreated` (en/pl/de/es).

**Faza 2 — AI-Grouped Split (pre-fill splitu):**

- **Prompt:** `receipt-scanner.service.ts` — `suggestedSplits[]`, `hasMultipleCategories`; grupowanie 2–5 kategorii, suma splitów = total.
- **Schemat:** `receiptScanResultSchema` rozszerzony o `suggestedSplits` (z opcjonalnymi `items[]` do UI).
- **Normalizacja:** nieprawidłowe kategorie / zła suma → fallback do ręcznego splitu (pusta tablica).
- **UI:** auto-włączenie trybu splitu gdy AI zwróci ≥2 grupy; kafelki z rozwijalną listą pozycji (max 5 + „+N więcej"); „Zapisz bez rozbicia" wraca do jednej transakcji.

**Świadomie pominięte (wymaga osobnej zgody użytkownika):**

- Retroaktywny split z Historii (brak persistencji obrazu paragonu).
- Grupowanie wizualne splitów w Historii po `receiptGroupId`.

**Deploy:** przed produkcją zastosować migrację `20260714120000_add_transaction_receipt_group_id` (`migrate:deploy` w pipeline Vercel).

**Do weryfikacji przez następnego agenta:**

- ~~Testy jednostkowe `receipt-scanner.service.test.ts` (mock JSON AI)~~ — **dodane** (7 testów: `receipt-scan-splits.ts` + pipeline JSON Kaufland).
- Ręczny test E2E: paragon mieszany (spożywcze + chemia) → auto-split → zapis → donut pokazuje obie kategorie.

---

**2026-07-14 — Faza 8.9 zamknięta: naprawa rate-limitera skanowania paragonów.**

### Faza 8.9 — Rate limit skanera paragonów (`/api/ai/scan-receipt`)

- **Przyczyna 429:** Endpoint sprawdzał Redis (5 req/min, fail-closed bez Upstash) **przed** quota planu w DB — ten sam antywzorzec co naprawiony wcześniej w czacie AI. UI pokazywało dostępną quota skanów, a endpoint zwracał `api.errors.rateLimitExceeded`.
- **Diagnostyka bucketów:** Skan i czat już miały osobne klucze Redis (`expense-control:ai:scan` vs `expense-control:ai:chat`) — problem nie wynikał ze współdzielonego bucketu, lecz z kolejności sprawdzeń i zbyt restrykcyjnego limitu skanu.
- **Naprawa:**
  - Kolejność: najpierw `checkAiScanQuota()` (DB), potem ewentualny rate limit.
  - **FREE:** pominięcie Redis per-minute — limit miesięczny w DB (`monthlyAiScansCount`) jest jedynym limitem biznesowym.
  - **PRO:** Redis jako ochrona przed spamem (15 req/min zamiast 5).
  - **Bez Upstash:** fail-open dla skanu (jak czat) — quota DB chroni koszty.
- **Logowanie:** `checkAiRateLimit()` loguje `Rate Limit Check: Key: [key], Remaining: [X], Total: [Y]` przy każdym sprawdzeniu (łatwa odróżnienie 429 z Redis vs quota DB vs OpenAI).

---

**2026-07-14 — Faza 8.8 zamknięta: pełny kontekst panelu „Suma wydatków" w czacie AI.**

### Faza 8.8 — Kontekst budżetowy zgodny z dashboardem

- **`DashboardBudgetSummary`** — `buildDashboardBudgetSummary()` w `chat-context.ts`: transakcje w walucie głównej + koszty stałe, pozostały budżet, średnio wydano/dzień, średnio do wydania/dzień; ta sama logika co `computeDailyBudgetStats()`.
- **Prompt** — pełny JSON podsumowania z instrukcjami: `totalSpentIncludingFixed` już zawiera koszty stałe; prognozy dzienne przez `daysUntilPayday` (jak dashboard), nie `daysRemainingInCycle`.
- **Shared** — `getBillingPeriodDayMetrics()` w `financial-month.ts` (daysElapsed, daysUntilPayday, daysRemainingInCycle).
- **Testy** — scenariusz z screenshota (1128,45 € wydane, 872 € pozostało, buty 160 € → ~24,54 €/dzień).

---

**2026-07-14 — Faza 8.7 zamknięta: precyzyjna zmienna `daysRemainingInCycle` w kontekście czatu AI.**

### Faza 8.7 — Dni pozostałe w cyklu rozliczeniowym (czat AI)

- **Wspólna logika cyklu** — `getDaysRemainingInCycle()` w `@shared/features/billing/financial-month.ts`: bazuje na `getQuotaPeriodStart` + `getQuotaPeriodEnd` (ta sama semantyka co dashboard); liczy pełne dni kalendarzowe do końca cyklu.
- **Dashboard vs czat** — dashboard używa `daysUntilPayday` (dni do startu następnego cyklu, `getChartFilterDayMetrics`); czat AI dostaje `daysRemainingInCycle` (dni do końca bieżącego cyklu, np. 14.07 → 11.08 = 28 dni) — to różne metryki, nie duplikujemy ich w shared.
- **Prompt systemowy** — `FinancialCycleMeta.daysRemainingInCycle` wstrzykiwane do `buildChatSystemPrompt()` z instrukcją: używaj tej liczby, nie stałych 30/31 dni; przy `0` — ostatni dzień cyklu, bez dzielenia przez zero.
- **Testy** — `financial-month.test.ts` (14.07, start 12 → 28 dni; ostatni dzień = 0); `chat-context.test.ts` (prompt + edge case ostatniego dnia).

---

**2026-07-14 — Faza 8.6 zamknięta: dynamiczny budżet miesięczny w kontekście czatu AI (override z dashboardu).**

### Faza 8.6 — Dynamiczny budżet w czacie AI

- **Pobieranie budżetu** — `resolveActiveMonthlyBudget()` w `chat-context.ts`: priorytet `User.currentMonthBudget` (nadpisanie z dashboardu na bieżący cykl), fallback `User.defaultMonthlyBudget`; waluta z `primaryCurrency`.
- **Prompt systemowy** — `buildChatSystemPrompt()` wstrzykuje wiążącą kwotę na bieżący cykl rozliczeniowy z adnotacją o priorytecie nadpisania z dashboardu.
- **Chat service** — `fetchFinancialContext()` pobiera oba pola budżetu + walutę w jednym zapytaniu Prisma; przekazuje `activeBudget` do promptu.
- **Testy** — `chat-context.test.ts`: override vs default, brak budżetu, scenariusz „po zmianie w dashboardzie AI widzi nową kwotę".

---

**2026-07-14 — Faza 8.5 zamknięta: UX czatu AI (awatary, kolejność wiadomości, ikona wysyłania).**

### Faza 8.5 — UX czatu AI

- **Awatary nadawców** — ikona `User` (warm) przy wiadomościach użytkownika, `Bot` (cool) przy odpowiedziach asystenta; spójne z paletą `--warm` / `--cool` z `globals.css`.
- **Kolejność wiadomości** — sortowanie chronologiczne przed renderem (`createdAt`, tiebreaker: rola user → assistant, potem `id`); naprawa `mergeOlderMessages`; API historii z `orderBy: [{ createdAt, id }]`; zapis pary user/assistant jako dwa osobne `create` zamiast `createMany` (eliminacja identycznego `createdAt`).
- **Input** — ikona `Send` w przycisku „Wyślij wiadomość".
- **Rollback optymistyczny** — przy błędzie API wiadomość użytkownika jest usuwana ze stanu lokalnego.

---

**2026-07-14 — Hotfix: czat AI 429 mimo dostępnej quota (FREE plan).**

### Czat AI — synchronizacja limitów planu vs Redis rate limit

- **Przyczyna:** `/api/ai/chat` sprawdzał Redis (5 req/min, fail-closed bez Upstash) **przed** quota planu w DB. UI pokazywało np. 8/10 wiadomości, a endpoint zwracał `api.errors.rateLimitExceeded` (429).
- **Naprawa:**
  - Kolejność: najpierw `checkAiChatQuota()` (DB), potem ewentualny rate limit.
  - **FREE:** pominięcie Redis per-minute — limit miesięczny w DB (`monthlyAiChatCount`) jest jedynym limitem biznesowym.
  - **PRO:** Redis jako ochrona przed spamem (30 req/min zamiast 5).
  - **Chat bez Upstash:** fail-open (quota DB chroni koszty); **skan:** od Fazy 8.9 również fail-open (wcześniej fail-closed).

---

**2026-07-14 — Faza 8.4 zamknięta: odświeżone kategorie, własne kategorie użytkownika, sync średnich dziennych z Sumą wydatków, CTA i sidebar.**

### Faza 8.4 — Kategorie, CTA, sidebar, tryb analizy

- **Średnie dzienne ↔ Suma wydatków** — `visibleTotalSpent` + `getChartFilterDayMetrics(appliedFilter)`; średnio wydano/dzień i średnio do wydania liczone z tej samej kwoty co nagłówek panelu; layout `justify-between`.
- **Sidebar** — logo dwuwierszowe: „Smart Expense" + „Control" rozciągnięte na szerokość (`text-align-last: justify`).
- **CTA dashboardu** — „Dodaj wydatek"; skan „Skanuj {{used}}/{{limit}}" na FREE, bez licznika na PRO; usunięto słowo „paragon" ze skanera.
- **Kategorie wbudowane** — dodano: Fuel, Household, Cosmetics, Hotels, Alcohol, Accounting, Mechanic; Coffee → CoffeeShop; usunięto Shopping, Utilities; migracja SQL istniejących transakcji.
- **Własne kategorie** — model `UserCategory`, API CRUD `/api/categories`, sekcja w Ustawieniach (+, edycja, safe delete z migracją transakcji).
- **Wykres donut** — dynamiczne kolory i nazwy (w tym custom) przez `CategoryDisplayContext`.
- **i18n** — `layout.brandLine1|2`, `dashboard.cta.scan|scanWithQuota`, `settings.categories.*`, nowe klucze kategorii w 4 językach.

---

**2026-07-13 — Faza 8.3 zamknięta: wspólny stan filtrów kategorii (Suma wydatków ↔ wykres), statystyki dzienne pod paskiem budżetu.**

### Faza 8.3 — Integracja komponentów Dashboardu

- **Sync filtrów kategorii** — stan `hiddenCategories`, `appliedFilter` i `filterSelection` wyciągnięty do `DashboardView`; `aggregateCategoryTotals` liczone w nadrzędnym komponencie; panel „Suma wydatków" subskrybuje ten sam stan co wykres donut — ukrycie kategorii natychmiast przelicza total.
- **Statystyki dzienne** — pod paskiem postępu budżetu: „Średnio wydano" (od dnia wypłaty do dziś) i „Średnio do wydania" (pozostały budżet / dni do następnej wypłaty); `date-fns` (`differenceInCalendarDays`, `addMonths`); obsługa `daysUntilPayday <= 0` → „Koniec cyklu" (bez dzielenia przez zero).
- **Komponenty** — `DashboardDailyStats` (ikony `TrendingUp` / `TrendingDown`, `text-xs text-muted-foreground`, separator flex); logika w `dashboard-daily-stats.ts` + testy Vitest.
- **i18n** — klucze `dashboard.daily.avgSpent|avgRemaining|cycleEnd` w en/pl/de/es.

---

**2026-07-13 — Faza 8.1.2 zamknięta: eliminacja podwójnego odświeżania wykresu, logika „Własny zakres", naprawa kalendarza Shadcn.**

**2026-07-13 — Faza 8.2 zamknięta: czat AI jako asystent finansowy z pamięcią (ChatMessage), historia czatu i kontekst oparty o bieżący cykl rozliczeniowy użytkownika.**

### Faza 8.1.2 — Poprawki filtra wykresu i kalendarza

- **Podwójne odświeżanie** — rozdzielono `filterSelection` (UI dropdown) od `appliedFilter` (dane wykresu); przełączanie opcji predefiniowanych nie wywołuje API; skeleton tylko przy zmianie `appliedFilter`.
- **Własny zakres** — wybór „Własny zakres" otwiera popover bezpośrednio (bez pośredniego przycisku); dane i API odświeżają się dopiero po „Zastosuj".
- **Kalendarz** — `collisionPadding={20}`, `align="end"`; `navLayout="around"` ze strzałkami po bokach nagłówka; `endMonth` + `aria-disabled` blokują nawigację do przyszłości.
- **Legenda wykresu** — zawsze widoczna na podstawie pełnych `categoryTotals`; przy 0 widocznych kategoriach donut pokazuje pusty stan, legenda pozostaje klikalna.
- **Ostatni dzień zakresu** — `startOfDay` / `endOfDay` (date-fns) przy budowaniu URL i w `dashboard.service.ts`, aby wydatki z końcowej daty nie były ucinane.

---

**2026-07-13 — Faza 8.1.2 hotfix: legenda, kalendarz bez pośredniego przycisku, strzałki, blokada przyszłości, endOfDay.**

**2026-07-13 — Faza 8.1 zamknięta: layout sidebar, budżet, historia transakcji, koszty stałe, UX dashboardu.**

### Faza 8.1 — Layout, budżet, historia, koszty stałe

- **Layout** — `(app)/layout.tsx`: sidebar `h-screen sticky top-0`, główna zawartość z `overflow-y-auto`; sidebar nie rozciąga się z tabelą dashboardu.
- **Własny zakres dat** — filtr „Własny zakres" na wykresie donut + `DatePickerWithRange` (Shadcn Calendar/Popover); `GET /api/dashboard?from=&to=` przelicza wykres i podsumowanie; przycisk „Zastosuj" — odświeżenie dopiero po zatwierdzeniu; `collisionPadding`, padding nagłówka kalendarza, blokada dat i miesięcy przyszłych.
- **System budżetu** — pola `User.defaultMonthlyBudget` i `User.currentMonthBudget` (migracja `20260713180000_add_user_budget_fields`); ustawienia domyślnego budżetu (pierwsze ustawienie kopiuje też `currentMonthBudget`); `BudgetProgress` z `Progress` + Popover edycji bieżącego miesiąca; cron `reset-quotas` kopiuje `defaultMonthlyBudget` → `currentMonthBudget` w dniu `financialMonthStartDay`.
- **Historia transakcji** — strona `(app)/history/page.tsx`, pozycja „Historia" w sidebarze; nawigacja cykli rozliczeniowych (domyślnie poprzedni cykl); tabela z Edytuj/Usuń (`DropdownMenu`); `GET /api/transactions?from=&to=`.
- **Koszty stałe** — sekcja w Ustawieniach (CRUD przez istniejące API `RecurringExpense`); dynamiczne podsumowanie sumy miesięcznej; na wykresie donut jedna kategoria „Koszty stałe" / `FIXED_COSTS_CATEGORY`.
- **Suma wydatków** — panel łączy wydatki transakcyjne i koszty stałe; `billingPeriodTotalSpent` w `BudgetProgress` też uwzględnia koszty stałe.
- **Interaktywny wykres donut** — klikalna legenda kategorii (show/hide); wykres i procenty przeliczają się dynamicznie.
- **i18n** — klucze `history.*`, `settings.recurring.*`, `settings.labels.defaultMonthlyBudget*`, `dashboard.chartFilter.customRange*|apply|toggleHint|allHidden`, `dashboard.budget.editCurrent*`, `dashboard.categories.fixedCosts`, `dashboard.summary.totalSpent` w en/pl/de/es.
- **Shadcn UI** — `Popover`, `Calendar`, `DatePickerWithRange`.

---

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

0. **Przed zakończeniem sesji:** obowiązkowo `npx prettier --write .` → `npm run format` (szczegóły w sekcji **Żelazne zasady agentów** powyżej). Przy akcjach async — loadery/szkielety zgodnie z zasadą **Loadery i stany ładowania**.
1. Produkcja live — zmiany przez `dev` → PR → merge `main`.
2. **Migracja DB (Faza 10):** `20260716200000_phase10_premium_retention_dunning` — `PREMIUM`, `lastActiveAt`, dunning email flags, `imageExpiresAt`.
3. **Vercel env:** `STRIPE_PRO_PRICE_*`, `STRIPE_PREMIUM_PRICE_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SENTRY_DSN` (opcjonalnie).
4. **cron-job.org:** godzinowy `GET /api/cron/downgrade-past-due` + `Authorization: Bearer CRON_SECRET` (reminder + downgrade).
5. **PostHog:** flaga `pro-promo-pricing` — nadal steruje badge promo na cenniku.

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

**2026-07-16 — Faza 10: Premium, retencja kont, dunning Resend, rolling photo retention**

- Trójpoziomowy cennik FREE/PRO/PREMIUM + Stripe Price IDs + checkout `plan`.
- Limity PRO 50/50, Premium 120/250; retencja zdjęć 60 dni / 12 mies.; FREE bez storage.
- `lastActiveAt` + cron usuwania kont po 2 latach; notice w Settings (i18n).
- Karencja 24h: `invoice.payment_failed` + 2 maile Resend; cron godzinowy reminder/downgrade.
- Migracja `20260716200000_phase10_premium_retention_dunning`.

**2026-07-16 — Faza 9.7: limity wydatków na kategorie + UX ładowania**

- `UserCategoryLimit` + API `/api/category-limits`; ustawienia (CRUD limitów), paski postępu na dashboardzie (zieleń→czerwień), kontekst AI Insights i czatu.
- Sortowanie dropdownów kategorii A–Z, „Inne/Other" na końcu (`sortCategoriesForSelect`).
- Loadery/szkielety przy odświeżaniu dashboardu i nawigacji w sidebarze; i18n `dashboard.refreshing`.
- i18n `settings.categoryLimits.*` / `dashboard.categoryLimits.*`; migracja `20260716120000_add_user_category_limits`.

**2026-07-14 — Faza 9.2: dynamiczne kategorie, ustawienia, scroll pulpitu, grupowanie historii**

- `CategoriesProvider` — współdzielony stan kategorii; natychmiastowa synchronizacja dropdownów po utworzeniu kategorii w skanerze.
- `CategoriesSection` — systemowe kategorie jako tagi; edycja/usuwanie tylko własnych kategorii.
- `RecentTransactionsList` — natywny scroll (`overflow-y-auto`, `.recent-transactions-scroll`) na pulpicie; płynne rozwijanie grup splitów w Historii.
- `GET /api/dashboard` — `receiptGroupId` w `recentTransactions`.
- i18n `settings.categories.system*` / `custom*` (en/pl/de/es).

**2026-07-14 — Faza 9.1: interaktywny split pozycji, klasyfikacja AI, grupowanie w Historii**

- Wzmocniony prompt vision: alkohol, toniki, Pfand; `lineItems` z kwotami per pozycja.
- `ReceiptScanner`: przenoszenie pozycji między kategoriami z auto-sync kwot; tworzenie kategorii inline.
- Historia: collapsible grupy `receiptGroupId`; batch DELETE/PATCH grupy.
- Testy: `receipt-split-state`, `transaction-groups`, rozszerzone scanner tests.

**2026-07-14 — Faza 9.0: split paragonów (podział kwotowy + AI grouping)**

- `receiptGroupId` na transakcjach; batch API `POST /api/transactions/batch`.
- Skaner: opt-in „Rozbij wydatek", auto-split gdy AI zwróci `suggestedSplits` (≥2 grupy).
- Prompt vision: grupowanie pozycji paragonu według kategorii użytkownika (Groceries, Household, Cosmetics, …).
- i18n `scanner.split.*` w 4 językach; testy walidacji batch w `schemas.test.ts`.
- Migracja: `20260714120000_add_transaction_receipt_group_id`.

**2026-07-14 — Hotfix: czat AI — koszty stałe domyślnie, odejmowanie zakupów hipotetycznych, UI „Myślę…".**

- Wzmocniono prompt: sekcja CRITICAL DEFAULTS, zakaz liczenia z `transactionsSpentPrimary` bez kosztów stałych, przykład odejmowania zakupu (160 EUR).
- UI czatu: dymek „Myślę…" znika przed renderem odpowiedzi (eliminacja przeskoku layoutu).

**2026-07-14 — Faza 8.8: pełny kontekst panelu „Suma wydatków" w czacie AI**

- Czat AI dostaje `DashboardBudgetSummary` zgodny z dashboardem: transakcje + koszty stałe, pozostały budżet, średnio wydano/dzień, średnio do wydania/dzień.
- Prognozy dzienne (`daysUntilPayday`) i scenariusze „co jeśli kupię X" liczone jak na dashboardzie.
- `getBillingPeriodDayMetrics()` w shared; test scenariusza butów za 160 €.

**2026-07-14 — Faza 8.7: precyzyjna zmienna `daysRemainingInCycle` w kontekście czatu AI**

- Serwer oblicza dni do końca cyklu (`getDaysRemainingInCycle`) i przekazuje je do promptu systemowego czatu.
- AI ma zakaz używania stałych 30/31 dni; przy `daysRemainingInCycle = 0` traktuje dzień jako ostatni w cyklu (bez dzielenia przez zero).
- Testy: 14.07, cykl od 12-tego → 28 dni do 11.08; ostatni dzień cyklu → 0.

**2026-07-14 — Faza 8.6: dynamiczny budżet miesięczny w kontekście czatu AI**

- Czat AI używa aktywnego budżetu bieżącego cyklu: `currentMonthBudget` (override z dashboardu) z fallbackiem do `defaultMonthlyBudget`.
- Prompt systemowy komunikuje wiążącą kwotę i priorytet nadpisania z panelu dashboardu.
- Testy jednostkowe scenariusza override vs domyślny budżet.

**2026-07-14 — Faza 8.5: UX czatu AI (awatary, kolejność wiadomości, ikona wysyłania)**

- Awatary nadawców: `User` (użytkownik) i `Bot` (asystent) w okrągłych badge'ach warm/cool.
- Naprawiono kolejność wiadomości: sortowanie chronologiczne w UI, stabilny tiebreaker, osobny zapis user/assistant w DB.
- Ikona `Send` w przycisku wysyłania; rollback optymistycznej wiadomości przy błędzie API.

**2026-07-14 — Hotfix: czat AI 429 mimo dostępnej quota FREE**

- Naprawiono konflikt między limitem Redis (5 req/min, fail-closed) a quota planu w DB (10/mies.).
- FREE: tylko limit miesięczny w DB; PRO: Redis 30 req/min jako anti-spam.
- Chat fail-open gdy brak Upstash; scan nadal fail-closed.

**2026-07-14 — Faza 8.4: kategorie, własne kategorie, sync średnich dziennych, CTA, sidebar**

- Średnie dzienne zsynchronizowane z Sumą wydatków (ten sam filtr kategorii i zakres dat wykresu).
- Nowe kategorie wbudowane + własne kategorie użytkownika (CRUD, safe delete z migracją transakcji).
- CTA: „Dodaj wydatek", „Skanuj 0/3" (FREE), bez licznika na PRO; sidebar z dwuwierszową nazwą aplikacji.
- Migracja `20260713220000_user_categories_and_category_refresh`.

**2026-07-13 — Faza 8.3: sync filtrów kategorii dashboardu, statystyki dzienne budżetu**

- Wspólny stan filtrów kategorii w `DashboardView` — Suma wydatków i wykres donut reagują synchronicznie na ukrywanie kategorii.
- Statystyki dzienne pod paskiem budżetu: średnie wydatki/dzień i średnia do wydania/dzień; obsługa końca cyklu bez dzielenia przez zero.
- Nowe komponenty: `DashboardDailyStats`, `dashboard-daily-stats.ts`; i18n `dashboard.daily.*` w 4 językach.

**2026-07-13 — Faza 8.1: layout sidebar, budżet, historia, koszty stałe, UX dashboardu**

- Naprawiono layout: sidebar stała wysokość ekranu, niezależny scroll treści.
- Własny zakres dat na wykresie donut + API `from`/`to`; przycisk Zastosuj, poprawki stylu kalendarza, blokada dat przyszłych.
- Budżet: `defaultMonthlyBudget` / `currentMonthBudget`, edycja w ustawieniach i Popover na dashboardzie, reset w cronie.
- Strona Historia z nawigacją cykli rozliczeniowych i CRUD transakcji.
- Koszty stałe w ustawieniach (CRUD + suma miesięczna) i jako osobna kategoria na wykresie.
- Panel „Suma wydatków" łączy transakcje i koszty stałe; interaktywna legenda wykresu donut.
- Migracja `20260713180000_add_user_budget_fields`.
- i18n w 4 językach; komponenty Popover, Calendar, DatePickerWithRange.

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
