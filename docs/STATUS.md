# Build status

Updated as work lands. Newest section first within each heading.

## Shipped and on main

### Deploy

- **pnpm 11 install failure fixed.** The runner refused to install because
  esbuild ships a build script that was neither approved nor declined. The
  approval lives in `pnpm-workspace.yaml` under both key spellings, because
  pnpm 11 reads `allowBuilds` and pnpm 10 reads `onlyBuiltDependencies`, and
  pnpm 11 no longer reads the `pnpm` field in `package.json` at all. Verified
  by running install and build against pnpm 11.22.0, the runner's version.
- **No cron.** Signal derives its own schedule on the client, so the project
  deploys on a Hobby plan with zero configuration and zero environment
  variables. The AI assistants are the only thing that need a key, and they
  degrade honestly without one.

### Domain

- **A double count in the ledger, fixed.** An `open` never debited the account
  balance, so it could not tell capital arriving from outside from capital
  already held being placed again. Rolling a term credited the balance on
  settlement and never debited it on placement: $1,000 rolled once showed
  $2,600 against a real $1,300. An `open` now records `fromAvailable`.
  Contribution counts external capital only, and tier standing is the greater
  of external capital and the most principal ever deployed at once, so no
  figure can be inflated by moving the same money in a circle while a member
  who compounds still climbs.
- **`npm run check`** runs 52 assertions over the real `derive`. All pass.
- **Atomic writes.** `appendMany` persists a batch as one write, because a
  relay firing is a claim, a close and an open that only make sense together.
- **Relay.** A standing instruction on a position: at maturity it carries into
  a new term instead of sitting still. Modes are principal and reward, or
  principal only. Events are stamped at the moment they run, never at the
  maturity date, because backdating would fabricate accrual for days the
  capital actually sat idle. The chain re-arms itself.
- **Identity.** Members have a handle and a display name. The handle is checked
  for format, against a reserved list and against handles already claimed, with
  suggestions when one is taken. The check is async because it is the single
  function that becomes a server call.

### Interface

- **Type is self hosted.** Space Grotesk carries display type and every figure,
  Inter runs the interface, JetBrains Mono is reserved for addresses and
  identifiers. Latin subsets only, preloaded for first paint. No third party
  connection is opened to draw a heading.
- **One material.** Every surface is a brand tint fading before the middle, a
  one pixel inner highlight along the top edge, and a long shadow. Blur is
  deliberately not in that recipe and is spent only where something floats.
  Added `.glass` with a raking light stride and grain, `.sheen`, `.rule-glow`
  and edge fades so a scrolling rail reads as having more rather than as cut.
- **Sign up is four steps.** Identity, how the member wants to run capital,
  roughly where they would start, and a summary. The approach changes what
  surfaces lead with and never the rate, and each option states its own trade.
- **Signal publishes on a daily batch.** Twenty posts a day, times spread
  across a 06:00 to 23:00 window, revealed as each arrives. Deterministic on
  the calendar day, so every member sees the same channel with no server.

### Surfaces mounted

Atlas with a Cmd+K launcher, the glossary, Horizon the maturity calendar, the
ladder planner, the aperture reveal, the reading rail, the install prompt,
Wayfinder, orientation, and the engagement set on Home.

## In flight

Three engineers are working in parallel on non overlapping files:

| Area | Files | State |
| --- | --- | --- |
| Landing page | `src/routes/landing.tsx`, `src/components/landing/*` | mid edit |
| Profile, settings, security | `src/routes/app/settings/*`, `src/features/profile/*`, `src/routes/app/security.tsx` | mid edit |
| Assistant knowledge | `api/ai/*`, `src/features/ai/*`, `src/domain/knowledge.ts` | mid edit |

## Next

1. Mount `Explain` beside the figures it explains across Home, Yield, vault
   detail and the Desk.
2. Build Course and Echelon, the second and third instruments designed in
   `docs/FEATURES-NEXT.md`.
3. Full route sweep at 360px and 1280px, with the console clean on every route.
4. Re-audit copy for em dashes and for any figure the ledger cannot derive.

## Rules this build holds itself to

1. No figure appears on a surface that `derive` cannot produce from the
   member's own log.
2. No em dash characters anywhere, in code, copy or comments.
3. Never invent a licence, a regulator, a partner, a statistic, a member count,
   an assets figure, a testimonial or a track record.
4. Tiers differ on settlement speed and tooling. They never differ on rate.
5. Where the product cannot do something yet, the interface says so plainly
   rather than implying it can.
