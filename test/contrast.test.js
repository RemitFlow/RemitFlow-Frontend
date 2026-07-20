import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readCSS(filename) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src', filename),
    'utf8',
  );
}

describe('prefers-contrast media queries', () => {
  describe('index.css', () => {
    const css = readCSS('index.css');

    it('defines :root variable overrides for prefers-contrast: more', () => {
      const match = css.match(
        /@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)\s*\{([^}]*:root[^}]*)\}/s,
      );
      expect(match).not.toBeNull();
      const block = match[1];
      expect(block).toContain('--color-bg');
      expect(block).toContain('--color-text');
      expect(block).toContain('--color-primary');
    });

    it('defines :root variable overrides for prefers-contrast: less', () => {
      const match = css.match(
        /@media\s*\(\s*prefers-contrast\s*:\s*less\s*\)\s*\{([^}]*:root[^}]*)\}/s,
      );
      expect(match).not.toBeNull();
      const block = match[1];
      expect(block).toContain('--color-bg');
      expect(block).toContain('--color-text');
      expect(block).toContain('--color-primary');
    });

    it('defines border-color overrides for prefers-contrast: more', () => {
      const match = css.match(
        /@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)\s*\{/,
      );
      expect(match).not.toBeNull();
      const start = css.indexOf(match[0]);
      const block = css.slice(start);
      expect(block).toContain('border-color');
    });
  });

  describe('component CSS files', () => {
    const components = [
      'Button.css',
      'Alert.css',
      'StatusBadge.css',
      'Tag.css',
      'ErrorMessage.css',
      'TextField.css',
      'Modal.css',
      'Skeleton.css',
      'Loader.css',
      'Avatar.css',
      'ProgressBar.css',
      'EmptyState.css',
      'Navbar.css',
      'Footer.css',
      'TransferRow.css',
      'QuoteCard.css',
      'Tooltip.css',
      'CopyButton.css',
      'WalletButton.css',
      'CurrencySelect.css',
      'ErrorBoundary.css',
    ];

    it.each(components)('%s includes a prefers-contrast: more override', (file) => {
      const css = readCSS(path.join('components', file));
      expect(css).toMatch(/@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)/);
    });
  });

  describe('page CSS files', () => {
    const pages = ['Home.css', 'SendMoney.css'];

    it.each(pages)('%s includes a prefers-contrast: more override', (file) => {
      const css = readCSS(path.join('pages', file));
      expect(css).toMatch(/@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)/);
    });
  });
});
