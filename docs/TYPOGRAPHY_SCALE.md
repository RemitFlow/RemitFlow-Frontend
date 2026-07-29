# Typography Scale

This document defines the typography scale used throughout RemitFlow. It is the
source of truth for font sizes, line heights, font weights, and font families.
All contributors adding or editing components should reference this guide to
maintain visual consistency.

## Font Family

RemitFlow uses two typefaces, both provided by the system UI font stack.

### Sans-serif (default)

Defined on the `body` element in `src/index.css`:

```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

This is the default for all text — headings, body copy, labels, buttons, etc.

### Monospace

Used for data that benefits from fixed-width glyphs — wallet addresses,
transfer amounts, and table data where alignment matters.

```css
font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
```

Example usage (`src/components/TransferRow.css`):

```css
.transfer-amount {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
}
```

**Rule of thumb:** Use the monospace stack for amounts, addresses, and tabular
numeric data. Use the default sans-serif stack for everything else.

---

## Type Scale

RemitFlow uses a 0.75rem base with an approximate minor-third (1.2) ratio,
tailored to practical needs within the UI. All sizes are expressed in `rem`
(1rem = 16px at default browser settings).

| Token | rem    | px (approx) | Usage |
| ----- | ------ | ----------- | ----- |
| xs    | 0.75   | 12          | Status badges, tooltips, table column headers, chart legends |
| sm    | 0.875  | 14          | Form labels, sidebar labels, connection banner, copy buttons |
| base  | 0.95   | 15.2        | Body text, button labels, table cell data, quote details |
| lg    | 1.1    | 17.6        | Modal titles, feature card headings, empty-state titles, emphasized subtext |
| xl    | 1.25   | 20          | Section headings, navbar brand, error boundary titles |
| 2xl   | 1.75   | 28          | Page titles (Send Money, Your Transfers), feature icons |
| 3xl   | 2.5    | 40          | Hero title (Home page), empty-state icons |
| 4xl   | 4      | 64          | 404 "Page not found" title |

> **Note:** Some components use intermediate sizes (e.g. 0.7rem, 0.8rem,
> 0.9rem, 1rem, 1.05rem, 1.2rem, 1.5rem, 2rem) where the design called for a
> specific value. These are listed in the table above under the nearest token
> and should be treated as valid within that tier. Prefer the canonical token
> value when adding new components unless visual context demands otherwise.

### Real examples

The following excerpts show the type scale in actual component CSS (not
placeholders).

**Home page** (`src/pages/Home.css`):

```css
.hero-title {
  font-size: 2.5rem;        /* 3xl */
}

.hero-subtitle {
  font-size: 1.1rem;        /* lg */
  line-height: 1.6;
}

.feature-title {
  font-size: 1.1rem;        /* lg */
}

.feature-text {
  line-height: 1.5;
}

.corridors-title {
  font-size: 1.25rem;       /* xl */
}
```

**Modal** (`src/components/Modal.css`):

```css
.modal-title {
  font-size: 1.1rem;        /* lg */
}

.modal-close {
  font-size: 1.5rem;
  line-height: 1;
}
```

**Button** (`src/components/Button.css`):

```css
.btn {
  font-size: 0.95rem;       /* base */
  font-weight: 600;
}
```

**StatusBadge** (`src/components/StatusBadge.css`):

```css
.status-badge {
  font-size: 0.75rem;       /* xs */
  font-weight: 600;
}
```

**QuoteCard** (`src/components/QuoteCard.css`):

```css
.quote-title {
  font-size: 1rem;
}

.quote-amount {
  font-size: 1.1rem;        /* lg */
  font-weight: 700;
}

.quote-fee {
  font-size: 0.8rem;
  line-height: 1.4;
}
```

**DataTable** (`src/components/DataTable.css`):

```css
.data-table th {
  font-size: 0.75rem;       /* xs */
  font-weight: 600;
}

.data-table td {
  font-size: 0.95rem;       /* base */
}
```

---

## Line Height

| Token     | Value | Usage |
| --------- | ----- | ----- |
| tight     | 1     | Icons, badges, avatar initials, modal close button, scroll-to-top button |
| compact   | 1.4   | Quote fee details, alert text |
| default   | 1.5   | Body text, feature descriptions, error boundary messages |
| relaxed   | 1.6   | Hero subtitle on the Home page |

Where no explicit `line-height` is set, the browser default (≈1.2 for
headings, ≈1.4 for body) applies. The project only overrides these values
when the design requires a specific spacing.

---

## Font Weight

| Token    | Value | Usage |
| -------- | ----- | ----- |
| regular  | 400   | Body text (implicit default — not set on most elements) |
| medium   | 500   | Tabs, sidebar links, navbar links, pull-to-refresh labels, theme toggle |
| semibold | 600   | Buttons, status badges, table headers, form labels, error messages, tags, avatar initials |
| bold     | 700   | Headings (`.hero-title`, `.corridors-title`), navbar brand, quote amounts, scroll-to-top |
| extrabold | 800  | 404 "Page not found" heading |

---

## Rationale

The type scale follows these principles:

1. **System font stack** — avoids extra network requests and layout shifts from
   web fonts. It also inherits the user's OS preferences (e.g. San Francisco
   on macOS/iOS, Segoe UI on Windows).

2. **Minor-third ratio** (≈1.2) — provides enough contrast between levels
   without creating jumps that feel jarring. The exact pixel values have been
   tuned for the specific UI contexts in RemitFlow rather than following a
   strict mathematical progression.

3. **Accessibility minimums** — the smallest font size used is 0.7rem (11.2px),
   used only for non-critical labels like avatar initials. All functional text
   (badges, labels, table headers) stays at 0.75rem (12px) or above. All
   interactive elements meet the 44×44px touch target requirement (WCAG 2.5.5)
   regardless of font size.

4. **Consistency over pixel precision** — the scale has natural clustering
   (e.g. 0.9rem–1rem for body, 1.05rem–1.1rem for emphasized text). When
   choosing a size for a new component, pick the nearest token value from the
   table above rather than introducing a new unique size.

---

## Usage Checklist for Contributors

When adding or modifying a component, answer these questions:

- [ ] Does my font size match an existing token in the scale table?
- [ ] If I need a size not in the table, is there a strong reason?
- [ ] Have I paired the font size with the appropriate line height?
- [ ] For numeric data / addresses, did I use the monospace stack?
- [ ] Does the font weight choice match the semantic hierarchy (e.g. semibold
  for interactive labels, bold for headings)?
- [ ] Are touch targets at least 44×44px regardless of font size?
