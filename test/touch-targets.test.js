import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readCSS(filename) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src', filename),
    'utf8',
  );
}

const MIN_TARGET = '44px';

describe('touch target minimum sizes (44px)', () => {
  describe('button elements', () => {
    const css = readCSS(path.join('components', 'Button.css'));

    it('.btn has min-height 44px', () => {
      expect(css).toMatch(/\.btn\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('CopyButton', () => {
    const css = readCSS(path.join('components', 'CopyButton.css'));

    it('.copy-button has min-height 44px', () => {
      expect(css).toMatch(/\.copy-button\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Pagination', () => {
    const css = readCSS(path.join('components', 'Pagination.css'));

    it('.pagination-btn has min-height 44px', () => {
      expect(css).toMatch(/\.pagination-btn\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('ErrorMessage', () => {
    const css = readCSS(path.join('components', 'ErrorMessage.css'));

    it('.error-retry has min-height 44px', () => {
      expect(css).toMatch(/\.error-retry\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('ErrorBoundary', () => {
    const css = readCSS(path.join('components', 'ErrorBoundary.css'));

    it('.error-boundary-button has min-height 44px', () => {
      expect(css).toMatch(/\.error-boundary-button\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('DataTable', () => {
    const css = readCSS(path.join('components', 'DataTable.css'));

    it('.data-table-retry-btn has min-height 44px', () => {
      expect(css).toMatch(/\.data-table-retry-btn\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Modal', () => {
    const css = readCSS(path.join('components', 'Modal.css'));

    it('.modal-close has min-width and min-height 44px', () => {
      expect(css).toMatch(/\.modal-close\s*\{[^}]*min-width:\s*44px/);
      expect(css).toMatch(/\.modal-close\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Sidebar', () => {
    const css = readCSS(path.join('components', 'Sidebar.css'));

    it('.sidebar-toggle has min-height 44px', () => {
      expect(css).toMatch(/\.sidebar-toggle\s*\{[^}]*min-height:\s*44px/);
    });

    it('.sidebar-link has min-height 44px', () => {
      expect(css).toMatch(/\.sidebar-link\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Navbar', () => {
    const css = readCSS(path.join('components', 'Navbar.css'));

    it('.navbar-link has min-height 44px', () => {
      expect(css).toMatch(/\.navbar-link\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Footer', () => {
    const css = readCSS(path.join('components', 'Footer.css'));

    it('.footer-link has min-height 44px', () => {
      expect(css).toMatch(/\.footer-link\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('Skip link (App.css)', () => {
    const css = readCSS('App.css');

    it('.skip-link has min-height 44px', () => {
      expect(css).toMatch(/\.skip-link\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('SendMoney swap button', () => {
    const css = readCSS(path.join('pages', 'SendMoney.css'));

    it('.send-swap has 44px dimensions', () => {
      expect(css).toMatch(/\.send-swap\s*\{[^}]*height:\s*44px/);
      expect(css).toMatch(/\.send-swap\s*\{[^}]*width:\s*44px/);
    });
  });

  describe('SelectionToolbar', () => {
    const css = readCSS(path.join('components', 'SelectionToolbar.css'));

    it('.selection-checkbox has min-height 44px', () => {
      expect(css).toMatch(/\.selection-checkbox\s*\{[^}]*min-height:\s*44px/);
    });

    it('.selection-link has min-height 44px', () => {
      expect(css).toMatch(/\.selection-link\s*\{[^}]*min-height:\s*44px/);
    });
  });

  describe('form inputs', () => {
    describe('TextField', () => {
      const css = readCSS(path.join('components', 'TextField.css'));

      it('.text-field-input has min-height 44px', () => {
        expect(css).toMatch(/\.text-field-input\s*\{[^}]*min-height:\s*44px/);
      });
    });

    describe('CurrencySelect', () => {
      const css = readCSS(path.join('components', 'CurrencySelect.css'));

      it('.currency-select-input has min-height 44px', () => {
        expect(css).toMatch(/\.currency-select-input\s*\{[^}]*min-height:\s*44px/);
      });
    });

    describe('LocaleSelect', () => {
      const css = readCSS(path.join('components', 'LocaleSelect.css'));

      it('.locale-select-input has min-height 44px', () => {
        expect(css).toMatch(/\.locale-select-input\s*\{[^}]*min-height:\s*44px/);
      });
    });
  });

  describe('PullToRefresh', () => {
    const css = readCSS(path.join('components', 'PullToRefresh.css'));

    it('.ptr-manual-trigger:focus-visible has min-height 44px', () => {
      expect(css).toMatch(/\.ptr-manual-trigger:focus-visible\s*\{[^}]*min-height:\s*44px/);
    });
  });
});
