import Tabs from './Tabs.jsx'

export default {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs']
}

const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

export const Default = {
  args: {
    tabs: [
      { label: 'Send', content: <div style={{ padding: '1rem 0' }}>{lorem} Send tab content.</div> },
      { label: 'History', content: <div style={{ padding: '1rem 0' }}>{lorem} History tab content.</div> },
      { label: 'Settings', content: <div style={{ padding: '1rem 0' }}>{lorem} Settings tab content.</div> }
    ]
  }
}

export const TwoTabs = {
  args: {
    tabs: [
      { label: 'Tab A', content: <div style={{ padding: '1rem 0' }}>Content for Tab A</div> },
      { label: 'Tab B', content: <div style={{ padding: '1rem 0' }}>Content for Tab B</div> }
    ]
  }
}

export const Controlled = {
  args: {
    activeIndex: 1,
    tabs: [
      { label: 'First', content: <div style={{ padding: '1rem 0' }}>First panel</div> },
      { label: 'Second', content: <div style={{ padding: '1rem 0' }}>Second panel (active by default)</div> },
      { label: 'Third', content: <div style={{ padding: '1rem 0' }}>Third panel</div> }
    ]
  }
}