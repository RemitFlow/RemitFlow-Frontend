import Avatar from './Avatar.jsx'

export default {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    name: { control: 'text' }
  }
}

export const Small = {
  args: {
    name: 'Chidi Okonkwo',
    size: 'sm'
  }
}

export const Medium = {
  args: {
    name: 'Ngozi Adebayo',
    size: 'md'
  }
}

export const Large = {
  args: {
    name: 'Oluwaseun Balogun',
    size: 'lg'
  }
}

export const EmailBased = {
  args: {
    name: 'fatima@example.com',
    size: 'md'
  }
}

export const SingleName = {
  args: {
    name: 'Emeka',
    size: 'md'
  }
}

export const WithUnderscores = {
  args: {
    name: 'john_doe_account',
    size: 'md'
  }
}

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Avatar name="Chidi Okonkwo" size="sm" />
      <Avatar name="Chidi Okonkwo" size="md" />
      <Avatar name="Chidi Okonkwo" size="lg" />
    </div>
  )
}
