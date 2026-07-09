# 🚀 PANCERNA PLAYLISTA PRZEDSTARTOWA PROJEKTU (CHECKLISTA)

_Stosuj ten szablon na etapie planowania każdego zaawansowanego projektu Full-Stack (Web + Mobile)._

---

## 📐 1. ARCHITEKTURA & MONOREPO

- [ ] **Struktura Monorepo (Turborepo):** Jeśli planujesz wersję mobilną (Expo) obok webowej (Next.js), zawsze startuj z Monorepo. Podział:
  - `/apps/web` (Frontend/Backend Next.js)
  - `/apps/mobile` (Aplikacja Expo)
  - `/packages/shared` (Wspólny kod)
- [ ] **Wspólna Walidacja (Zod):** Umieść wszystkie schematy walidacji formularzy w `/packages/shared/schemas`. Zarówno web, mobile, jak i backend muszą importować te same reguły, aby uniknąć duplikacji kodu.
- [ ] **Path Aliases (Aliasy Ścieżek):** Skonfiguruj `tsconfig.json` tak, aby unikać relatywnych importów (np. `../../../../`). Wprowadź czyste aliasy: `@shared/*`, `@web/*` oraz `@mobile/*`.
- [ ] **Rozdzielenie Zmiennych Środowiskowych (.env):** Zaplanuj, które klucze są publiczne (Expo/Next Frontend), a które ściśle tajne (Next Backend). Użyj bibliotek typu `t3-env` do walidacji obecności zmiennych na etapie budowania.
- [ ] **Architektura Modułowa (Feature-Driven):** Podział kodu domenowo w folderach `features/` (np. `features/auth`, `features/billing`, `features/ai`). Każdy moduł posiada własne routingu, serwisy, walidację, typy i komponenty. Zapobiega to powstawaniu śmietników typu `utils/` i oszczędza context window agentów AI w Cursorze.
- [ ] **Strategia i18n od Dnia 1:** Skonfiguruj scentralizowane tłumaczenia (angielski, niemiecki, polski, hiszpański) w `packages/shared`. Blokuje to agentom AI możliwość hardkodowania tekstów w komponentach i przygotowuje produkt na rynki zagraniczne.

## 🗄️ 2. BAZA DANYCH & MIGRACJE (CI/CD)

- [ ] **Infrastruktura jako Kod (IaC):** Zakaz ręcznego klikania zmian w bazie danych (np. przez panel Supabase). Każda zmiana struktury musi pochodzić z kodu ORM (Prisma/Drizzle).
- [ ] **Migracje Plikowe (.sql):** Generuj pliki migracyjne lokalnie i dodawaj je do systemu kontroli wersji Git.
- [ ] **Automatyzacja w Pipeline (Vercel):** Konfiguruj Build Command tak, by brama migracyjna stała przed kompilacją kodu: `npx [orm] migrate deploy && next build`.
- [ ] **Indeksowanie i Wydajność:** Od dnia 1 projektuj indeksy w bazie danych dla kolumn najczęściej przeszukiwanych i filtrujących (np. `user_id`, `date`, `status`).
- [ ] **Agregacja Danych (Cache):** Dla modułów analitycznych (wykresy/statystyki) zaplanuj tabelę podręczną (cache) aktualizowaną asynchronicznie (np. Cron Job raz na dobę), zamiast przeliczać tysiące rekordów w czasie rzeczywistym.

## 💻 3. ŚRODOWISKO IDE & CODE STYLE (DLA AGENTÓW AI)

- [ ] **Plik Konfiguracyjny `.cursorrules`:** Stwórz w głównym katalogu plik instrukcji dla agentów AI. Wymuś w nim pisanie kodu w TypeScript (strict mode), przestrzeganie struktury Monorepo oraz automatyczne formatowanie kodu przy zapisie.
- [ ] **Automatyczne Formatowanie (Prettier + `.vscode/settings.json`):** Wdróż wymuszenie 2 spacji wcięć, średników oraz maksymalnej długości linii do 100 znaków (`printWidth: 100`), aby zapobiec rozjeżdżaniu się kodu przy wklejaniu z różnych modeli LLM.
- [ ] **Wtyczka do Sortowania Tailwind CSS:** Zainstaluj `prettier-plugin-tailwindcss`, aby klasy CSS były automatycznie układane według oficjalnego schematu przy każdym zapisie pliku.

## 🔐 4. BEZPIECZEŃSTWO, PROXY & MONITORING

