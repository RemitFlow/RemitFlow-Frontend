import { useScrollToTop } from '../hooks/useScrollToTop.js'
import './ScrollToTopButton.css'

/**
 * Floating button that appears after the page is scrolled down and returns the
 * viewport to the top when activated. Hidden from assistive tech and pointer
 * events until it is visible.
 * @param {object} props
 * @param {number} [props.threshold] - pixels scrolled before the button shows
 * @param {string} [props.label] - accessible label for the action
 */
export default function ScrollToTopButton({
  threshold = 300,
  label = 'Scroll to top'
}) {
  const { visible, scrollToTop } = useScrollToTop(threshold)

  return (
    <button
      type="button"
      className={`scroll-to-top${visible ? ' scroll-to-top--visible' : ''}`}
      onClick={scrollToTop}
      aria-label={label}
      title={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span aria-hidden="true" className="scroll-to-top__icon">
        ↑
      </span>
    </button>
  )
}
