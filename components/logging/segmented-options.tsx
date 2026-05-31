'use client'

interface SegmentedOptionsProps<TValue extends string> {
  options: readonly { value: TValue; label: string }[]
  value: TValue
  onChange: (value: TValue) => void
  disabled?: boolean
  className?: string
  buttonClassName?: string
  activeClassName?: string
  inactiveClassName?: string
  ariaLabel?: string
}

export function SegmentedOptions<TValue extends string>({
  options,
  value,
  onChange,
  disabled,
  className = 'grid grid-cols-4 gap-2',
  buttonClassName = 'h-11 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  activeClassName = 'bg-violet-500 text-white',
  inactiveClassName = 'bg-muted text-muted-foreground hover:text-foreground',
  ariaLabel,
}: SegmentedOptionsProps<TValue>) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {options.map(option => (
        <button
          key={option.value || 'none'}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`${buttonClassName} ${value === option.value ? activeClassName : inactiveClassName}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
