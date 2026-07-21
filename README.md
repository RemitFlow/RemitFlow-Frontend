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
  completed, failed), search/status/date-range filters synced to the URL,
  plus loading, error and empty states.
- **Mock wallet** — connect a demo Stellar wallet (no network calls).
- **Keyboard navigation** — skip link, header, page content, and footer follow a
  logical tab order; navigation actions use a single focus stop each.

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
  context/      AppContext (wallet state)
  utils/        format and validation helpers
  constants/    currencies and fee config
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

Integration tests cover send-money validation, successful transfer submission,
pending button behavior, duplicate-submission prevention, Transfers page filter
sync (search, status, and date-range presets), and keyboard tab order across
the main pages.

## Accessibility

All interactive elements (buttons, links, inputs, selects, icon buttons, and
checkboxes) meet a minimum touch target of 44×44 CSS pixels, compliant with
WCAG 2.5.5 (Target Size). A dedicated test suite in `test/touch-targets.test.js`
audits the CSS declarations to ensure compliance isn't regressed.

## Lighthouse CI

Lighthouse checks are configured in [lighthouserc.json](lighthouserc.json) and run in GitHub Actions on pull requests to the main branch. To validate locally, build the app and run:

```bash
npm run build
npm run lighthouse
```

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
