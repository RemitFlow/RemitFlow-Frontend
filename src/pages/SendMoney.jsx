import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/TextField.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import QuoteCard from '../components/QuoteCard.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';
import { buildQuote } from '../services/quote.js';
import { isQuoteExpired } from '../services/contracts/quote.js';
import { ContractViolationError } from '../services/contracts/schema.js';
import { getUserErrorMessage, normalizeError } from '../services/errors.js';
import {
  formatAmount,
  formatCurrencyInput,
  parseCurrencyInput,
} from '../utils/format.js';
import { validateRecipient, isWithinBalance } from '../utils/validate.js';
import {
  amountsReconcile,
  assertQuoteSignable,
  validateCurrencyPair,
} from '../utils/quoteBinding.js';
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
 *
 * Quotes carry an id bound into the transfer payload. Field or network changes
 * invalidate a pending quote so an expired or mismatched price cannot be signed.
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
  const confirmationVersion = useRef(0);
  const wasOffline = useRef(false);

  // True when the form just recovered from a disconnected state. Used to
  // surface an honest, non-blocking "back online" notice after the browser
  // regains connectivity (the transfer has NOT been submitted automatically).
  const [justReconnected, setJustReconnected] = useState(false);

  // Which dialog (if any) is open: null | 'confirm' | 'success'.
  const [phase, setPhase] = useState(null);
  const [pendingQuote, setPendingQuote] = useState(null);
  const [submittedTransfer, setSubmittedTransfer] = useState(null);
  const [quoteClock, setQuoteClock] = useState(() => Date.now());
  const submitButtonRef = useRef(null);

  // Debounce the amount so the quote isn't rebuilt on every keystroke.
  const debouncedAmount = useDebouncedValue(amount, 250);

  // Recompute the quote whenever the (debounced) inputs change.
  const quote = useMemo(() => {
    const corridor = validateCurrencyPair(from, to);
    if (!corridor.ok) return null;
    const parsed = parseCurrencyInput(debouncedAmount, {
      currency: from,
      locale,
    });
    if (!parsed.ok) return null;
    return buildQuote(parsed.value, from, to);
  }, [debouncedAmount, from, locale, to]);

  // Tick while a confirmation dialog is open so expiry UI stays honest.
  useEffect(() => {
    if (phase !== 'confirm' || !pendingQuote) return undefined;
    const id = setInterval(() => setQuoteClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase, pendingQuote]);

  // Field changes while confirming invalidate the pending quote — the user
  // must review a fresh price bound to the live inputs.
  useEffect(() => {
    if (phase !== 'confirm' || !pendingQuote) return;
    const parsedAmount = parseCurrencyInput(amount, { currency: from, locale });
    const live = parsedAmount.ok
      ? assertQuoteSignable(
          pendingQuote,
          { amount: parsedAmount.value, from, to },
          Date.now(),
        )
      : { ok: false, reason: parsedAmount.error };
    if (!live.ok && live.code !== 'expired') {
      confirmationVersion.current += 1;
      setPendingQuote(null);
      setPhase(null);
      setSubmitError(live.reason);
    }
  }, [amount, from, to, locale, phase, pendingQuote]);

  // Surface submission failures predictably: announce them and put keyboard
  // focus back on the submit control so a retry is one Enter away.
  useEffect(() => {
    if (submitError) submitButtonRef.current?.focus();
  }, [submitError]);

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
  }

  // Keep the field in its input locale when padding the currency precision.
  function handleAmountBlur(value) {
    const formatted = formatCurrencyInput(value, from, locale);
    if (formatted) {
      const decimal =
        new Intl.NumberFormat(locale)
          .formatToParts(1.1)
          .find((part) => part.type === 'decimal')?.value ?? '.';
      setAmount(formatted.replace('.', decimal));
    }
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
      // Both values are canonical; do not apply the input locale again.
      wallet &&
      !isWithinBalance(parsedAmount.value, wallet.balance, {
        currency: from,
      })
    ) {
      next.amount = 'Amount exceeds your wallet balance.';
    }
    const corridor = validateCurrencyPair(from, to);
    if (!corridor.ok) {
      next.to = corridor.error;
    }
    applyErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Track connectivity transitions. When the browser comes back online we do
   * NOT blindly resubmit the form (that would duplicate the transfer) — we
   * only clear the stale "offline" error state and inform the user. A pending
   * confirmation quote is dropped: rates may have moved while offline.
   */
  useEffect(() => {
    const recovered = wasOffline.current && isOnline;
    const dropped = !wasOffline.current && !isOnline;
    wasOffline.current = !isOnline;
    if (dropped && phase === 'confirm') {
      confirmationVersion.current += 1;
      setPendingQuote(null);
      setPhase(null);
      setSubmitError(
        "You're offline. The pending quote was cleared — reconnect and review again.",
      );
    }
    if (recovered) {
      setSubmitError(null);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    }
  }, [isOnline, phase]);

  function refreshPendingQuote() {
    confirmationVersion.current += 1;
    const parsedAmount = parseCurrencyInput(amount, { currency: from, locale });
    if (!parsedAmount.ok) {
      setSubmitError(parsedAmount.error);
      setPendingQuote(null);
      setPhase(null);
      return;
    }
    const corridor = validateCurrencyPair(from, to);
    if (!corridor.ok) {
      setSubmitError(corridor.error);
      setPendingQuote(null);
      setPhase(null);
      return;
    }
    const next = buildQuote(parsedAmount.value, from, to);
    if (!next) {
      setSubmitError(
        'We could not refresh this quote. Check the amount and currencies.',
      );
      setPendingQuote(null);
      setPhase(null);
      return;
    }
    setPendingQuote(next);
    setQuoteClock(Date.now());
    setSubmitError(null);
  }

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
      setSubmitError(
        'We could not price this transfer. Check the amount and currencies.',
      );
      return;
    }

    const signable = assertQuoteSignable(
      finalQuote,
      { amount: parsedAmount.value, from, to },
      Date.now(),
    );
    if (!signable.ok) {
      setSubmitError(signable.reason);
      return;
    }

    confirmationVersion.current += 1;
    setPendingQuote(finalQuote);
    setQuoteClock(Date.now());
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
    const startedVersion = confirmationVersion.current;
    try {
      const transferWallet = isConnected ? wallet : await connect();
      // A cleared or refreshed quote must not resume from the pre-connect render.
      if (startedVersion !== confirmationVersion.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        confirmationVersion.current += 1;
        setPendingQuote(null);
        setPhase(null);
        setSubmitError(
          "You're offline. The pending quote was cleared — reconnect and review again.",
        );
        return;
      }
      if (!transferWallet) {
        setSubmitError(
          'Wallet connection did not complete. Connect your wallet and try again.',
        );
        setPendingQuote(null);
        setPhase(null);
        return;
      }

      const parsedAmount = parseCurrencyInput(amount, {
        currency: from,
        locale,
      });
      if (!parsedAmount.ok) {
        setSubmitError(parsedAmount.error);
        setPendingQuote(null);
        setPhase(null);
        return;
      }

      const liveInputs = { amount: parsedAmount.value, from, to };
      const finalQuote = pendingQuote;
      const signable = assertQuoteSignable(finalQuote, liveInputs, Date.now());
      if (!signable.ok) {
        // Expired quotes get an explicit refresh path; other mismatches close
        // the dialog so the user reviews a newly priced quote.
        setSubmitError(signable.reason);
        if (signable.code === 'expired' && finalQuote) {
          setQuoteClock(Date.now());
          return;
        }
        setPendingQuote(null);
        setPhase(null);
        return;
      }

      // A wallet connected here was unavailable during the form's balance check.
      if (
        !isWithinBalance(finalQuote.sendAmount, transferWallet.balance, {
          currency: finalQuote.from,
        })
      ) {
        setSubmitError('Amount exceeds your wallet balance.');
        setPendingQuote(null);
        setPhase(null);
        return;
      }

      // Bind the quote id into the transfer so receipts can prove which price
      // was confirmed. Amounts come from the bound quote, not a rebuild.
      const transferPayload = {
        recipient,
        from: finalQuote.from,
        to: finalQuote.to,
        sendAmount: finalQuote.sendAmount,
        receiveAmount: finalQuote.receiveAmount,
        fee: finalQuote.fee,
        rate: finalQuote.rate,
        expiresAt: finalQuote.expiresAt,
        quoteId: finalQuote.id,
      };
      if (!amountsReconcile(finalQuote, transferPayload)) {
        setSubmitError('Displayed amounts do not match the transfer payload.');
        setPendingQuote(null);
        setPhase(null);
        return;
      }
      const created = await addTransfer(transferPayload);
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
        const connectedNow =
          typeof navigator !== 'undefined' && navigator.onLine;
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
  const pendingExpired =
    phase === 'confirm' && pendingQuote
      ? isQuoteExpired(pendingQuote, quoteClock)
      : false;

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
              ✓ Back online. Your form was not submitted while you were offline
              — review it and send when ready.
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
            <QuoteCard quote={quote} locale={locale} now={quoteClock} />
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
          <QuoteCard
            quote={pendingQuote}
            locale={locale}
            now={quoteClock}
            onRefresh={refreshPendingQuote}
          />
          <p className="send-submit-status" role="status" aria-live="polite">
            {submitting
              ? 'Submitting your transfer…'
              : pendingExpired
                ? 'Quote expired — refresh before confirming.'
                : ''}
          </p>
          <div className="send-dialog-actions">
            <Button
              variant="secondary"
              onClick={handleCloseDialogs}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              onClick={handleConfirmTransfer}
              disabled={submitting || pendingExpired}
            >
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
            {submittedTransfer.quoteId && (
              <div className="send-dialog-line">
                <dt>Quote</dt>
                <dd className="send-quote-id">{submittedTransfer.quoteId}</dd>
              </div>
            )}
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
