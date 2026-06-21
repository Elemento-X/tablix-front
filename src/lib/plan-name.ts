import type { PlanType } from '@/lib/limits'

// Only the key is needed here; any t() (with or without an interpolation arg) is
// assignable to this narrower signature.
type TranslateFn = (key: string) => string

const VALID_PLANS: readonly PlanType[] = ['free', 'pro', 'enterprise']

/**
 * Localized display name of a plan, e.g. "Free", "免费版", "Gratuit", "Kostenlos".
 *
 * Use this anywhere a plan name is shown to the user — never `plan.toUpperCase()`,
 * which leaks the raw English key ("FREE"/"PRO") into every locale.
 * Falls back to the raw value if it isn't a known plan (defensive).
 */
export function getPlanName(t: TranslateFn, plan: string): string {
  return VALID_PLANS.includes(plan as PlanType) ? t(`pricing.plans.${plan}.name`) : plan
}
