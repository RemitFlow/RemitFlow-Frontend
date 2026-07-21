import './Tag.css';

/**
 * Small inline label for categorising or highlighting content.
 * @param {object} props
 * @param {'neutral'|'info'|'success'|'warning'} [props.variant] - colour scheme
 */
export default function Tag({ children, variant = 'neutral' }) {
  return <span className={`tag tag-${variant}`}>{children}</span>;
}
