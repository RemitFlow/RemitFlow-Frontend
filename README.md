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
- **Tabs** — reusable tabbed interface with swipe gesture support for mobile, accessible keyboard navigation, and controlled/uncontrolled modes.
- **Print support** — a dedicated print stylesheet (`src/print.css`)
  optimises the Transfers dashboard and other pages for printing: hides
  navigation chrome, interactive elements, and applies a light background
  with readable text and preserved chart/status colours.
- **Mock wallet** — connect a demo Stellar wallet (no network calls).
  - Robust error handling for rejected connections
  - Connection timeout protection (30 seconds)
  - Clear error feedback to users
  - Automatic error state clearing on retry or disconnect

## Tech Stack

- React 18 + Vite
- React Router for navigation
- Plain CSS with theme tokens (no UI framework)
- A mock Stellar SDK / wallet and a mock backend API (no network)

## Project Structure

```
src/
  components/   reusable UI (Navbar, Footer, Tabs, QuoteCard, TransferRow, ...)
  components/   reusable UI (Navbar, Sidebar, Footer, QuoteCard, TransferRow, ...)
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
- `npm run format` — format all source files with Prettier
- `npm run format:check` — check formatting without modifying files (CI)
- `npm run lighthouse` — run Lighthouse CI against the local preview server

## Responsive Layout

The app adapts to three viewport ranges:

| Range | Target | Layout |
|---|---|---|
| >1024px | Desktop | Full sidebar (240px), 3-column features grid |
| 721–1024px | Tablet landscape | Full sidebar with toggle, 2-column features grid, compact content padding |
| ≤720px | Tablet portrait / mobile | Collapsed sidebar (60px), single-column layouts, wrapped navbar |
| ≤420px | Small mobile | Stacked hero actions, single-column currency grid |

The Sidebar is rendered alongside the main content area on all viewports wider than
720px and collapses automatically at narrower widths.

## Testing

The test suite includes comprehensive coverage of wallet connection handling:

- **Wallet Service Tests** (`test/services/wallet.test.js`)
  - Successful connection flow
  - User rejection handling
  - Storage persistence
  - Disconnection cleanup

- **AppContext Wallet Tests** (`test/unit/AppContext.wallet.test.jsx`)
  - Connection state management
  - Error handling and recovery
  - Timeout protection
  - State restoration from localStorage

- **WalletButton Tests** (`test/components/WalletButton.test.jsx`)
  - UI feedback for connection states
  - Error message display
  - Retry behavior
  - User interaction flows

Integration tests cover send-money validation, successful transfer submission,
pending button behavior, duplicate-submission prevention, Transfers page
filter sync (search, status, and date-range presets such as last 7/30/90 days),
and landscape tablet layout integration.

## Accessibility

All interactive elements (buttons, links, inputs, selects, icon buttons, and
checkboxes) meet a minimum touch target of 44×44 CSS pixels, compliant with
WCAG 2.5.5 (Target Size). A dedicated test suite in `test/touch-targets.test.js`
audits the CSS declarations to ensure compliance isn't regressed.

## Tabs Component

The `Tabs` component supports both controlled and uncontrolled modes:

```jsx
<Tabs
  tabs={[
    { label: 'Send', content: <SendForm /> },
    { label: 'History', content: <TransferHistory /> }
  ]}
  activeIndex={0}          // omit for uncontrolled
  onChange={(i) => {}}     // called on tab switch
/>
```

- **Swipe gestures**: On touch devices, swipe left/right to switch between tabs (50px threshold).
- **Accessibility**: Uses ARIA `tablist`, `tab`, and `tabpanel` roles with proper `aria-selected`, `aria-controls`, and `aria-labelledby` relationships.
- **Keyboard**: Active tab is focusable via `tabIndex`. Tab headers are `<button>` elements.

## Notched / Rounded Devices

The app supports notched and rounded-screen devices (e.g. iPhone X+,
Android flagships) via CSS `env(safe-area-inset-*)`:

- CSS custom properties are defined in `src/index.css` (`--safe-area-inset-top`,
  `--safe-area-inset-bottom`, `--safe-area-inset-left`,
  `--safe-area-inset-right`) with a `0px` fallback.
- The `<meta name="viewport">` tag already includes `viewport-fit=cover`.
- Layout components (`Navbar`, `Footer`, `Sidebar`, `Modal`) consume the
  custom properties to keep content clear of notches, rounded corners and the
  home indicator.
- The `useSafeAreaInsets` hook (in `src/hooks/useSafeAreaInsets.js`) exposes
  the numeric pixel values for any component that needs them in JavaScript.

## Lighthouse CI

Lighthouse checks are configured in [lighthouserc.json](lighthouserc.json) and run in GitHub Actions on pull requests to the main branch. To validate locally, build the app and run:

```bash
npm run build
npm run lighthouse
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development workflow and coding standards
- Pull request process
- Testing requirements
- Issue reporting guidelines

For issue tracking and triage process, see [.github/ISSUE_TRIAGE.md](.github/ISSUE_TRIAGE.md).

## Disclaimer

This is a demo frontend. All FX rates, fees, wallet connections and transfers
are mocked locally and do not touch the real Stellar network.
