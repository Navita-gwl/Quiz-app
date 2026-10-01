# QuizInsights

QuizInsights is a Shopify embedded app that helps merchants create interactive storefront quizzes, capture leads, and recommend products based on customer answers.

Built with [React Router](https://reactrouter.com/), [Shopify App React Router](https://shopify.dev/docs/api/shopify-app-react-router), and a theme app extension for the Online Store.

## Features

- **Multiple quizzes** per store with unique 8-character public Quiz IDs
- **Question types:** Radio, Checkbox, Dropdown (single), Dropdown (multiple)
- **Product recommendations** mapped to answer options
- **Lead collection** with optional name/email fields and configurable placement
- **Theme app extension** — publish via the Theme Editor without editing Liquid files
- **App proxy** for storefront quiz API and assets (`/apps/quizapp`)
- **Responses dashboard** to review submissions and customer answers
- **Per-quiz customization** for design, lead form, and layout overrides
- **Starter plan:** custom CSS/JS, Hydrogen iframe embed, and public headless API ($5/mo with 7-day trial via Shopify Billing API)
- **GDPR compliance webhooks** (`customers/data_request`, `customers/redact`, `shop/redact`)

## Tech stack

- React Router 7 + Vite
- Shopify App Bridge & Polaris web components
- Prisma + MySQL
- Tailwind CSS
- Theme app extension (`extensions/quiz-extension`)

## Prerequisites

- [Node.js](https://nodejs.org/) `>=20.19 <22` or `>=22.12`
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- MySQL database
- Shopify Partner account and development store

## Local development

1. Clone the repository and install dependencies:

```shell
npm install
```

2. Configure environment variables (Shopify CLI sets most of these during `shopify app dev`):

```env
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/gwl_quizinsights
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_files
SHOPIFY_APP_URL=
APP_URL=
```

3. Run database migrations:

```shell
npm run setup
```

4. Start the app:

```shell
npm run dev
```

Press **P** in the CLI to open the app URL and install on your development store.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Shopify CLI dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run setup` | `prisma generate` + `prisma migrate deploy` |
| `npm run docker-start` | Setup DB and start (Docker) |
| `npm run deploy` | Deploy app and extensions to Shopify |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Storefront integration

### Theme extension (all plans)

1. Create a quiz in **Questions** and copy its 8-character Quiz ID.
2. In the Shopify Theme Editor, add the **Quiz** block from QuizInsights.
3. Paste the Quiz ID into the block settings and save.

Storefront requests are served through the app proxy at `/apps/quizapp`.

### Headless / Hydrogen (Starter plan)

- **Iframe embed:** `/embed/quiz?shop=[SHOP]&quizId=[QUIZ_ID]`
- **Public API:**
  - `GET /api/public/quiz?shop=[SHOP]&quizId=[QUIZ_ID]`
  - `POST /api/public/submit`

Public API routes require an active app install and Starter plan access.

## Billing

QuizInsights uses **Shopify Managed Pricing**:

| Plan | Price | Trial |
| --- | --- | --- |
| Free | $0 | — |
| Starter | $5/month | 7 days |

Configure plans in the Partner Dashboard (Managed Pricing). The Pricing page redirects merchants to Shopify's plan selection UI. After a plan change, Shopify returns to the app with `?plan_handle=...` and subscription state syncs from GraphQL plus the `app_subscriptions/update` webhook.

**Before App Store submit:** ensure Partner Dashboard plans, App Store listing, and in-app pricing copy all match (Free / Starter $5, 7-day trial).

## App configuration

Key settings are defined in `shopify.app.toml`:

- **Scopes:** `read_products`, `write_files`
- **App proxy:** `prefix = "apps"`, `subpath = "quizapp"`
- **Webhooks:** app lifecycle, billing, and mandatory GDPR topics

Use `shopify.app.local.toml` for local overrides when needed.

## Project structure

```
app/
  routes/           # Admin UI, API routes, webhooks, public pages
  components/       # Quiz UI, admin components
  utils/            # Recommendations, GDPR, public API guards
extensions/
  quiz-extension/   # Theme app extension (Quiz block + loader)
prisma/
  schema.prisma     # MySQL schema
public/
  quiz.js           # Storefront quiz runtime
  quiz.css          # Storefront quiz styles
```

## Public pages

| Route | Description |
| --- | --- |
| `/privacy` | Privacy policy |
| `/help/faq` | Frequently asked questions |
| `/docs/getting-started` | Merchant setup guide |

Set the privacy policy URL in the Shopify Partner Dashboard before App Store submission.

## Deployment

1. Provision a MySQL database and set `DATABASE_URL` in production.
2. Set `NODE_ENV=production` and your production app URLs (`SHOPIFY_APP_URL`, `APP_URL`).
3. Build and run migrations:

```shell
npm run build
npm run setup
npm run start
```

4. Deploy the app and extensions:

```shell
npm run deploy
```

See [Shopify deployment docs](https://shopify.dev/docs/apps/launch/deployment) for hosting options.

## Troubleshooting

**Database tables missing**

```shell
npm run setup
```

**Prisma connection errors**

Verify `DATABASE_URL` uses the `mysql://` protocol and the database exists.

**Theme check: JavaScript asset size**

The theme extension uses a small `quiz-loader.js` that loads full quiz assets from the app server via the app proxy (under Shopify's 10 KB limit).

## Resources

- [Shopify App React Router](https://shopify.dev/docs/api/shopify-app-react-router)
- [Theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)
- [App proxy](https://shopify.dev/docs/apps/build/online-store/display-dynamic-data)
- [Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)

## Support

- Email: appsupport@galaxyweblinks.com
- Company: Galaxy Weblinks Ltd
