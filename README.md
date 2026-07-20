# RemitFlow Frontend

RemitFlow is a cross-border remittance app powered by the Stellar network.
This repository contains the React + Vite frontend.

## Getting Started

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173 by default.

## Features

- **Home** — landing page describing the product.
- **Send Money** — enter a recipient and amount, pick currencies, and see a
  live FX quote with the RemitFlow fee broken out before sending.
- **Transfers** — list of your transfers with status badges (pending,
  completed, failed), plus loading, error and empty states.
- **Mock wallet** — connect a demo Stellar wallet (no network calls).
- **Locale preference** — pick a language/region from the navbar (e.g.
  `en-US`, `fr-FR`, `hi-IN`) to control number grouping, decimal separators
  and symbol placement for every formatted amount and date in the app. The
  choice is saved to `localStorage` and restored on your next visit.

## Tech Stack

- React 18 + Vite
- React Router for navigation
- Plain CSS with theme tokens (no UI framework)
- A mock Stellar SDK / wallet and a mock backend API (no network)

## Project Structure

```
src/
  components/   reusable UI (Navbar, Footer, QuoteCard, TransferRow, ...)
  pages/        route screens (Home, SendMoney, Transfers, NotFound)
  services/     mock api, wallet, fx and quote logic
  hooks/        useWallet, useTransfers
  context/      AppContext (wallet state and locale preference)
  utils/        format and validation helpers
  constants/    currencies, locales and fee config
```

## Environment

Copy `.env.example` to `.env` to override the (unused in mock mode) API base URL:

```bash
cp .env.example .env
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm test` — run the automated Vitest suite
- `npm run test:watch` — watch mode for local test development
- `npm run lighthouse` — run Lighthouse CI against the local preview server

## Testing

Integration tests cover the send-money form flow (validation errors and
successful transfer submission) and the locale preference (switching the
navbar locale reformats currency amounts and the choice persists across
reloads). Unit tests under `test/unit` cover the locale-aware formatting
helpers (`formatAmount`, `formatDate`, `formatNumber`), the `LocaleSelect`
component, and the `AppContext` locale persistence/fallback behavior.

## Lighthouse CI

Lighthouse checks are configured in [lighthouserc.json](lighthouserc.json) and run in GitHub Actions on pull requests to the main branch. To validate locally, build the app and run:

```bash
npm run build
npm run lighthouse
```

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
