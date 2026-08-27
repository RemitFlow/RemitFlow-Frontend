import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/TextField.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import QuoteCard from '../components/QuoteCard.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';
import { buildQuote } from '../services/quote.js';
import { ContractViolationError } from '../services/contracts/schema.js';
import { getUserErrorMessage, normalizeError } from '../services/errors.js';
import { formatAmount, formatCurrencyInput, parseCurrencyInput } from '../utils/format.js';
import {
  isPositiveAmount,
  validateRecipient,
  isWithinBalance,
} from '../utils/validate.js';
import { useWallet } from '../hooks/useWallet.js';
import { useTransfers } from '../hooks/useTransfers.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
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
  const isOnline = useOnlineStatus();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(DEFAULT_SOURCE);
  const [to, setTo] = useState(DEFAULT_DEST);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submissionLock = useRef(false);
  const wasOffline = useRef(false);

  // True when the form just recovered from a disconnected state. Used to
  // surface an honest, non-blocking "back online" notice after the browser
  // regains connectivity (the transfer has NOT been submitted automatically).
  const [justReconnected, setJustReconnected] = useState(false);

  // Which dialog (if any) is open: null | 'confirm' | 'success'.
  const [phase, setPhase] = useState(null);
  const [pendingQuote, setPendingQuote] = useState(null);
  const [submittedTransfer, setSubmittedTransfer] = useState(null);
  const submitButtonRef = useRef(null);

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
    const formatted = formatCurrencyInput(value, from, locale);
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
    applyErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Track connectivity transitions. When the browser comes back online we do
   * NOT blindly resubmit the form (that would duplicate the transfer) — we
   * only clear the stale "offline" error state and inform the user.
   */
  useEffect(() => {
    const recovered = wasOffline.current && isOnline;
    wasOffline.current = !isOnline;
    if (recovered) {
      setSubmitError(null);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    }
  }, [isOnline]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submissionLock.current || submitting || phase === 'confirm') return;

    setSubmitError(null);
    setJustReconnected(false);

    // Never start a transfer while offline: submitting blind would either
    // fail confusingly or, worse, appear to succeed while nothing happened.
    if (!isOnline) {
      setSubmitError(
        "You're offline. Connect to the internet before sending money.",
      );
      return;
    }

    if (!validate()) return;

    // Build from the live amount so a pending debounce can't review a stale quote.
    const parsedAmount = parseCurrencyInput(amount, { currency: from, locale });
    if (!parsedAmount.ok) {
      applyErrors({ amount: parsedAmount.error });
      return;
    }
    const finalQuote = buildQuote(parsedAmount.value, from, to);
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
      const parsedAmount = parseCurrencyInput(amount, { currency: from, locale });
      if (!parsedAmount.ok) {
        setSubmitError(parsedAmount.error);
        return;
      }
      const finalQuote = pendingQuote ?? buildQuote(parsedAmount.value, from, to);
      if (!finalQuote) {
        setSubmitError(
          'We could not price this transfer. Check the amount and the selected currencies.',
        );
        return;
      }

      // Record the fee, rate and expiry alongside the amounts so the receipt
      // can reproduce exactly what was quoted rather than re-deriving it from
      // a rate that may since have moved.
      const created = await addTransfer({
        recipient,
        from,
        to,
        sendAmount: finalQuote.sendAmount,
        receiveAmount: finalQuote.receiveAmount,
        fee: finalQuote.fee,
        rate: finalQuote.rate,
        expiresAt: finalQuote.expiresAt,
      });
      setSubmittedTransfer(created ?? finalQuote);
      setPendingQuote(null);
      setSubmitError(null);
      setPhase('success');
    } catch (err) {
      setPendingQuote(null);
      setPhase(null);
      if (err instanceof ContractViolationError) {
        // The full field-by-field diff goes to the console; the user gets a
        // message that distinguishes "we rejected this" from "try again".
        console.error(err.message);
        setSubmitError(
          'This transfer was rejected before it was sent because the details did not match the expected format. Nothing was submitted.',
        );
      } else {
        const normalized = normalizeError(err, { source: 'api' });
      // A transfer can be interrupted mid-signature by a connection drop.
      // The honest message here is "unknown", not "failed": the backend may
      // have accepted the transfer even though the response never arrived.
      // The transfers page reconciles real status on reconnect.
      // Read the current connectivity directly (not from the render closure)
      // so that a mid-flight disconnect produces the correct message.
      const connectedNow = typeof navigator !== 'undefined' && navigator.onLine;
      setSubmitError(
        connectedNow
          ? getUserErrorMessage(normalized)
          : 'Connection lost while sending. Reconnect to check your transfer status.',
      );
      }
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

          {!isOnline && (
            <div
              className="send-offline-notice"
              role="status"
              aria-live="polite"
            >
              ⚠️ No internet connection. Send Money is disabled until you
              reconnect.
            </div>
          )}

          {justReconnected && (
            <div
              className="send-reconnected-notice"
              role="status"
              aria-live="polite"
            >
              ✓ Back online. Your form was not submitted while you were
              offline — review it and send when ready.
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

          <Button
            type="submit"
            ref={submitButtonRef}
            ariaHasPopup="dialog"
            disabled={submitting || !isOnline}
          >
            {!isOnline
              ? 'Offline — Reconnect to send'
              : submitting
                ? 'Sending...'
                : 'Review & Send'}
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
