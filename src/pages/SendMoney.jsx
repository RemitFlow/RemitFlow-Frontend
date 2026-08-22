import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/TextField.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import QuoteCard from '../components/QuoteCard.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';
import { buildQuote } from '../services/quote.js';
import { formatAmount, formatCurrencyInput } from '../utils/format.js';
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
 *
 * Submission is a three-step, keyboard-first flow:
 * 1. "Review & Send" validates the form and opens a confirmation dialog
 *    showing the full quote breakdown.
 * 2. "Confirm transfer" submits it; progress is announced via a live region.
 * 3. A result dialog confirms success (or an announced error returns focus to
 *    the form for retry). Dialogs trap focus and return it on close.
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

  // Which dialog (if any) is open: null | 'confirm' | 'success'.
  const [phase, setPhase] = useState(null);
  const [pendingQuote, setPendingQuote] = useState(null);
  const [submittedTransfer, setSubmittedTransfer] = useState(null);
  const submitButtonRef = useRef(null);

  // Debounce the amount so the quote isn't rebuilt on every keystroke.
  const debouncedAmount = useDebouncedValue(amount, 250);

  // Recompute the quote whenever the (debounced) inputs change.
  const quote = useMemo(() => {
    if (!isPositiveAmount(debouncedAmount)) return null;
    return buildQuote(debouncedAmount, from, to);
  }, [debouncedAmount, from, to]);

  // Surface submission failures predictably: announce them and put keyboard
  // focus back on the submit control so a retry is one Enter away.
  useEffect(() => {
    if (submitError) submitButtonRef.current?.focus();
  }, [submitError]);

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
  }

  // Tidy the amount field to two decimals once the user leaves it.
  function handleAmountBlur(value) {
    const formatted = formatCurrencyInput(value);
    if (formatted) setAmount(formatted);
  }

  function applyErrors(next) {
    setErrors(next);
    const firstErrorField = Object.keys(next)[0];
    if (firstErrorField) {
      const targetElement = document.getElementById(firstErrorField);
      if (targetElement && typeof targetElement.focus === 'function') {
        targetElement.focus();
      }
    }
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
    applyErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submissionLock.current || submitting || phase === 'confirm') return;

    setSubmitError(null);
    if (!validate()) return;

    // Build from the live amount so a pending debounce can't review a stale quote.
    const finalQuote = buildQuote(amount, from, to);
    if (!finalQuote) {
      applyErrors({ amount: 'Enter an amount greater than zero.' });
      return;
    }

    setPendingQuote(finalQuote);
    setPhase('confirm');
  }

  function handleCloseDialogs() {
    if (submitting) return;
    setPhase(null);
    setPendingQuote(null);
  }

  async function handleConfirmTransfer() {
    if (submissionLock.current || submitting) return;

    submissionLock.current = true;
    setSubmitting(true);
    try {
      if (!isConnected) {
        await connect();
      }

      // Rebuild at confirmation time so the committed amounts match the note:
      // rates are indicative and update at confirmation.
      const finalQuote = pendingQuote ?? buildQuote(amount, from, to);
      if (!finalQuote) throw new Error('quote unavailable');

      const created = await addTransfer({
        recipient,
        from,
        to,
        sendAmount: finalQuote.sendAmount,
        receiveAmount: finalQuote.receiveAmount,
      });
      setSubmittedTransfer(created ?? finalQuote);
      setPendingQuote(null);
      setSubmitError(null);
      setPhase('success');
    } catch {
      // Close the dialog; focus lands back in the form via the effect above
      // and the error is announced by the ErrorMessage live region.
      setPendingQuote(null);
      setPhase(null);
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
            type="number"
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

          <Button type="submit" ref={submitButtonRef} ariaHasPopup="dialog">
            Review &amp; Send
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

      {phase === 'confirm' && pendingQuote && (
        <Modal open onClose={handleCloseDialogs} title="Confirm your transfer">
          <dl className="send-dialog-summary">
            <div className="send-dialog-line">
              <dt>To</dt>
              <dd>{recipient}</dd>
            </div>
          </dl>
          <QuoteCard quote={pendingQuote} locale={locale} />
          <p className="send-submit-status" role="status" aria-live="polite">
            {submitting ? 'Submitting your transfer…' : ''}
          </p>
          <div className="send-dialog-actions">
            <Button
              variant="secondary"
              onClick={handleCloseDialogs}
              disabled={submitting}
            >
              Back
            </Button>
            <Button onClick={handleConfirmTransfer} disabled={submitting}>
              {submitting ? 'Sending…' : 'Confirm transfer'}
            </Button>
          </div>
        </Modal>
      )}

      {phase === 'success' && submittedTransfer && (
        <Modal open onClose={() => setPhase(null)} title="Transfer submitted">
          <p className="send-result-status" role="status" aria-live="polite">
            Your transfer was submitted successfully. Track its progress under
            Transfers.
          </p>
          <dl className="send-dialog-summary">
            <div className="send-dialog-line">
              <dt>To</dt>
              <dd>{submittedTransfer.recipient}</dd>
            </div>
            <div className="send-dialog-line">
              <dt>You send</dt>
              <dd>
                {formatAmount(
                  submittedTransfer.sendAmount,
                  submittedTransfer.from,
                  locale,
                )}
              </dd>
            </div>
            <div className="send-dialog-line">
              <dt>Recipient gets</dt>
              <dd>
                {formatAmount(
                  submittedTransfer.receiveAmount,
                  submittedTransfer.to,
                  locale,
                )}
              </dd>
            </div>
            <div className="send-dialog-line">
              <dt>Status</dt>
              <dd>{submittedTransfer.status}</dd>
            </div>
          </dl>
          <div className="send-dialog-actions">
            <Button variant="secondary" onClick={() => setPhase(null)}>
              Close
            </Button>
            <Button onClick={() => navigate('/transfers')}>
              View transfers
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
