import { useState } from 'react';
import './CopyButton.css';

/**
 * Button that copies a value to the clipboard and shows brief confirmation.
 * @param {object} props
 * @param {string} props.value - the text to copy
 * @param {string} [props.label] - accessible label for the action
 */
export default function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Clipboard may be blocked; leave the label unchanged.
    }
  }

  return (
    <button
      type="button"
      className="copy-button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  );
}
