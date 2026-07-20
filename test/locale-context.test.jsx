import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleProvider, useLocale } from '../src/context/I18nContext.jsx'

function TestConsumer() {
  const { locale, changeLocale } = useLocale()
  return (
    <>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => changeLocale('fr-FR')}>Switch to French</button>
    </>
  )
}

function TestError() {
  useLocale()
  return null
}

describe('LocaleProvider', () => {
  it('provides the default locale', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US')
  })

  it('sets the lang attribute on <html>', () => {
    const { unmount } = render(
      <LocaleProvider>
        <span />
      </LocaleProvider>
    )
    expect(document.documentElement.getAttribute('lang')).toBe('en-US')
    unmount()
  })

  it('throws when useLocale is used outside LocaleProvider', () => {
    expect(() => render(<TestError />)).toThrow(
      'useLocale must be used within a LocaleProvider'
    )
  })
})
