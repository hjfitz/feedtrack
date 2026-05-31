'use client'

import { MESS_SIZE_OPTIONS } from '@/lib/logging-options'
import { SegmentedOptions } from './segmented-options'

interface MessSizeControlProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  buttonClassName?: string
  activeClassName?: string
  inactiveClassName?: string
  excludeNone?: boolean
}

export function MessSizeControl({
  value,
  onChange,
  disabled,
  className,
  buttonClassName,
  activeClassName,
  inactiveClassName,
  excludeNone = false,
}: MessSizeControlProps) {
  return (
    <SegmentedOptions
      options={excludeNone ? MESS_SIZE_OPTIONS.filter(option => option.value) : MESS_SIZE_OPTIONS}
      value={value as (typeof MESS_SIZE_OPTIONS)[number]['value']}
      onChange={onChange}
      disabled={disabled}
      className={className}
      buttonClassName={buttonClassName}
      activeClassName={activeClassName}
      inactiveClassName={inactiveClassName}
      ariaLabel="Mess size"
    />
  )
}
