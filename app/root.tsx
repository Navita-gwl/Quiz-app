import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError, type LinksFunction } from "react-router";
import tailwindStyles from "./tailwind.css?url";
import { AppErrorPage } from "./components/AppErrorPage";
import { getRouteErrorMessage } from "./utils/userFacingErrors";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[Root ErrorBoundary]", error);

  const message = getRouteErrorMessage(error);
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{isNotFound ? "Page not found" : "Something went wrong"}</title>
        <Links />
      </head>
      <body>
        <AppErrorPage
          message={message}
          homeHref={undefined}
          homeLabel={undefined}
        />
        <Scripts />
      </body>
    </html>
  );
}
