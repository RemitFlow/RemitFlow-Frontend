import SelectionToolbar from './SelectionToolbar.jsx'

export default {
  title: 'Components/SelectionToolbar',
  component: SelectionToolbar,
  tags: ['autodocs']
}

const baseArgs = {
  pageCount: 5,
  selectedCount: 0,
  totalCount: 12,
  allPageSelected: false,
  somePageSelected: false,
  allAcrossSelected: false,
  hasMorePages: true,
  onTogglePage: () => {},
  onSelectAllAcross: () => {},
  onClear: () => {}
}

export const Empty = {
  args: { ...baseArgs }
}

export const PartialPage = {
  args: { ...baseArgs, selectedCount: 2, somePageSelected: true }
}

export const PageSelected = {
  args: {
    ...baseArgs,
    selectedCount: 5,
    somePageSelected: true,
    allPageSelected: true
  }
}

export const AllAcrossPages = {
  args: {
    ...baseArgs,
    selectedCount: 12,
    somePageSelected: true,
    allPageSelected: true,
    allAcrossSelected: true
  }
}
