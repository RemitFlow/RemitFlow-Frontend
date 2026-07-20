import { useState } from 'react'
import LocaleSelect from './LocaleSelect.jsx'

export default {
  title: 'Components/LocaleSelect',
  component: LocaleSelect,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    id: { control: 'text' }
  }
}

export const Default = {
  render: function DefaultStory(args) {
    const [value, setValue] = useState('en-US')
    return <LocaleSelect {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Language & region',
    id: 'locale'
  }
}

export const NoLabel = {
  render: function NoLabelStory() {
    const [value, setValue] = useState('fr-FR')
    return <LocaleSelect value={value} onChange={setValue} />
  }
}

export const PreselectedHindi = {
  render: function PreselectedHindiStory() {
    const [value, setValue] = useState('hi-IN')
    return <LocaleSelect label="Language & region" id="locale-hi" value={value} onChange={setValue} />
  }
}
