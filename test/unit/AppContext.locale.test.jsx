import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProvider, useApp } from '../../src/context/AppContext.jsx'
import { DEFAULT_LOCALE } from '../../src/constants/locales.js'

const LOCALE_STORAGE_KEY = 'remitflow:locale'

function LocaleProbe() {
  const { locale, setLocale } = useApp()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale('fr-FR')}>Use French</button>
      <button onClick={() => setLocale('not-a-real-locale')}>Use bogus locale</button>
    </div>
  )
}

describe('AppContext locale preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to en-US when nothing is stored', () => {
    render(
      <AppProvider>
        <LocaleProbe />
      </AppProvider>
    )

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE)
  })

  it('persists a locale change to localStorage and re-renders consumers', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <LocaleProbe />
      </AppProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Use French' }))

    expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(JSON.stringify('fr-FR'))
  })

  it('restores a previously persisted locale on mount', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify('fr-FR'))

    render(
      <AppProvider>
        <LocaleProbe />
      </AppProvider>
    )

    expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')
  })

  it('ignores an unsupported locale and falls back to the default', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <LocaleProbe />
      </AppProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Use bogus locale' }))

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE)
  })

  it('falls back to the default when localStorage holds an unsupported locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify('xx-XX'))

    render(
      <AppProvider>
        <LocaleProbe />
      </AppProvider>
    )

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE)
  })
})
