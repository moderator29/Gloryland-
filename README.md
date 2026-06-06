# Wegram

Investor portal web app — packages, deposits, withdrawals, and a BTC payment flow.

Built with React 19, Vite, TypeScript, Tailwind CSS, Radix UI, and React Router.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

## Project layout

```
api/                Edge/serverless functions
src/
  assets/           Static images
  components/       App shell (SiteHeader, BottomNav) and shadcn/ui primitives
  context/          React context providers
  hooks/            Custom hooks
  lib/              site-config, utils, error helpers
  routes/           Page routes (index, packages, portal)
  main.tsx          App entry
  index.css / styles.css
```

## Configuration

App-wide constants live in `src/lib/site-config.ts`:

- `BTC_WALLET` — destination address shown in the portal (drives the QR code)
- `BTC_RATE_USD` — USD per BTC used for the deposit estimate
- `PACKAGES` — investment package list
- `REVENUE_STREAMS` — revenue tiles on the landing page

Updating `BTC_WALLET` automatically regenerates the QR code on the portal page.

## Deployment

`vercel.json` and `wrangler.jsonc` are included for Vercel and Cloudflare deployments respectively.
