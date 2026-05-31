import type { MessSize } from '@/lib/types'

export const BREAST_FEED_PRESETS = [5, 10, 15, 20, 25, 30] as const
export const BOTTLE_ML_PRESETS = [30, 60, 90, 120, 150, 180] as const
export const PUMP_DURATION_PRESETS = [10, 15, 20, 25, 30, 40] as const
export const PUMP_VOLUME_PRESETS = [30, 60, 90, 120, 150, 180] as const
export const PRIMARY_BREAST_FEED_PRESETS = [10, 15, 20, 25] as const
export const PRIMARY_BOTTLE_ML_PRESETS = [60, 90, 120, 150] as const
export const PRIMARY_PUMP_DURATION_PRESETS = [10, 15, 20, 30] as const
export const PRIMARY_PUMP_VOLUME_PRESETS = [60, 90, 120] as const

export const MESS_SIZE_OPTIONS = [
  { value: '', label: 'n/a' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const satisfies readonly { value: MessSize | ''; label: string }[]

export const TIMESTAMP_OFFSET_OPTIONS = [
  { label: 'Now', compactLabel: 'Now', minutesAgo: 0 },
  { label: '10 min ago', compactLabel: '10m ago', minutesAgo: 10 },
  { label: '30 min ago', compactLabel: '30m ago', minutesAgo: 30 },
  { label: '1 hr ago', compactLabel: '1h ago', minutesAgo: 60 },
] as const
