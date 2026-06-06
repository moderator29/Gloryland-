Dark, gold themed investor portal. A founder dashboard, six investment tiers, and a BTC deposit and withdraw flow with QR, confetti, sound, locale aware totals, and a PWA shell.

Built with React 19, Vite, TypeScript, Tailwind, Radix UI, Framer Motion, and React Router.

## Quick start

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints.

## Scripts

| Command        | What it does                 |
| -------------- | ---------------------------- |
| `pnpm dev`     | Start the Vite dev server    |
| `pnpm build`   | Production build             |
| `pnpm preview` | Preview the production build |
| `pnpm lint`    | Run ESLint                   |
| `pnpm format`  | Format with Prettier         |

## Project layout

```
api/                  Serverless functions (geolocation)
public/               Manifest, service worker, static assets
src/
  assets/             Images
  components/         App shell, motion primitives, UI kit
    Backdrop.tsx          Drifting gold orbs + grain backdrop
    BottomNav.tsx         Spring puck navigation
    CountUp.tsx           Animated number
    MagneticButton.tsx    Springy cursor pull
    PortraitGlow.tsx      Conic light cone around portrait
    PwaInstall.tsx        Install prompt sheet
    RouteShell.tsx        AnimatePresence route entry
    Sparkline.tsx         Gold gradient area chart
    Stagger.tsx           Staggered blur and translate cascade
    Ticker.tsx            Auto scroll revenue marquee
    TiltCard.tsx          3D mouse driven perspective
    WelcomeCards.tsx      Five card onboarding carousel
    SiteHeader.tsx        Sticky brand header
    ui/                   shadcn primitives
  context/            React context providers
  hooks/
    useLocale.ts        Country to currency hook
  lib/
    site-config.ts      BTC wallet, BTC rate, packages, streams
    sound.ts            Web Audio ting and tap effects
    confetti.ts         Gold burst helper
  routes/
    index.tsx           Founder card, hero, portfolio
    packages.tsx        Six tier grid
    portal.tsx          QR deposit, withdraw, confirm
  main.tsx            App entry with AnimatedRoutes and SW register
  index.css           Tailwind layers, Fraunces + Inter, shimmer
```

## Configuration

App wide constants live in `src/lib/site-config.ts`:

- `BTC_WALLET` destination address shown in the portal (drives the QR)
- `BTC_RATE_USD` USD per BTC used for the deposit estimate
- `PACKAGES` six investment tiers
- `REVENUE_STREAMS` revenue tiles on the landing page

Updating `BTC_WALLET` automatically regenerates the QR.

## Features

- Five card welcome carousel gated by localStorage with skip and drag.
- Drifting gold orb backdrop, conic shimmer, grain overlay.
- Next gen bottom nav with a morphing gold puck.
- Count up numbers, gold gradient sparkline, animated portrait halo.
- 3D tilt and cursor shine on tier cards.
- Magnetic gold CTAs everywhere.
- Confetti and Web Audio chimes on confirm.
- Sonner toasts on copy, invest, withdraw.
- Locale aware "Local: ..." line under every amount.
- PWA: manifest, install prompt, offline shell.
- Route transitions with blur and slide.

## Deployment

`vercel.json` and `wrangler.jsonc` are included for Vercel and Cloudflare deployments.
