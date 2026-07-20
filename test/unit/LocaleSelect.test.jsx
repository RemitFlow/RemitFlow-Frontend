import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LocaleSelect from '../../src/components/LocaleSelect.jsx'
import { LOCALES } from '../../src/constants/locales.js'

describe('LocaleSelect', () => {
  it('renders every supported locale as an option', () => {
    render(<LocaleSelect value="en-US" onChange={() => {}} label="Language" id="locale" />)

    const select = screen.getByLabelText('Language')
    expect(select).toHaveValue('en-US')
    LOCALES.forEach((l) => {
      expect(screen.getByRole('option', { name: l.name })).toBeInTheDocument()
    })
  })

  it('calls onChange with the newly selected locale code', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LocaleSelect value="en-US" onChange={onChange} label="Language" id="locale" />)

    await user.selectOptions(screen.getByLabelText('Language'), 'fr-FR')

    expect(onChange).toHaveBeenCalledWith('fr-FR')
  })

  it('falls back to an aria-label when no visible label is rendered', () => {
    render(<LocaleSelect value="en-US" onChange={() => {}} ariaLabel="Language & region" />)

    expect(screen.getByLabelText('Language & region')).toBeInTheDocument()
  })
})
