import Skeleton from './Skeleton.jsx'

export default {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    count: {
      control: { type: 'number', min: 1, max: 20 }
    },
    height: { control: 'text' }
  }
}

export const Single = {
  args: {
    count: 1,
    height: '1rem'
  }
}

export const Multiple = {
  args: {
    count: 5,
    height: '1rem'
  }
}

export const LargeBlock = {
  args: {
    count: 1,
    height: '3rem'
  }
}

export const CardSkeleton = {
  render: () => (
    <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Skeleton count={1} height="2rem" />
      <Skeleton count={1} height="1rem" />
      <Skeleton count={3} height="0.875rem" />
    </div>
  )
}
