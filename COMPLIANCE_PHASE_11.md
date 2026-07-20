# Faza 11.0 — Analiza prawna i struktury dokumentów compliance

**Status:** analiza i struktury gotowe; **ostateczne teksty Regulaminu / Polityki Prywatności nie są jeszcze napisane** (Faza 11.1 — po uzupełnieniu kwestionariusza).

**Uwaga:** dokument jest mapą wymogów i checklistą pod konsultację z prawnikiem IT/konsumenckim (DE + PL/UE). **Nie stanowi porady prawnej.**

**Stan kodu (punkt wyjścia):**

| Element                                         | Stan                                    |
| ----------------------------------------------- | --------------------------------------- |
| `/terms`, `/privacy`                            | Placeholdery (jeden akapit i18n)        |
| Cookie Consent (Faza 9.9)                       | `apps/web/src/features/cookie-consent/` |
| Impressum                                       | Brak                                    |
| Checkbox ToS / utrata odstąpienia przy checkout | Brak                                    |
| AI disclaimer                                   | Tylko w czacie AI                       |

---

## 1. Analiza wymogów prawnych (SaaS + AI + subskrypcje)

### 1.A Regulamin świadczenia usług (UŚUDE / DE AGB + DDG)

| Źródło                              | Co jest obligatoryjne / krytyczne                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PL — UŚUDE art. 8**               | Rodzaje i zakres usług; wymagania techniczne; zakaz treści bezprawnych; warunki zawierania i rozwiązywania umów                                                     |
| **PL — prawa konsumenta**           | Umowa na odległość: info przed umową, reklamacje, prawo odstąpienia / warunki utraty; ceny, odnawianie, wypowiedzenie                                               |
| **DE — § 5 DDG (Impressum)**        | Dla JDG (Einzelunternehmen) w DE: imię i nazwisko, adres doręczeń (nie samo PO box), e-mail **i** telefon; ewentualnie USt-IdNr.; link „Impressum” max 2 kliknięcia |
| **DE — § 312k BGB**                 | **Kündigungsbutton** — łatwe wypowiedzenie subskrypcji (porównywalne z zakupem); Stripe Customer Portal pomaga, ale AGB + UI muszą to jasno opisać                  |
| **DE — § 356a BGB (od 19.06.2026)** | **Widerrufsbutton** („Vertrag widerrufen”) — elektroniczna funkcja odstąpienia w okresie prawa odstąpienia; potwierdzenie na trwałym nośniku                        |

#### Elementy absolutnie wymagane w Regulaminie SaaS (Lyamo)

1. **Identyfikacja usługodawcy** — dane jak Impressum + forma: Einzelunternehmen / DE.
2. **Definicje** — Konto, Usługa, Plan FREE/PRO/PREMIUM, Treść/usługa cyfrowa, AI, Konsument.
3. **Zakres usługi** — skaner OCR, kategorie, budżet, czat AI, archiwum zdjęć wg planu, limity (`plan-limits.ts`).
4. **Wymagania techniczne** — przeglądarka, JS, połączenie, konto e-mail/OAuth.
5. **Zawarcie umowy** — rejestracja / OAuth + akceptacja Regulaminu i PP; moment umowy płatnej = skuteczna płatność Stripe.
6. **Plany i ceny** — PLN/EUR/GBP/USD, automatyczne odnawianie, zmiana planu, promocje (PROMO50).
7. **Prawo odstąpienia 14 dni** — procedura; dla natychmiastowego dostępu PRO/Premium: osobna, wyraźna zgoda + informacja o utracie prawa + potwierdzenie e-mail (trwały nośnik).
8. **Wypowiedzenie / anulowanie** — Billing Portal, koniec okresu rozliczeniowego, dunning 24h → FREE.
9. **AI** — brak doradztwa finansowego; wyłączenie odpowiedzialności za halucynacje, błędne OCR, decyzje użytkownika; obowiązek weryfikacji danych.
10. **Reklamacje** — kanał, terminy, procedura.
11. **IP, zakaz nadużyć, limity odpowiedzialności** — z zachowaniem imperatywnych praw konsumenta.
12. **Prawo właściwe / właściwość sądu** — przy B2C konsumenci UE zachowują ochronę swojego kraju zamieszkania.
13. **Zmiany regulaminu**; odesłanie do Polityki Prywatności.

