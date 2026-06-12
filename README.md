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

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