- [ ] **Rate Limiting via API Proxy:** Omiń globalne Next.js Middleware dla operacji obciążających serwer. Wdroż Rate Limiting (np. Upstash Redis) bezpośrednio na dedykowanych Route Handlerach (API) lub zewnętrznym Proxy (np. Cloudflare Workers), chroniąc aplikację przed botami i DDOS.
- [ ] **Zasada Odporności Walutowej (Fallback):** Przy integracji z zewnętrznymi API (kursy walut, pogoda), zawsze projektuj mechanizm awaryjny – w razie błędu API, system musi pobrać ostatnie znane poprawne dane z Twojej bazy.
- [ ] **Produkcyjny Monitoring Błędów (Sentry/Axiom):** Podepnij system śledzenia błędów od dnia 1. Pozwoli to wyłapać ciche błędy asynchronicznych webhooków (Stripe) oraz niespodziewane awarie API (OpenAI/Anthropic) na produkcji.
- [ ] **Zarządzanie sesją (OAuth):** Ustal dostawców tożsamości na starcie. Zweryfikuj wymagania sprzętowe i finansowe (np. konta deweloperskie Google) przed rozpoczęciem pisania modułu autoryzacji.
- [ ] **Feature Flags (Flagi Funkcji):** Zarządzanie dostępnością modułów (np. `ENABLE_AI=true`) przez `.env` lub PostHog. Umożliwia wdrażanie niedokończonego kodu, ukrywanie funkcji między wersją Web/Mobile oraz natychmiastowe wyłączanie awaryjne modułów bez deployu.
- [ ] **Analityka Produktowa (Event Tracking):** Śledzenie zachowań wewnątrz aplikacji (np. `AI Analysis Started`, `Payment Failed`) z wykorzystaniem PostHog i silnego typowania w TypeScript. Kluczowe do analizy konwersji i optymalizacji ścieżek użytkownika (nie mylić z Google Analytics).

## 💰 5. OPTYMALIZACJA KOSZTÓW INFRASTRUKTURY

- [ ] **Zrównoważone Przetwarzanie Mediów (In-Memory Buffers):** Unikaj permanentnego przechowywania plików (np. zdjęć paragonów, dokumentów), jeśli aplikacja potrzebuje tylko wyciągnąć z nich tekst (OCR). Przetwórz plik w pamięci podręcznej i natychmiast o nim zapomnij, oszczędzając na storage S3.
- [ ] **Limity Użycia API dla Użytkowników (Quota Limits):** Zaplanuj w bazie danych liczniki operacji (np. `monthly_ai_scans_count`), aby nawet użytkownicy Premium mieli sztywny górny limit (ochrona przed nadużyciami i gigantycznymi fakturami z OpenAI/Anthropic).

## 🎨 6. SPÓJNOŚĆ UX/UI & ASYNCHRONICZNOŚĆ

- [ ] **Blokowanie Stanu (Form Submissions):** Każdy formularz po kliknięciu "Wyślij" musi natychmiast blokować inputy i przycisk (stan `loading`/`disabled`), zapobiegając dublowaniu zapytań do bazy.
- [ ] **Globalna Kontrola Stanu Ładowania (Optimistic UI & Loadery):** Zaplanuj szkielety stron (Skeletons) i loadery dla asynchronicznych komponentów. Tam gdzie to możliwe, stosuj Optimistic UI (pokazywanie sukcesu w interfejsie zanim serwer odpowie).
- [ ] **Architektura Asynchronicznych Zdarzeń (Webhooks):** Płatności (Stripe) lub długie procesy w tle projektuj wyłącznie w oparciu o Webhooki i zabezpiecz je przed podwójnym przetworzeniem (Idempotency).

## ⚖️ 7. KWESTIE PRAWNE I PRYWATNOŚĆ

- [ ] **RODO / GDPR - Prawo do Zapomnienia:** Zaplanuj w bazie kaskadowe usuwanie danych użytkownika. Jeden klik "Usuń konto" musi bezpowrotnie wyczyścić wszystkie powiązane rekordy ze wszystkich tabel.
- [ ] **Prawne Disclaimery dla Systemów AI:** Jeśli aplikacja używa AI do generowania rekomendacji, wniosków czy analiz, w widocznym miejscu (stopka, ekran powitalny) musi znajdować się zapis wyłączający odpowiedzialność prawną z tytułu porad udzielanych przez LLM.
