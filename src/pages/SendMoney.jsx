import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/TextField.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import QuoteCard from '../components/QuoteCard.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { buildQuote } from '../services/quote.js';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/format.js';
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

/**
 * Send Money page: recipient + amount form with a live FX quote.
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
  const submissionLock = useRef(false);

  // Debounce the amount so the quote isn't rebuilt on every keystroke.
  const debouncedAmount = useDebouncedValue(amount, 250);

  // Recompute the quote whenever the (debounced) inputs change.
  const quote = useMemo(() => {
    const parsed = parseCurrencyInput(debouncedAmount, {
      currency: from,
      locale,
    });
    if (!parsed.ok) return null;
    return buildQuote(parsed.value, from, to);
  }, [debouncedAmount, from, locale, to]);

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
  }

  // Tidy the amount field to two decimals once the user leaves it.
  function handleAmountBlur(value) {
    const formatted = formatCurrencyInput(value, from, locale);
    if (formatted) setAmount(formatted);
  }

  function validate() {
    const next = {};
    if (!validateRecipient(recipient)) {
      next.recipient = 'Enter a valid email or Stellar address.';
    }
    const parsedAmount = parseCurrencyInput(amount, { currency: from, locale });
    if (!parsedAmount.ok) {
      next.amount = parsedAmount.error;
    } else if (
      wallet &&
      !isWithinBalance(parsedAmount.value, wallet.balance, {
        currency: from,
        locale,
      })
    ) {
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

      // Build from the live amount so a pending debounce can't submit a stale quote.
      const parsedAmount = parseCurrencyInput(amount, {
        currency: from,
        locale,
      });
      if (!parsedAmount.ok) return;
      const finalQuote = buildQuote(parsedAmount.value, from, to);
      if (!finalQuote) return;

      await addTransfer({
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
            inputMode="decimal"
            value={amount}
            onChange={setAmount}
            onBlur={handleAmountBlur}
            placeholder="0.00"
            error={errors.amount}
          />

          <div className="send-currencies">
            <CurrencySelect
              id="from"
              label="From"
              value={from}
              onChange={setFrom}
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
              onChange={setTo}
              error={errors.to}
            />
          </div>

          {submitError && <ErrorMessage message={submitError} />}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Review & Send'}
          </Button>
        </form>

        <div className="send-quote">
          {quote ? (
            <QuoteCard quote={quote} locale={locale} />
          ) : (
            <p className="send-quote-hint">
              Enter an amount to see your quote.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
