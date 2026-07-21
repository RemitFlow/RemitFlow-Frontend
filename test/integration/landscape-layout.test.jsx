import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

function readCSS(filename) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src', filename),
    'utf8',
  )
}

describe('landscape layout for tablets', () => {
  describe('responsive.css', () => {
    const css = readCSS('responsive.css')

    it('contains a tablet landscape breakpoint (721px–1024px)', () => {
      expect(css).toMatch(
        /@media\s*\(\s*min-width\s*:\s*721px\s*\)\s*and\s*\(\s*max-width\s*:\s*1024px\s*\)/,
      )
    })

    it('adjusts .features to 2 columns within the landscape breakpoint', () => {
      const start = css.indexOf('@media (min-width: 721px)')
      const block = css.slice(start, css.indexOf('@media (max-width: 720px)'))
      expect(block).toContain('grid-template-columns')
      expect(block).toContain('repeat(2, 1fr)')
    })

    it('adjusts .app-main padding within the landscape breakpoint', () => {
      const start = css.indexOf('@media (min-width: 721px)')
      const block = css.slice(start, css.indexOf('@media (max-width: 720px)'))
      expect(block).toContain('.app-main')
      expect(block).toContain('padding')
    })
  })

  describe('sidebar integration in App', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('renders the Sidebar as part of the app layout', () => {
      render(<App />)
      const sidebar = document.querySelector('.sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('renders sidebar navigation links within the app', () => {
      render(<App />)
      const homeLinks = screen.getAllByText('Home')
      expect(homeLinks.length).toBeGreaterThanOrEqual(1)
      const sidebarLinks = document.querySelectorAll('.sidebar-link')
      expect(sidebarLinks.length).toBe(3)
    })

    it('renders the sidebar toggle button', () => {
      render(<App />)
      const toggle = screen.getByLabelText('Collapse sidebar')
      expect(toggle).toBeInTheDocument()
    })

    it('renders the content area alongside the sidebar', () => {
      render(<App />)
      const app = document.querySelector('.app')
      const sidebar = document.querySelector('.sidebar')
      const content = document.querySelector('.app-content')

      expect(app).toBeInTheDocument()
      expect(sidebar).toBeInTheDocument()
      expect(content).toBeInTheDocument()

      expect(app.contains(sidebar)).toBe(true)
      expect(app.contains(content)).toBe(true)
    })

    it('renders Navbar and Footer inside .app-content', () => {
      render(<App />)
      const content = document.querySelector('.app-content')
      const navbar = document.querySelector('.navbar')
      const footer = document.querySelector('.footer')

      expect(content.contains(navbar)).toBe(true)
      expect(content.contains(footer)).toBe(true)
    })
  })
})
