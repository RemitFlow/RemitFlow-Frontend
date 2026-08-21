import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/TextField.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import QuoteCard from '../components/QuoteCard.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import {
  buildQuote,
  isQuoteExpired,
  isQuoteStale,
  QUOTE_TTL_MS,
} from '../services/quote.js';
import { formatCurrencyInput } from '../utils/format.js';
import {
  isPositiveAmount,
  validateRecipient,
  isWithinBalance,
} from '../utils/validate.js';
import { useWallet } from '../hooks/useWallet.js';
import { useTransfers } from '../hooks/useTransfers.js';
import { useApp } from '../context/AppContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { DEFAULT_SOURCE, DEFAULT_DEST } from '../constants/currencies.js';
import './SendMoney.css';

// How many ms before expiry to start showing the "expiring soon" warning.
const EXPIRY_WARN_MS = 10_000;

/**
 * Send Money page: recipient + amount form with a live FX quote.
 *
 * Quote lifecycle:
 * 1. Quote is generated (via useDebouncedValue) whenever amount/from/to change.
 * 2. Quote is cleared immediately when currency or amount fields change, so
 *    the stale rate is never visible after user edits.
 * 3. On submit, the quote is re-validated: if it has expired or is stale it is
 *    regenerated rather than silently used.
 * 4. The quoteId from the final quote is bound into the transfer payload.
 */
