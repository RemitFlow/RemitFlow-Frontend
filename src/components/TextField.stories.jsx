import { useState } from 'react'
import TextField from './TextField.jsx'

export default {
  title: 'Components/TextField',
  component: TextField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    type: { control: 'select', options: ['text', 'number', 'email', 'password'] },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    id: { control: 'text' }
  }
}

export const Default = {
  render: function DefaultStory(args) {
    const [value, setValue] = useState('')
    return <TextField {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Full name',
    id: 'full-name',
    placeholder: 'Enter your full name'
  }
}

export const WithError = {
  render: function ErrorStory(args) {
    const [value, setValue] = useState('abc')
    return <TextField {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Amount',
    id: 'amount',
    placeholder: '0.00',
    error: 'Must be a number greater than 0'
  }
}

export const NumberInput = {
  render: function NumberStory(args) {
    const [value, setValue] = useState('100.00')
    return <TextField {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Send amount',
    id: 'send-amount',
    type: 'number',
    placeholder: '0.00'
  }
}

export const PasswordInput = {
  render: function PasswordStory(args) {
    const [value, setValue] = useState('')
    return <TextField {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Password',
    id: 'password',
    type: 'password',
    placeholder: '••••••••'
  }
}

export const NoLabel = {
  render: function NoLabelStory(args) {
    const [value, setValue] = useState('')
    return <TextField {...args} value={value} onChange={setValue} />
  },
  args: {
    id: 'search',
    placeholder: 'Search transfers...'
  }
}

export const AllExamples = {
  render: function AllExamplesStory() {
    const [name, setName] = useState('Chidi Okonkwo')
    const [amount, setAmount] = useState('450.00')
    const [email, setEmail] = useState('')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 360 }}>
        <TextField label="Full name" id="ex-name" value={name} onChange={setName} />
        <TextField
          label="Send amount"
          id="ex-amount"
          type="number"
          value={amount}
          onChange={setAmount}
        />
        <TextField
          label="Email"
          id="ex-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          error={email && !email.includes('@') ? 'Please enter a valid email' : ''}
        />
      </div>
    )
  }
}
