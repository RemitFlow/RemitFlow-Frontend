import Tag from './Tag.jsx'

export default {
  title: 'Components/Tag',
  component: Tag,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning']
    },
    children: { control: 'text' }
  }
}

export const Neutral = {
  args: {
    children: 'USD → NGN',
    variant: 'neutral'
  }
}

export const Info = {
  args: {
    children: 'New',
    variant: 'info'
  }
}

export const Success = {
  args: {
    children: 'Completed',
    variant: 'success'
  }
}

export const Warning = {
  args: {
    children: 'Expiring',
    variant: 'warning'
  }
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Tag variant="neutral">EUR</Tag>
      <Tag variant="info">Pending</Tag>
      <Tag variant="success">Completed</Tag>
      <Tag variant="warning">Low balance</Tag>
    </div>
  )
}
