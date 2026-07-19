import Button from './Button.jsx'

export default {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost']
    },
    type: {
      control: 'select',
      options: ['button', 'submit']
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' }
  }
}

export const Primary = {
  args: {
    children: 'Send Money',
    variant: 'primary'
  }
}

export const Secondary = {
  args: {
    children: 'Cancel',
    variant: 'secondary'
  }
}

export const Ghost = {
  args: {
    children: 'Learn more',
    variant: 'ghost'
  }
}

export const Disabled = {
  args: {
    children: 'Disabled',
    disabled: true
  }
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button disabled>Disabled</Button>
    </div>
  )
}
