import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const DEFAULT_LOCALE = 'en-US'

const I18nContext = createContext(null)

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE)

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale)
  }, [locale])

  const changeLocale = useCallback((next) => {
    setLocale(next)
  }, [])

  return (
    <I18nContext.Provider value={{ locale, changeLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return ctx
}
