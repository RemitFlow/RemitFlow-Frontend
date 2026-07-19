import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTopButton from './components/ScrollToTopButton.jsx'
import Home from './pages/Home.jsx'
import SendMoney from './pages/SendMoney.jsx'
import Transfers from './pages/Transfers.jsx'
import NotFound from './pages/NotFound.jsx'
import './App.css'

/**
 * Root application component: wires up the context, router and layout.
 */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app">
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Navbar />
          <main id="main-content" className="app-main">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/send" element={<SendMoney />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
          <ScrollToTopButton />
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
