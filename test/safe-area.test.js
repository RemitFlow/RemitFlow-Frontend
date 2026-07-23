import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readCSS(filename) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src', filename),
    'utf8',
  );
}

describe('safe-area insets', () => {
  describe('index.css', () => {
    const css = readCSS('index.css');

    it('defines --safe-area-inset-top with env() fallback', () => {
      expect(css).toContain('--safe-area-inset-top: env(safe-area-inset-top, 0px)');
    });

    it('defines --safe-area-inset-bottom with env() fallback', () => {
      expect(css).toContain('--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px)');
    });

    it('defines --safe-area-inset-left with env() fallback', () => {
      expect(css).toContain('--safe-area-inset-left: env(safe-area-inset-left, 0px)');
    });

    it('defines --safe-area-inset-right with env() fallback', () => {
      expect(css).toContain('--safe-area-inset-right: env(safe-area-inset-right, 0px)');
    });
  });

  describe('component CSS files use safe-area variables', () => {
    it('Navbar.css uses --safe-area-inset-top', () => {
      const css = readCSS('components/Navbar.css');
      expect(css).toContain('--safe-area-inset-top');
    });

    it('Footer.css uses --safe-area-inset-bottom', () => {
      const css = readCSS('components/Footer.css');
      expect(css).toContain('--safe-area-inset-bottom');
    });

    it('Sidebar.css uses --safe-area-inset-top', () => {
      const css = readCSS('components/Sidebar.css');
      expect(css).toContain('--safe-area-inset-top');
    });

    it('Modal.css uses all four safe-area variables', () => {
      const css = readCSS('components/Modal.css');
      expect(css).toContain('--safe-area-inset-top');
      expect(css).toContain('--safe-area-inset-bottom');
      expect(css).toContain('--safe-area-inset-left');
      expect(css).toContain('--safe-area-inset-right');
    });
  });
});