#### Klasyfikacja SaaS a prawo odstąpienia

Lyamo to **usługa cyfrowa** (nie jednorazowa „treść cyfrowa” typu e-book). Pełna utrata 14-dniowego prawa odstąpienia jest bardziej rygorystyczna niż przy treści cyfrowej.

**Bezpieczny model (rekomendacja do potwierdzenia w kwestionariuszu):**

1. Wyraźna zgoda na natychmiastowe rozpoczęcie świadczenia przed upływem 14 dni.
2. Informacja, że konsument przyjmuje do wiadomości skutki dla prawa odstąpienia / rozliczenia proporcjonalnego.
3. Potwierdzenie zgody na trwałym nośniku (e-mail).
4. Opcjonalnie: dobrowolna polityka zwrotów (np. money-back) niezależna od ustawowego Widerruf.

```text
Checkout Stripe PRO/Premium
        │
        ▼
Wyraźna zgoda na natychmiastowy dostęp
+ info o utracie / skutkach odstąpienia?
        │
   ┌────┴────┐
  Tak       Nie
   │         │
   ▼         ▼
Dostęp od razu     Dostęp po 14 dniach
+ e-mail z         LUB pełne prawo
potwierdzeniem     odstąpienia
zgody
```

**Luka w kodzie:** [`stripe-checkout.service.ts`](apps/web/src/features/billing/services/stripe-checkout.service.ts) **nie zbiera** tej zgody — do zamknięcia w Fazie 11.1+.

### 1.B Polityka Prywatności i Cookies (RODO / GDPR + TDDDG § 25)

| Obszar                     | Wymóg                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Art. 13/14 RODO            | Administrator, cele, podstawy prawne, odbiorcy, transfery poza EOG, retencja, prawa, skarga do organu (DE: BfDI / Landesbeauftragter; PL: UODO) |
| TDDDG § 25 (DE) / ePrivacy | Zgoda przed nieistotnymi cookies/SDK; opt-in; odrzucenie równie łatwe; skrypty dopiero po zgodzie                                               |
| AI / OCR                   | Cel i podstawa (umowa); przekazanie obrazów/danych do OpenAI; brak gwarancji dokładności; retencja zdjęć wg planu (0/60/365 dni)                |
| Podmioty przetwarzające    | Lista subprocessors + DPA (Stripe, OpenAI, Supabase, PostHog, Sentry, Resend, Upstash, Vercel, Google OAuth)                                    |
| Prawa osoby                | Dostęp, sprostowanie, usunięcie (Settings DELETE), ograniczenie, sprzeciw, przenoszalność (**brak eksportu w kodzie**), cofnięcie zgody         |
| Cookies                    | Osobna sekcja lub Cookie Policy: nazwa, cel, czas, dostawca, kategoria                                                                          |

#### Aspekty AI (ochrona właściciela + transparentność)

- Disclaimer: informacje AI ≠ porada finansowa / podatkowa / prawna.
- Użytkownik zobowiązany do weryfikacji OCR przed zapisem.
- Wyłączenie odpowiedzialności za skutki decyzji na podstawie AI (w granicach prawa konsumenckiego — nie da się wyłączyć wszystkiego wobec konsumentów).
- Transparentność (AI Act — obowiązki informacyjne przy interakcji z AI): użytkownik wie, że rozmawia z AI.
- Obecnie disclaimer tylko w czacie — brak na skanerze i dashboard AI Insights (wymagane przez `.cursorrules`).

#### Retencja danych (stan produktu — Faza 10)

