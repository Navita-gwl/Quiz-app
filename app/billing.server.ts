import db from "./db.server";

export type PlanKey = "STARTER" | "FREE";

const STARTER_PLAN_IDENTIFIERS = (
  process.env.SHOPIFY_STARTER_PLAN_HANDLES || "starter"
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const STARTER_TEST_SHOPS = (
  process.env.SHOPIFY_STARTER_TEST_SHOPS || ""
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

type ActiveSubscription = {
  id: string;
  name: string;
  status: string;
  test?: boolean;
};

type BillingContext = {
  partnerDevelopment: boolean;
  activeSubscriptions: ActiveSubscription[];
};

export function getAppHandle(): string {
  return process.env.SHOPIFY_APP_HANDLE || "quizinsights";
}

export function getPlanSelectionUrl(shop: string): string {
  const storeHandle = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${getAppHandle()}/pricing_plans`;
}

export function isStarterPlanIdentifier(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return STARTER_PLAN_IDENTIFIERS.some(
    (identifier) =>
      normalized === identifier || normalized.includes(identifier),
  );
}

export function resolvePlanKey(
  value: string | null | undefined,
): PlanKey {
  return isStarterPlanIdentifier(value) ? "STARTER" : "FREE";
}

export function getPlanKeyFromDb(
  sub: { plan: string; status: string } | null | undefined,
): PlanKey {
  if (sub?.status === "active" && sub.plan.toLowerCase() === "starter") {
    return "STARTER";
  }
  return "FREE";
}

export async function getShopPlan(shop: string): Promise<PlanKey> {
  const sub = await db.planSubscription.findUnique({ where: { shop } });
  return getPlanKeyFromDb(sub);
}

function isConfiguredTestShop(shop: string): boolean {
  const normalized = shop.trim().toLowerCase();
  return STARTER_TEST_SHOPS.some(
    (entry) =>
      normalized === entry ||
      normalized === `${entry}.myshopify.com` ||
      normalized.replace(/\.myshopify\.com$/, "") === entry,
  );
}

async function grantStarterAccess(
  shop: string,
  subscriptionId: string | null,
): Promise<void> {
  await db.planSubscription.upsert({
    where: { shop },
    update: {
      plan: "starter",
      status: "active",
      subscriptionId,
      updatedAt: new Date(),
    },
    create: {
      shop,
      plan: "starter",
      status: "active",
      subscriptionId,
    },
  });
}

async function fetchBillingContext(admin: any): Promise<BillingContext> {
  const graphqlResponse = await admin.graphql(
    `#graphql
    query GetBillingContext {
      shop {
        plan {
          partnerDevelopment
        }
      }
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          test
        }
      }
    }
    `,
  );
  const data = await graphqlResponse.json();

  return {
    partnerDevelopment: data?.data?.shop?.plan?.partnerDevelopment === true,
    activeSubscriptions:
      data?.data?.currentAppInstallation?.activeSubscriptions ?? [],
  };
}

function findActiveSubscription(
  subscriptions: ActiveSubscription[],
): ActiveSubscription | undefined {
  return subscriptions.find((sub) => sub.status === "ACTIVE");
}

function isPrivateTestPlanName(name: string): boolean {
  const normalized = name.toLowerCase();
  return (
    normalized.includes("shopify-test") ||
    normalized.includes("shopify_test") ||
    normalized.includes("shopify test")
  );
}

export function isPrivateTestPlanAccess(
  shop: string,
  context: BillingContext,
): boolean {
  if (isConfiguredTestShop(shop)) return true;
  if (context.partnerDevelopment) return true;

  const activeSub = findActiveSubscription(context.activeSubscriptions);
  if (!activeSub) return false;

  if (activeSub.test === true) return true;
  return isPrivateTestPlanName(activeSub.name);
}

function qualifiesForStarterTestAccess(
  shop: string,
  context: BillingContext,
): boolean {
  return isPrivateTestPlanAccess(shop, context);
}

export type BillingStatus = {
  /** Plan used for feature gates (Starter features on private test stores). */
  effectivePlan: PlanKey;
  /** Store is on a Shopify private / development test plan, not a public paid plan. */
  isPrivateTestPlan: boolean;
  /** Plan shown on the pricing page; null when on a private test plan. */
  displayPlan: PlanKey | null;
  planSelectionUrl: string;
};

async function syncSubscriptionWithContext(
  admin: any,
  shop: string,
  context: BillingContext,
): Promise<PlanKey> {
  if (qualifiesForStarterTestAccess(shop, context)) {
    const activeSub = findActiveSubscription(context.activeSubscriptions);
    await grantStarterAccess(shop, activeSub?.id ?? null);
    return "STARTER";
  }

  const activeSub = findActiveSubscription(context.activeSubscriptions);

  if (activeSub) {
    const planKey = resolvePlanKey(activeSub.name);
    const isStarter = planKey === "STARTER";

    const sub = await db.planSubscription.upsert({
      where: { shop },
      update: {
        plan: isStarter ? "starter" : "free",
        subscriptionId: isStarter ? activeSub.id : null,
        status: isStarter ? "active" : "inactive",
        updatedAt: new Date(),
      },
      create: {
        shop,
        plan: isStarter ? "starter" : "free",
        subscriptionId: isStarter ? activeSub.id : null,
        status: isStarter ? "active" : "inactive",
      },
    });

    return getPlanKeyFromDb(sub);
  }

  const dbSub = await db.planSubscription.findUnique({
    where: { shop },
  });

  if (
    dbSub &&
    dbSub.status === "active" &&
    dbSub.subscriptionId &&
    !dbSub.subscriptionId.startsWith("local_bypass_")
  ) {
    await db.planSubscription.update({
      where: { shop },
      data: {
        status: "inactive",
        subscriptionId: null,
        plan: "free",
        updatedAt: new Date(),
      },
    });
    return "FREE";
  }

  return getPlanKeyFromDb(dbSub);
}

export async function getBillingStatus(
  admin: any,
  shop: string,
): Promise<BillingStatus> {
  const context = await fetchBillingContext(admin);
  const isPrivateTestPlan = isPrivateTestPlanAccess(shop, context);
  const effectivePlan = await syncSubscriptionWithContext(admin, shop, context);

  return {
    effectivePlan,
    isPrivateTestPlan,
    displayPlan: isPrivateTestPlan ? null : effectivePlan,
    planSelectionUrl: getPlanSelectionUrl(shop),
  };
}

export async function applyPlanFromHandle(
  shop: string,
  planHandle: string,
): Promise<PlanKey> {
  const planKey =
    resolvePlanKey(planHandle) === "STARTER" ||
    isPrivateTestPlanName(planHandle)
      ? "STARTER"
      : "FREE";
  const isStarter = planKey === "STARTER";

  await db.planSubscription.upsert({
    where: { shop },
    update: {
      plan: isStarter ? "starter" : "free",
      status: isStarter ? "active" : "inactive",
      subscriptionId: isStarter ? undefined : null,
      updatedAt: new Date(),
    },
    create: {
      shop,
      plan: isStarter ? "starter" : "free",
      status: isStarter ? "active" : "inactive",
      subscriptionId: null,
    },
  });

  return planKey;
}

export async function syncSubscription(
  admin: any,
  shop: string,
): Promise<PlanKey> {
  try {
    const context = await fetchBillingContext(admin);
    return syncSubscriptionWithContext(admin, shop, context);
  } catch (err) {
    console.error("Error syncing subscription from Shopify:", err);
    const dbSub = await db.planSubscription.findUnique({
      where: { shop },
    });
    return getPlanKeyFromDb(dbSub);
  }
}
