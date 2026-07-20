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
- **Connection-lost banner** — a banner appears across the top of the app when
  the browser reports it has lost network connectivity, and clears once it's
  restored.

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
  hooks/        useWallet, useTransfers, useOnlineStatus
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

Integration tests cover the send-money form flow, including validation errors and successful transfer submission that lands on the transfers screen. Component tests cover the connection-lost banner appearing and clearing as the browser's online status changes.

Component tests cover accessibility features such as route change announcements for screen readers.

## Accessibility

RemitFlow aims to be usable by everyone. The following accessibility features are implemented:

- **Skip-to-content link** — keyboard users can bypass the navigation.
- **Visible focus ring** — `:focus-visible` outlines are styled with the primary colour.
- **ARIA live region for route announcements** — when the user navigates between pages, screen readers announce the new page title via a visually hidden `aria-live="polite"` region.
- **Focus management on navigation** — keyboard focus moves to the main content area after each route change.
- **Semantic roles** — components use `role="alert"`, `role="dialog"`, `role="progressbar"`, `role="status"`, and `role="tooltip"` as appropriate.
- **Form field associations** — all inputs are paired with `<label htmlFor={id}>` and use `aria-invalid` / `aria-describedby` for error feedback.

## Lighthouse CI

```bash
npm run build
npm run lighthouse
```

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
