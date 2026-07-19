import ProgressBar from './ProgressBar.jsx'

export default {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 }
    },
    max: {
      control: { type: 'number', min: 1 }
    },
    label: { control: 'text' }
  }
}

export const Default = {
  args: {
    value: 42,
    label: 'Transfer progress'
  }
}

export const Empty = {
  args: {
    value: 0
  }
}

export const Halfway = {
  args: {
    value: 50
  }
}

export const Complete = {
  args: {
    value: 100
  }
}

export const CustomMax = {
  args: {
    value: 3,
    max: 5,
    label: 'Steps completed'
  }
}

export const ProgressSteps = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
      <ProgressBar value={0} label="Not started" />
      <ProgressBar value={25} label="In progress" />
      <ProgressBar value={67} label="Almost done" />
      <ProgressBar value={100} label="Complete" />
    </div>
  )
}
