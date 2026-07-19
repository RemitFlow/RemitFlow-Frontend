import { useApp } from '../context/AppContext.jsx'
import './DensityToggle.css'

/**
 * Segmented control to switch between comfortable and compact display density.
 */
export default function DensityToggle() {
  const { density, setDensity } = useApp()

  return (
    <div className="density-toggle" role="group" aria-label="Display density">
      <button
        type="button"
        className="density-option"
        aria-pressed={density === 'comfortable'}
        onClick={() => setDensity('comfortable')}
      >
        Comfortable
      </button>
      <button
        type="button"
        className="density-option"
        aria-pressed={density === 'compact'}
        onClick={() => setDensity('compact')}
      >
        Compact
      </button>
    </div>
  )
}