| Dane                         | Retencja                                          |
| ---------------------------- | ------------------------------------------------- |
| Zdjęcia paragonów FREE       | 0 dni (usuwane po OCR)                            |
| Zdjęcia PRO                  | 60 dni                                            |
| Zdjęcia PREMIUM              | 365 dni                                           |
| Konto nieaktywne             | TTL 2 lata (`lastActiveAt`) → kaskadowe usunięcie |
| Transakcje / czat / insights | Przy usunięciu konta: cascade delete              |
| Cookie consent               | `sec_cookie_consent`, max-age 365 dni             |

---

## 2. Spisy treści dokumentów

### 2.A Regulamin (Terms of Service / AGB)

| Nr  | Sekcja                       | Zawartość (skrót)                                                                   |
| --- | ---------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Postanowienia ogólne         | Nazwa Usługi, język dokumentów, charakter B2C/B2B                                   |
| 2   | Dane Usługodawcy             | Jak Impressum (lub odesłanie do `/impressum`)                                       |
| 3   | Definicje                    | Konto, Usługa, plany, AI, Konsument, Umowa                                          |
| 4   | Rodzaj i zakres Usługi       | FREE / PRO / PREMIUM, limity skanów i czatu, retencja zdjęć                         |
| 5   | Wymagania techniczne         | Przeglądarka, JS, sieć, OAuth                                                       |
| 6   | Rejestracja i Konto          | E-mail/hasło, Google OAuth, odpowiedzialność za logowanie                           |
| 7   | Zawarcie umowy               | Moment akceptacji; umowa o plan płatny                                              |
| 8   | Płatności i subskrypcje      | Stripe, waluty, odnawianie, promocje, rachunki                                      |
| 9   | Prawo odstąpienia (Widerruf) | 14 dni; procedura; utrata przy natychmiastowym dostępie; od 06.2026 Widerrufsbutton |
| 10  | Wypowiedzenie i anulowanie   | Kündigungsbutton / Portal; downgrade FREE; dunning                                  |
| 11  | Funkcje AI                   | OCR, czat, insights; disclaimer; obowiązek weryfikacji                              |
| 12  | Zasady korzystania           | Zakaz treści bezprawnych, abuse, reverse engineering                                |
| 13  | Własność intelektualna       | Kod Usługodawcy; dane użytkownika należą do użytkownika                             |
| 14  | Dostępność i zmiany Usługi   | Brak SLA 100%; okna serwisowe                                                       |
| 15  | Odpowiedzialność             | Limity; wyjątki imperatywne dla konsumentów                                         |
| 16  | Reklamacje                   | Kanał, terminy, procedura                                                           |
| 17  | Dane osobowe                 | Odesłanie do Polityki Prywatności                                                   |
| 18  | Zmiany Regulaminu            | Tryb powiadomienia i wejścia w życie                                                |
| 19  | Prawo właściwe i spory       | DE + ochrona konsumentów UE; ADR/ODR opcjonalnie                                    |
| 20  | Postanowienia końcowe        | Rozdzielność, język wersji                                                          |

### 2.B Polityka Prywatności (+ Cookies)

