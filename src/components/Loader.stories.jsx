import Loader from './Loader.jsx'

export default {
  title: 'Components/Loader',
  component: Loader,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' }
  }
}

export const Default = {
  args: {
    label: 'Loading...'
  }
}

export const CustomLabel = {
  args: {
    label: 'Fetching exchange rates…'
  }
}

export const NoLabel = {
  args: {
    label: ''
  }
}
