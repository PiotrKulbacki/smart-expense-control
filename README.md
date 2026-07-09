# Smart Expense Control

Mobilno-webowy system do zarządzania finansami osobistymi z automatycznym skanowaniem paragonów przez AI, czatem asystenta finansowego, obsługą wielu walut (PLN, EUR, GBP) oraz subskrypcjami Stripe.

## Stack

| Warstwa  | Technologia                                    |
| -------- | ---------------------------------------------- |
| Monorepo | Turborepo + npm workspaces                     |
| Web      | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Mobile   | Expo 53, Expo Router, React Native             |
| Shared   | Zod schemas, i18n, typy domenowe               |

## Struktura

```
apps/
  web/       # Next.js — frontend + API routes
  mobile/    # Expo — aplikacja mobilna
packages/
  shared/    # Wspólny kod (@smart-expense-control/shared)
    src/
      features/i18n/   # Tłumaczenia (en, de, pl, es)
      schemas/         # Schematy walidacji Zod
```

## Wymagania

- Node.js **22** (zobacz `.nvmrc`)
- npm **10.9+**

```bash
nvm use   # opcjonalnie, jeśli używasz nvm
```

## Szybki start

```bash
# Instalacja zależności
npm install

# Konfiguracja środowiska
cp .env.example .env
# Uzupełnij wartości w .env (patrz komentarze w pliku)

# Uruchomienie dev (web + mobile)
npm run dev
```

- **Web:** http://localhost:3000
- **Mobile:** `cd apps/mobile && npm run dev` (Expo)

## Skrypty

| Skrypt                 | Opis                            |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Uruchamia serwery deweloperskie |
| `npm run build`        | Buduje wszystkie pakiety        |
| `npm run lint`         | ESLint w całym monorepo         |
| `npm run test`         | Testy we wszystkich pakietach   |
| `npm run typecheck`    | Sprawdzenie typów TypeScript    |
| `npm run format`       | Prettier check                  |
| `npm run format:write` | Prettier auto-fix               |

## Path Aliases

| Alias       | Ścieżka                 |
| ----------- | ----------------------- |
| `@shared/*` | `packages/shared/src/*` |
| `@web/*`    | `apps/web/src/*`        |
| `@mobile/*` | `apps/mobile/src/*`     |

## Gałęzie Git

| Gałąź  | Cel                            |
| ------ | ------------------------------ |
| `dev`  | Aktywny development (domyślna) |
| `main` | Produkcja                      |

CI uruchamia się przy push i Pull Request do `dev`.

## Dokumentacja

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — decyzje architektoniczne i stack
- [`PROGRESS.md`](./PROGRESS.md) — status faz projektu
- [`PROJECT_START_CHECKLIST.md`](./PROJECT_START_CHECKLIST.md) — checklista przedstartowa
- [`.cursorrules`](./.cursorrules) — reguły dla agentów AI
