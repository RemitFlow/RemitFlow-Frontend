import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readCSS(filename) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src', filename),
    'utf8',
  )
}

describe('print styles', () => {
  describe('print.css (global)', () => {
    const css = readCSS('print.css')

    it('defines @media print rules', () => {
      expect(css).toMatch(/@media\s+print/)
    })

    it('hides chrome (navbar, footer, skip-link, scroll-to-top) in a group selector', () => {
      expect(css).toMatch(/\.navbar,\s*\.footer,\s*\.skip-link,\s*\.scroll-to-top\s*\{[^}]*display:\s*none/)
    })

    it('hides all .btn elements', () => {
      expect(css).toMatch(/\.btn\s*\{[^}]*display:\s*none/)
    })

    it('resets body background to white', () => {
      expect(css).toMatch(/body\s*\{[^}]*background:\s*#[fF]+/)
    })

    it('resets body text color to black', () => {
      expect(css).toMatch(/body\s*\{[^}]*color:\s*#[0]+/)
    })

    it('sets @page margin', () => {
      expect(css).toMatch(/@page\s*\{[^}]*margin:\s*1\.5cm/)
    })

    it('defines print-color-adjust for status badges', () => {
      expect(css).toMatch(/print-color-adjust:\s*exact/)
    })

    it('overrides status badge colors for print', () => {
      expect(css).toMatch(/\.status-pending\s*\{[^}]*background:\s*#fef3cd/)
      expect(css).toMatch(/\.status-completed\s*\{[^}]*background:\s*#d4edda/)
      expect(css).toMatch(/\.status-failed\s*\{[^}]*background:\s*#f8d7da/)
    })
  })

  describe('Transfers.css (page-specific)', () => {
    const css = readCSS(path.join('pages', 'Transfers.css'))

    it('includes @media print rules', () => {
      expect(css).toMatch(/@media\s+print/)
    })

    it('hides filters on print', () => {
      const match = css.match(/@media\s+print\s*\{([^}]*)\}/s)
      expect(match).not.toBeNull()
      expect(css).toMatch(/\.transfers-filters\s*\{[^}]*display:\s*none/)
    })
  })

  describe('Chart.css (component-specific)', () => {
    const css = readCSS(path.join('components', 'Chart.css'))

    it('includes @media print rules', () => {
      expect(css).toMatch(/@media\s+print/)
    })

    it('hides chart tooltip on print', () => {
      expect(css).toMatch(/\.chart-tooltip\s*\{[^}]*display:\s*none/)
    })

    it('hides download button on print', () => {
      expect(css).toMatch(/\.download-button\s*\{[^}]*display:\s*none/)
    })
  })

  describe('App.jsx imports print.css', () => {
    const app = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'App.jsx'),
      'utf8',
    )

    it('imports print.css', () => {
      expect(app).toMatch(/import\s+['"].\/print\.css['"]/)
    })
  })
})
