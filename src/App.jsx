import { useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ConnectionBanner from './components/ConnectionBanner.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import RouteAnnouncer from './components/RouteAnnouncer.jsx'
import Home from './pages/Home.jsx'
import SendMoney from './pages/SendMoney.jsx'
import Transfers from './pages/Transfers.jsx'
import NotFound from './pages/NotFound.jsx'
import './App.css'

function MainContent({ children }) {
  const mainRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    mainRef.current?.focus()
  }, [pathname])

  return (
    <main
      ref={mainRef}
      id="main-content"
      className="app-main"
      tabIndex={-1}
    >
      {children}
    </main>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <RouteAnnouncer />
        <div className="app">
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <ConnectionBanner />
          <Navbar />
          <MainContent>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/send" element={<SendMoney />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </MainContent>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
