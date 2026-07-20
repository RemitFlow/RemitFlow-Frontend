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
- **Scroll to top** — a floating button appears once you scroll down and
  smoothly returns you to the top of the page (respects `prefers-reduced-motion`).

## Tech Stack

- React 18 + Vite
- React Router for navigation
- Plain CSS with theme tokens (no UI framework)
- A mock Stellar SDK / wallet and a mock backend API (no network)

## Project Structure

```
src/
  components/   reusable UI (Navbar, Footer, QuoteCard, DataTable, TransferRow, ...)
  pages/        route screens (Home, SendMoney, Transfers, NotFound)
  services/     mock api, wallet, fx and quote logic
  hooks/        useWallet, useTransfers, useColumnResize
  context/      AppContext (wallet state)
  utils/        format and validation helpers
  constants/    currencies and fee config
```

### DataTable

The `DataTable` component provides a resizable-column data grid used by the
Transfers page. Each column header includes a drag handle that resizes adjacent
columns. The `useColumnResize` hook manages the resize state and mouse
interactions. Column widths respect configurable minimum widths and can be
reset to their initial sizes.

See [DataTable.stories.jsx](src/components/DataTable.stories.jsx) for usage
examples covering data, loading, error, and empty states.

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

Integration tests cover the send-money form flow, including validation errors and successful transfer submission that lands on the transfers screen.

Component tests cover the scroll-to-top button: it stays hidden and
non-interactive at the top of the page, appears once the scroll threshold is
passed, hides again on scroll back up, and scrolls the window to the top on
click (using `smooth` behaviour, or `auto` when the user prefers reduced motion).

## Lighthouse CI

Lighthouse checks are configured in [lighthouserc.json](lighthouserc.json) and run in GitHub Actions on pull requests to the main branch. To validate locally, build the app and run:

```bash
npm run build
npm run lighthouse
```

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