| Nr  | Sekcja                   | Zawartość (skrót)                                                                               |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | Administrator            | Dane jak Impressum; kontakt RODO                                                                |
| 2   | Zakres stosowania        | Web (i przyszły mobile)                                                                         |
| 3   | Jakie dane               | Konto, transakcje, czat, OCR/metadata, zdjęcia, billing (Stripe), logi, cookies                 |
| 4   | Cele i podstawy prawne   | Umowa (art. 6 ust. 1 lit. b), obowiązek prawny, uzasadniony interes, zgoda (cookies)            |
| 5   | OCR i AI                 | Przesyłanie do OpenAI; brak decyzji zautomatyzowanych o skutkach prawnych; retencja             |
| 6   | Odbiorcy / subprocessors | Lista z rolą, lokalizacją, transferami (SCC)                                                    |
| 7   | Transfery poza EOG       | OpenAI/USA itd. + zabezpieczenia                                                                |
| 8   | Okresy przechowywania    | Konto, transakcje, czat, zdjęcia 0/60/365, logi, billing (okresy podatkowe DE), consent 365 dni |
| 9   | Prawa osoby              | Lista + jak skorzystać; usunięcie konta; (plan: eksport Art. 20)                                |
| 10  | Cookies                  | Kategorie; lista; link do zarządzania; TDDDG § 25                                               |
| 11  | Bezpieczeństwo           | Hasła, HTTPS, prywatny bucket Storage                                                           |
| 12  | Dzieci                   | Brak weryfikacji wieku w UI; usługa kierowana do osób zdolnych do zawarcia umowy                |
| 13  | Zmiany PP                | Tryb aktualizacji                                                                               |
| 14  | Organ nadzorczy          | DE Landesbeauftragter / BfDI; informacja o UODO dla użytkowników PL                             |

### 2.C Dokumenty towarzyszące (osobne strony — Faza 11.1+)

- **Impressum** (`/impressum`) — § 5 DDG.
- **Cookie Policy** (sekcja w PP lub `/cookies`) — lista cookies/SDK.
- **Widerrufsbelehrung** (DE) — wzór pouczenia o prawie odstąpienia.

---

## 3. Kwestionariusz dla właściciela

> Uzupełnij przed Fazą 11.1 (pisanie ostatecznych tekstów). Nie generujemy ostatecznych dokumentów bez tych odpowiedzi.

### A. Dane rejestrowe i kontakt (JDG Niemcy)

| #   | Pytanie                                                                                          | Odpowiedź właściciela                                                                        |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Pełne imię i nazwisko właściciela oraz nazwa handlowa (np. „Lyamo”)                              | Piotr Kulbacki; zostawiamy nazwę „Lyamo” na start                                            |
| 2   | Adres doręczeń (ulica, nr, kod, miasto, kraj) — nie samo skrytka                                 | Bendastr. 11, 12051 Berlin, Niemcy                                                           |
| 3   | Telefon (z kierunkowym) oraz e-mail obsługi (obecnie w stopce: `support@lyamo.eu` — potwierdzić) | Telefon wirtualny (na razie przykładowy) + e-mail techniczny (tymczasowo `support@lyamo.eu`) |
| 4   | Osobny e-mail RODO / reklamacji? (tak/nie + adres)                                               | Nie — ten sam e-mail techniczny                                                              |
| 5   | USt-IdNr. (VAT UE) — czy nadany? Numer?                                                          | Na początek bez VAT                                                                          |
| 6   | Wpis do Handelsregister / Gewerbeanmeldung — numer i urząd (jeśli dotyczy)                       | Na razie nieznane — będzie po Gewerbeanmeldung (zostawić miejsce na numer)                   |
| 7   | Numer podatkowy (Steuernummer) — publikować w Impressum tylko jeśli wymagane lokalnie            | Dowiem się, czy wymagane dla Berlina                                                         |
| 8   | Języki prawnie wiążące: DE+EN+PL+ES, czy DE/EN jako wiodące?                                     | Prawnie wiążące: DE i PL (EN/ES do doprecyzowania)                                           |

### B. Model prawny i jurysdykcja

| #   | Pytanie                                                                      | Odpowiedź              |
| --- | ---------------------------------------------------------------------------- | ---------------------- |
| 9   | Prawo właściwe w AGB: **prawo niemieckie** (rekomendacja przy siedzibie DE)? | Tak (prawo niemieckie) |
| 10  | Wyłącznie B2C, czy też B2B (faktury firmowe)?                                | Wyłącznie B2C          |
| 11  | Odrębny DPA dla klientów B2B (powierzenie danych)?                           | Nie                    |

### C. Odstąpienie, zwroty, subskrypcje

