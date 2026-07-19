import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

export default {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' }
  }
}

export const Default = {
  render: function DefaultStory() {
    const [open, setOpen] = useState(true)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Confirm transfer">
          <p>You are about to send <strong>$450.00</strong> to Chidi Okonkwo.</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            This action cannot be undone. Please verify the details before proceeding.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </div>
    )
  }
}

export const NoTitle = {
  render: function NoTitleStory() {
    const [open, setOpen] = useState(true)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)}>
          <p>This modal has no title bar. Useful for simple confirmations or image lightboxes.</p>
        </Modal>
      </div>
    )
  }
}

export const LongContent = {
  render: function LongContentStory() {
    const [open, setOpen] = useState(true)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Terms of Service">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <h4>1. Acceptance of Terms</h4>
            <p>By using RemitFlow, you agree to these terms of service. If you do not agree with any part of these terms, you must not use the service.</p>
            <h4>2. Description of Service</h4>
            <p>RemitFlow provides a peer-to-peer remittance platform powered by the Stellar blockchain network. We facilitate cross-border money transfers with low fees and near-instant settlement.</p>
            <h4>3. User Obligations</h4>
            <p>You are responsible for maintaining the confidentiality of your wallet credentials and for all activities that occur under your account.</p>
            <h4>4. Fees</h4>
            <p>RemitFlow charges a small percentage fee (0.5%) plus a flat network fee. All fees are displayed transparently before you confirm any transfer.</p>
            <h4>5. Limitation of Liability</h4>
            <p>RemitFlow is not responsible for delays caused by network congestion or external banking systems.</p>
          </div>
        </Modal>
      </div>
    )
  }
}

export const Closed = {
  render: function ClosedStory() {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Hidden modal">
          <p>Click the button above to open this modal.</p>
        </Modal>
      </div>
    )
  }
}

export const AllExamples = {
  render: function AllExamplesStory() {
    const [active, setActive] = useState(null)

    return (
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button variant="secondary" onClick={() => setActive('confirm')}>
          Confirm Transfer
        </Button>
        <Button variant="secondary" onClick={() => setActive('receipt')}>
          View Receipt
        </Button>
        <Button variant="secondary" onClick={() => setActive('terms')}>
          Terms of Service
        </Button>

        <Modal open={active === 'confirm'} onClose={() => setActive(null)} title="Confirm transfer">
          <p>Send <strong>$450.00 USD</strong> → <strong>₦697,500.00 NGN</strong></p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Rate: 1 USD = 1,550 NGN</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => setActive(null)}>Confirm</Button>
          </div>
        </Modal>

        <Modal open={active === 'receipt'} onClose={() => setActive(null)} title="Transfer receipt">
          <p><strong>Reference:</strong> RF-2024-07890</p>
          <p><strong>Status:</strong> Completed ✅</p>
          <p><strong>Date:</strong> Jul 18, 2026</p>
        </Modal>

        <Modal open={active === 'terms'} onClose={() => setActive(null)} title="Terms of Service">
          <p>By using RemitFlow you agree to our terms of service.</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            RemitFlow provides peer-to-peer remittance via the Stellar network with low fees and instant settlement.
          </p>
        </Modal>
      </div>
    )
  }
}
