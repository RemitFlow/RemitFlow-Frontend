import { Link } from 'react-router-dom'
import TransferRow from '../components/TransferRow.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import { useTransfers } from '../hooks/useTransfers.js'
import { useApp } from '../context/AppContext.jsx'
import './Transfers.css'

/**
 * Transfers page: lists all transfers with their status.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers()
  const { locale } = useApp()

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Link to="/send">
          <Button>New Transfer</Button>
        </Link>
      </div>

      {loading && (
        <div className="transfers-list">
          <Skeleton count={3} height="4.5rem" />
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && transfers.length === 0 && (
        <EmptyState
          icon="💸"
          title="No transfers yet"
          message="Once you send money, your transfers will show up here."
          action={
            <Link to="/send">
              <Button>Send your first transfer</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && transfers.length > 0 && (
        <div className="transfers-list">
          {transfers.map((t) => (
            <TransferRow key={t.id} transfer={t} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
