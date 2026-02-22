import { z } from 'zod'

export const effectTriggerSchema = z.enum([
  'on_hit',
  'on_crit',
  'activated',
  'passive',
  'on_attune',
  'on_roll_1',
  'on_roll_20',
])

export type EffectTrigger = z.infer<typeof effectTriggerSchema>

export const effectSchema = z.object({
  trigger: effectTriggerSchema,
  description: z.string().min(1).max(500),
})

export type Effect = z.infer<typeof effectSchema>

export const TRIGGER_DISPLAY: Record<EffectTrigger, string> = {
  on_hit: 'On Hit',
  on_crit: 'On Critical Hit',
  activated: 'Activated',
  passive: 'Passive',
  on_attune: 'On Attunement',
  on_roll_1: 'On Natural 1',
  on_roll_20: 'On Natural 20',
}