| #   | Pytanie                                                                                                    | Odpowiedź                                                    |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 12  | Przy PRO/Premium: **natychmiastowy dostęp** z checkboxem utraty / ograniczenia 14-dniowego odstąpienia?    | Tak                                                          |
| 13  | Jeśli użytkownik **nie** zaznaczy zgody: wstrzymać dostęp 14 dni, czy zablokować checkout?                 | Nie dopuszczać do płatności                                  |
| 14  | Dobrowolna polityka zwrotów (np. 7 dni money-back)? Tak/nie + warunki                                      | Tak — 7 dni, pod warunkiem że nie korzystał z aplikacji i AI |
| 15  | Anulowanie: koniec okresu, czy natychmiastowy downgrade z proporcjonalnym zwrotem?                         | Koniec bieżącego cyklu (bez automatycznego przedłużenia)     |
| 16  | Anulowanie tylko przez Stripe Customer Portal, czy też e-mail / przycisk w app (§ 312k / Widerrufsbutton)? | Teraz przez Stripe, ale możemy dodać przycisk w app          |

### D. Retencja i dane

| #   | Pytanie                                                                   | Odpowiedź                            |
| --- | ------------------------------------------------------------------------- | ------------------------------------ |
| 17  | Retencja zdjęć FREE 0 / PRO 60 / PREMIUM 365 — OK do PP?                  | Tak                                  |
| 18  | TTL nieaktywnego konta 2 lata — OK? Skrócić/wydłużyć?                     | Tak                                  |
| 19  | Historia czatu AI po usunięciu konta: cascade delete — OK?                | Tak                                  |
| 20  | Dane księgowe/billing po usunięciu konta: ile lat (DE: okresy podatkowe)? | Tak — muszę sprawdzić wymagany okres |
| 21  | Eksport danych (GDPR Art. 20) w najbliższej fazie?                        | Nie                                  |

### E. Podmioty trzecie i AI

| #   | Pytanie                                                                                                                                               | Odpowiedź                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 22  | Lista: Stripe, OpenAI, Supabase (DB+Storage), PostHog, Sentry, Resend, Upstash Redis, Vercel, Google OAuth, Frankfurter, cron-job.org — dodać/usunąć? | Jeśli nie jest wymagane przez prawo — usunąć |
| 23  | Region PostHog / Sentry / OpenAI — lokalizacje; DPA/SCC podpisane?                                                                                    | Jeśli wymagane — dopisać                     |
| 24  | OpenAI Zero Data Retention / enterprise — tak/nie?                                                                                                    | Nie                                          |
| 25  | Marketing cookies (Meta/Google Ads)? Jeśli nie — usunąć kategorię `marketing` z UI                                                                    | Nie                                          |

### F. Operacyjne

| #   | Pytanie                                                        | Odpowiedź                                                                                |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 26  | Termin odpowiedzi na reklamacje (np. 14 dni)?                  | Tak                                                                                      |
| 27  | Minimalny wiek użytkownika (18)?                               | Wiek nie wymaga potwierdzania w UI (usługa kierowana do osób zdolnych do zawarcia umowy) |
| 28  | Osobna **Widerrufsbelehrung** po niemiecku (zalecane przy DE)? | Tak                                                                                      |

---

## 4. Ocena Cookie Consent vs prawo i projekt

**Źródła w kodzie:**

- [`CookieConsentProvider.tsx`](apps/web/src/features/cookie-consent/CookieConsentProvider.tsx)
- [`CookieConsentBanner.tsx`](apps/web/src/features/cookie-consent/components/CookieConsentBanner.tsx)
- [`types.ts`](apps/web/src/features/cookie-consent/types.ts) — kategorie `necessary` / `analytics` / `marketing`
- [`PostHogProvider.tsx`](apps/web/src/features/analytics/components/PostHogProvider.tsx) — gate analytics
- [`instrumentation-client.ts`](apps/web/src/instrumentation-client.ts) — Sentry gated po zgodzie analytics cookie

