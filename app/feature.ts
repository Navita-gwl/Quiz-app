export type FeatureKey = 'customCss' | 'customJs' | 'hydrogen';

export const PLAN_FEATURES: Record<string, Record<FeatureKey, boolean>> = {
  FREE: {
    customCss: false,
    customJs: false,
    hydrogen: false,
  },
  STARTER: {
    customCss: true,
    customJs: true,
    hydrogen: true,
  },
};

export function checkFeatureAccess(plan: string | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  const normalizedPlan = plan.toUpperCase();
  const features = PLAN_FEATURES[normalizedPlan] || PLAN_FEATURES.FREE;
  return !!features[feature];
}