export default function SendMoney() {
  const navigate = useNavigate();
  const { wallet, isConnected, connect } = useWallet();
  const { addTransfer } = useTransfers();
  const { locale } = useApp();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(DEFAULT_SOURCE);
  const [to, setTo] = useState(DEFAULT_DEST);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // The live FX quote displayed to the user.
  const [quote, setQuote] = useState(null);

  // Tracks seconds remaining until quote expires; drives the countdown badge.
  const [quoteSecsLeft, setQuoteSecsLeft] = useState(null);

  const submissionLock = useRef(false);
  const countdownRef = useRef(null);

  // Debounce the amount so the quote isn't rebuilt on every keystroke.
  const debouncedAmount = useDebouncedValue(amount, 250);

  // --- Quote generation ---
  // Rebuild the quote whenever the debounced inputs change.
  useEffect(() => {
    if (!isPositiveAmount(debouncedAmount)) {
      setQuote(null);
      setQuoteSecsLeft(null);
      return;
    }
    const next = buildQuote(debouncedAmount, from, to);
    setQuote(next);
    setQuoteSecsLeft(next ? Math.ceil(QUOTE_TTL_MS / 1000) : null);
  }, [debouncedAmount, from, to]);

  // --- Quote invalidation on direct field edits ---
  // Clear the quote as soon as the user begins editing, so the stale quote is
  // never visible at the moment they submit. The debounced effect above will
  // generate a fresh quote once typing settles.
  const handleAmountChange = useCallback((value) => {
    setAmount(value);
    setQuote(null);
    setQuoteSecsLeft(null);
  }, []);

  const handleFromChange = useCallback((value) => {
    setFrom(value);
    setQuote(null);
    setQuoteSecsLeft(null);
  }, []);

  const handleToChange = useCallback((value) => {
    setTo(value);
    setQuote(null);
    setQuoteSecsLeft(null);
  }, []);

  // --- Expiry countdown ticker ---
  useEffect(() => {
    clearInterval(countdownRef.current);
    if (!quote) return;

    countdownRef.current = setInterval(() => {
      const remaining = Math.ceil((quote.expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setQuoteSecsLeft(0);
        clearInterval(countdownRef.current);
      } else {
        setQuoteSecsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [quote]);

  function swapCurrencies() {
    const prevFrom = from;
    const prevTo = to;
    setFrom(prevTo);
    setTo(prevFrom);
    setQuote(null);
    setQuoteSecsLeft(null);
  }

  // Tidy the amount field to two decimals once the user leaves it.
  function handleAmountBlur(value) {
    const formatted = formatCurrencyInput(value);
    if (formatted) setAmount(formatted);
  }

  function validate() {
    const next = {};
    if (!validateRecipient(recipient)) {
      next.recipient = 'Enter a valid email or Stellar address.';
    }
    if (!isPositiveAmount(amount)) {
      next.amount = 'Enter an amount greater than zero.';
    } else if (wallet && !isWithinBalance(amount, wallet.balance)) {
      next.amount = 'Amount exceeds your wallet balance.';
    }
    if (from === to) {
      next.to = 'Source and destination must differ.';
    }
    setErrors(next);
    const isValid = Object.keys(next).length === 0;
    if (!isValid) {
      const firstErrorField = Object.keys(next)[0];
      if (firstErrorField) {
        const targetElement = document.getElementById(firstErrorField);
        if (targetElement && typeof targetElement.focus === 'function') {
          targetElement.focus();
        }
      }
    }
    return isValid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submissionLock.current) return;

    setSubmitError(null);
    if (!validate()) return;

    submissionLock.current = true;
    setSubmitting(true);
    try {
      if (!isConnected) {
        await connect();
      }

      // Resolve a valid, fresh quote at the moment of submission.
      // If the current quote is expired or stale (field values changed),
      // rebuild it from the current form values so the payload is always
      // consistent with what the user sees.
      let finalQuote = quote;
      if (!finalQuote || isQuoteExpired(finalQuote) || isQuoteStale(finalQuote, from, to, amount)) {
        finalQuote = buildQuote(amount, from, to);
      }
      if (!finalQuote) return;

      await addTransfer({
        quoteId: finalQuote.quoteId,
        recipient,
        from,
        to,
        sendAmount: finalQuote.sendAmount,
        receiveAmount: finalQuote.receiveAmount,
      });
      navigate('/transfers');
    } catch (err) {
      setSubmitError('Could not submit the transfer. Please try again.');
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).length;
  const quoteIsExpired = quote !== null && quoteSecsLeft !== null && quoteSecsLeft <= 0;
  const quoteIsExpiringSoon =
    !quoteIsExpired &&
    quote !== null &&
    quoteSecsLeft !== null &&
    quoteSecsLeft * 1000 <= EXPIRY_WARN_MS;

  return (
    <div className="send-money">
      <h1 className="page-title">Send Money</h1>

      <div className="send-grid">
        <form className="send-form" onSubmit={handleSubmit}>
          {errorCount > 0 && (
            <div
              className="sr-only"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {`Form submission failed with ${errorCount} validation ${
                errorCount === 1 ? 'error' : 'errors'
              }. Please check the fields below.`}
            </div>
          )}

          <TextField
            id="recipient"
            label="Recipient (email or Stellar address)"
            value={recipient}
            onChange={setRecipient}
            placeholder="amina@example.com"
            error={errors.recipient}
          />

          <TextField
            id="amount"
            label="Amount"
            type="number"
            value={amount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            placeholder="0.00"
            error={errors.amount}
          />

          <div className="send-currencies">
            <CurrencySelect
              id="from"
              label="From"
              value={from}
              onChange={handleFromChange}
            />
            <button
              type="button"
              className="send-swap"
              onClick={swapCurrencies}
              aria-label="Swap currencies"
              title="Swap currencies"
            >
              ⇄
            </button>
            <CurrencySelect
              id="to"
              label="To"
              value={to}
              onChange={handleToChange}
              error={errors.to}
            />
          </div>

          {submitError && <ErrorMessage message={submitError} />}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Review & Send'}
          </Button>
        </form>

        <div className="send-quote">
          {quoteIsExpired && (
            <p className="send-quote-expired" role="alert" aria-live="polite">
              Quote expired — enter your amount to refresh.
            </p>
          )}
          {!quoteIsExpired && quoteIsExpiringSoon && (
            <p
              className="send-quote-warning"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Quote expires in {quoteSecsLeft}s — confirm soon.
            </p>
          )}
          {!quoteIsExpired && quote ? (
            <QuoteCard
              quote={quote}
              locale={locale}
              secsLeft={quoteSecsLeft}
            />
          ) : (
            !quoteIsExpired && (
              <p className="send-quote-hint">
                Enter an amount to see your quote.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
