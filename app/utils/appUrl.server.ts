export function getAppUrl(request?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.SHOPIFY_APP_URL) return process.env.SHOPIFY_APP_URL;
  if (request) return new URL(request.url).origin;
  return "";
}
