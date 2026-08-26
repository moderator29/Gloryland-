# Build status

Updated as work lands.

## Deploy

Green. Verified by cloning the pushed tree and running install, build,
typecheck and the assertion suite against pnpm 11.22.0, the version the runner
uses. No environment variable is required to deploy. The two optional ones are
`ANTHROPIC_API_KEY`, without which the assistants answer from the product
reference instead of a model, and `VITE_ADDR_BTC` and its four siblings,
without which the funding surfaces say plainly that funding is not open.

The earlier failure was not the cron and not a secret. pnpm 11 refuses to
install when a dependency ships a build script that is neither approved nor
declined, and it exits non zero rather than warning. The approval lives in
`pnpm-workspace.yaml` under both key spellings, because pnpm 11 reads
`allowBuilds` and pnpm 10 reads `onlyBuiltDependencies`, and pnpm 11 no longer
reads the `pnpm` field in `package.json` at all.

## Checks

| Command | State |
| --- | --- |
| `npm run build` | passes |
| `npm run typecheck` | passes, app and API |
| `npm run check` | 72 assertions, all pass |
| `npx eslint src/` | clean, warnings only |
| Route sweep at 390px | 36 of 36 clean |

The route sweep loads every route with a funded ledger and checks for
uncaught errors, console errors, horizontal page overflow, heading structure
and touch target size.

## What shipped

### The engine

- **A double count, fixed.** An `open` never debited the balance, so settling a
  term and re-placing the same capital counted it twice: $1,000 rolled once
  showed $2,600 against a real $1,300. An `open` now records `fromAvailable`.
  Contribution counts external capital only, and standing is the greater of
  external capital and the most ever deployed at once, so no figure can be
  inflated by moving the same money in a circle while compounding still climbs.
- **Atomic writes.** `appendMany` persists a batch as one write.
- **One peak implementation**, shared by the ledger and the planners.

### Three instruments

- **Relay.** A standing instruction on a position: at maturity it carries into
  a new term and re-arms itself. Events are stamped when they run, never at the
  maturity date, because backdating would fabricate accrual.
- **Course.** An amount and a rhythm, with a date on every placement between
  here and the rung the member is aiming at. The platform cannot take the
  money, so a course is a schedule filled by hand, and the page says so.
- **Echelon.** One sum placed as several terms starting days apart. The reward
  is identical either way; laddering buys timing, not yield, and the comparison
  leads with that.

### Identity and first run

Members have a handle and a display name. The handle is checked for format,
against a reserved list and against handles already claimed. Sign up is four
steps: identity, how they want to run capital, roughly where they would start,
and a summary. The approach changes what surfaces lead with, never the rate.

### Interface

Type is self hosted: Space Grotesk for display and figures, Inter for the
interface, JetBrains Mono for identifiers. One surface material across the
product, with blur spent only where something floats. A touch target floor
applied to coarse pointers only, so a dense row stays dense on a mouse.

### Content and assistants

Signal derives its own day of twenty posts, revealed as each time arrives,
deterministic on the calendar day so every member sees the same channel with no
server. Both assistants answer from a generated briefing covering every
surface, flow, tier and term, narrowed by question, with the prohibitions
always included.

### Honesty fixes

Five real deposit addresses were printed under "Send to the address below",
three of them the same documentation example. They are gone. Invented activity
in the live band is now labelled. The redeploy prompt no longer walks a member
into the double count. Four landing page refusals that described security
controls we do not have are replaced with ones that are true. The predecessor's
rate card, which contradicted the one rate rule, is removed.

## Next

Ranked, from `docs/RECOMMENDATIONS.md`.

1. Somewhere for a dollar to actually go. Everything else assumes it.
2. Circle: the referral surface is the thinnest thing in the product.
3. `useLocale` and `haptic` from the predecessors, both small, both missed.
4. Error reporting, so a crash in production is something we learn about.
5. The remaining `BUILD NOW` items in the recommendations file.

## Rules this build holds itself to

1. No figure appears that `derive` cannot produce from the member's own log.
2. Anything illustrative is labelled where it appears.
3. No em dash characters anywhere, in code, copy or comments.
4. Never claim a licence, regulator, partner, statistic, member count,
   testimonial or track record.
5. Tiers differ on settlement speed and tooling, never on rate.
6. Where the product cannot do something yet, the interface says so.