### 4.A Zgodne / dobre

- Kategorie: `necessary` (zawsze on) / `analytics` / `marketing`.
- Domyślnie opcjonalne = **off** (opt-in).
- Trzy akcje równorzędnie dostępne: Akceptuj wszystkie / Odrzuć opcjonalne / Zarządzaj — zgodne z linią orzeczniczą (odrzucenie nie schowane).
- PostHog client startuje dopiero po `analytics === true`.
- Persystencja decyzji (`sec_cookie_consent`, 365 dni, SameSite=Lax).

### 4.B Luki względem TDDDG / RODO / projektu

| Luka                                           | Ryzyko              | Rekomendacja (Faza 11.1+)                                                              |
| ---------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| Brak ponownego otwarcia preferencji po decyzji | Wysokie             | Zrobione w 11.1 (link „Cookie settings” w PublicFooter i w Settings otwierający modal) |
| Brak linku do PP / Cookie Policy w bannerze    | Wysokie             | Zrobione w 11.1 (link do /privacy w bannerze i modalu)                                 |
| Brak strony Cookie Policy / sekcji w PP        | Wysokie             | Zrobione w 11.1 (sekcja cookies w `/privacy`)                                          |
| **Sentry** ładuje się bez zgody                | Wysokie             | Zrobione w 11.1 (Sentry gated po zgodzie analytics cookie)                             |
| Kategoria `marketing` bez konsumentów w kodzie | Średnie             | Zrobione w 11.1 (marketing usunięty z UI; marketing=false w zgodzie)                   |
| PostHog server-side bez powiązania ze zgodą    | Średnie             | Zrobione w 11.1 (usunięto server-side captureServerEvent dla PostHog)                  |
| Brak checkboxa ToS/PP przy rejestracji         | Wysokie (Regulamin) | Zrobione w 11.1 (checkbox w register + OAuth disabled do akceptacji)                   |
| Mobile bez consent                             | Niskie na dziś      | Przy shipie mobile                                                                     |

### 4.C Werdykt

Fundament Fazy 9.9 jest **kierunkowo zgodny** (opt-in, reject easy, analytics gated), ale **nie jest jeszcze kompletny** względem DE TDDDG + pełnej transparentności RODO — głównie przez:

1. Sentry gated po zgodzie analytics cookie,
2. brak trwałego zarządzania zgodą po pierwszej decyzji,
3. brak powiązanej Cookie Policy / pełnej Polityki Prywatności.

---

## 5. Kolejność Fazy 11.1+ (po uzupełnieniu kwestionariusza)

1. Drafty tekstów (DE wiodący + PL/EN/ES) + przegląd prawnika.
2. Strony: pełne `/terms`, `/privacy`, `/impressum` (+ opcjonalnie `/cookies`).
3. UI: checkboxy rejestracji; checkout — zgoda na natychmiastowe świadczenie; link ustawień cookies; gate Sentry; AI disclaimer na skanerze i insights.
4. Eksport danych (Art. 20) — jeśli właściciel zatwierdzi w pyt. 21.
5. Widerrufsbutton — obowiązkowy najpóźniej od **19.06.2026** (§ 356a BGB).

---

## Źródła (orientacyjne)

- Ustawa o świadczeniu usług drogą elektroniczną (UŚUDE) — art. 8.
- Ustawa o prawach konsumenta (PL) — odstąpienie, treść/usługa cyfrowa.
- § 5 DDG (Impressum), § 25 TDDDG (cookies), § 312k BGB (Kündigung), § 356a BGB (Widerrufsbutton od 19.06.2026).
- RODO / GDPR art. 13–14, 28 (DPA), 20 (przenoszalność).
- Przewodniki branżowe (m.in. Creativa Legal SaaS/RODO, IHK Impressum) — do weryfikacji z aktualnym stanem prawnym przez prawnika.
