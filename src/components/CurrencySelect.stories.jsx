import { useState } from 'react'
import CurrencySelect from './CurrencySelect.jsx'

export default {
  title: 'Components/CurrencySelect',
  component: CurrencySelect,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    id: { control: 'text' }
  }
}

export const Default = {
  render: function DefaultStory(args) {
    const [value, setValue] = useState('USD')
    return <CurrencySelect {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Source currency',
    id: 'source-currency'
  }
}

export const WithLabel = {
  render: function WithLabelStory() {
    const [value, setValue] = useState('NGN')
    return <CurrencySelect label="Destination currency" id="dest-currency" value={value} onChange={setValue} />
  }
}

export const NoLabel = {
  render: function NoLabelStory() {
    const [value, setValue] = useState('EUR')
    return <CurrencySelect value={value} onChange={setValue} />
  }
}

export const PreselectedUSD = {
  render: function PreselectedUSDStory() {
    const [value, setValue] = useState('USD')
    return <CurrencySelect label="You send" id="send" value={value} onChange={setValue} />
  }
}

export const PreselectedINR = {
  render: function PreselectedINRStory() {
    const [value, setValue] = useState('INR')
    return <CurrencySelect label="Recipient currency" id="recv" value={value} onChange={setValue} />
  }
}

export const AllCurrencies = {
  render: function AllCurrenciesStory() {
    const [source, setSource] = useState('USD')
    const [dest, setDest] = useState('NGN')
    return (
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <CurrencySelect label="You send" id="ac-source" value={source} onChange={setSource} />
        <span style={{ fontSize: '1.5rem', paddingBottom: '0.25rem' }}>→</span>
        <CurrencySelect label="Recipient gets" id="ac-dest" value={dest} onChange={setDest} />
      </div>
    )
  }
}
