import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import { applyPlanFromHandle, syncSubscription } from "../billing.server";
import { AppErrorPage } from "../components/AppErrorPage";
import { ConfirmDialogProvider } from "../components/ConfirmDialog";
import { getRouteErrorMessage } from "../utils/userFacingErrors";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planHandle = url.searchParams.get("plan_handle");

  if (planHandle) {
    await applyPlanFromHandle(session.shop, planHandle);
  }

  await syncSubscription(admin, session.shop);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    if (host) {
      sessionStorage.setItem("shopify_host", host);
    }
  }, []);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ConfirmDialogProvider>
        <s-app-nav>
          <s-link href="/app">Home</s-link>
          {/* <s-link href="/app/additional">Additional page</s-link> */}
          <s-link href="/app/questions">Quiz Builder</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/responses">Responses</s-link>
          <s-link href="/app/settings">Settings</s-link>
          <s-link href="/app/pricing">Pricing</s-link>
          <s-link href="/app/documentation">Documentation</s-link>
        </s-app-nav>
        <Outlet />
      </ConfirmDialogProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[App ErrorBoundary]", error);
  return <AppErrorPage message={getRouteErrorMessage(error)} homeHref="/app" />;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
