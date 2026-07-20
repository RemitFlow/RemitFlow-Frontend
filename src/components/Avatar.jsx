import './Avatar.css';

/**
 * Derive up to two uppercase initials from a name or email.
 * @param {string} value
 * @returns {string}
 */
function initialsFrom(value) {
  if (!value) return '?';
  const name = value.includes('@') ? value.split('@')[0] : value;
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return (letters.join('') || name[0] || '?').toUpperCase();
}

/**
 * Circular initials avatar used to represent a recipient.
 * @param {object} props
 * @param {string} props.name - the name or email to derive initials from
 * @param {'sm'|'md'|'lg'} [props.size] - avatar size
 */
export default function Avatar({ name, size = 'md' }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initialsFrom(name)}
    </span>
  );
}
