import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleCustomerDataRequest } from "../utils/gdpr.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} received for ${shop}`);

  try {
    await handleCustomerDataRequest(shop, payload);
  } catch (error) {
    console.error(`[Webhook] ${topic} failed for ${shop}:`, error);
  }

  return new Response(null, { status: 200 });
};
