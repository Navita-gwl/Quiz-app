import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { resolvePlanKey } from "../billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const appSubscription = (payload as any)?.app_subscription;
  if (!appSubscription) {
    return new Response("No app_subscription in payload", { status: 400 });
  }

  const subscriptionId = appSubscription.admin_graphql_api_id;
  const status = appSubscription.status;
  const planName = appSubscription.name || "starter";
  const isTestSubscription = appSubscription.test === true;

  if (status === "ACTIVE") {
    const planKey = resolvePlanKey(planName);
    const isStarter = planKey === "STARTER" || isTestSubscription;

    await db.planSubscription.upsert({
      where: { shop },
      update: {
        plan: isStarter ? "starter" : "free",
        subscriptionId: isStarter ? subscriptionId : null,
        status: isStarter ? "active" : "inactive",
        updatedAt: new Date(),
      },
      create: {
        shop,
        plan: isStarter ? "starter" : "free",
        subscriptionId: isStarter ? subscriptionId : null,
        status: isStarter ? "active" : "inactive",
      },
    });
    console.log(`Updated shop ${shop} subscription to ACTIVE (Plan: ${planName})`);
  } else {
    await db.planSubscription.upsert({
      where: { shop },
      update: {
        plan: "free",
        subscriptionId: null,
        status: "inactive",
        updatedAt: new Date(),
      },
      create: {
        shop,
        plan: "free",
        subscriptionId: null,
        status: "inactive",
      },
    });
    console.log(`Reverted shop ${shop} subscription to FREE/INACTIVE (Status was: ${status})`);
  }

  return new Response();
};
