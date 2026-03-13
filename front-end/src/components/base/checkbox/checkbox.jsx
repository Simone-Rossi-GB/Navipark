import './checkbox.css'

export function CheckboxBase({ isSelected, isDisabled, isIndeterminate, size = 'sm', className }) {
  const classes = [
    'cb-box',
    size === 'md' ? 'cb-box--md' : '',
    isSelected || isIndeterminate ? 'cb-box--checked' : '',
    isDisabled ? 'cb-box--disabled' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <span className={classes} aria-hidden="true">
      {isIndeterminate && (
        <svg viewBox="0 0 14 14" fill="none" className="cb-icon">
          <path d="M2.91675 7H11.0834" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isSelected && !isIndeterminate && (
        <svg viewBox="0 0 14 14" fill="none" className="cb-icon">
          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export function Checkbox({ label, hint, isSelected, onChange, isDisabled, isIndeterminate, size = 'sm', className }) {
  const labelClass = [
    'cb-label',
    size === 'md' ? 'cb-label--md' : '',
    isDisabled ? 'cb-label--disabled' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <label className={labelClass}>
      <input
        type="checkbox"
        checked={isSelected || false}
        onChange={onChange}
        disabled={isDisabled}
        className="cb-input"
      />
      <CheckboxBase
        isSelected={isSelected}
        isDisabled={isDisabled}
        isIndeterminate={isIndeterminate}
        size={size}
        className={label || hint ? 'cb-box--offset' : ''}
      />
      {(label || hint) && (
        <span className="cb-text">
          {label && <span className="cb-text__label">{label}</span>}
          {hint && <span className="cb-text__hint">{hint}</span>}
        </span>
      )}
    </label>
  )
}
