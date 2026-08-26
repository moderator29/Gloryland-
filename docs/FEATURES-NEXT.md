# Three instruments to build next

Written after reading `docs/NAMING.md`, `src/domain/tiers.ts`, `src/domain/ledger.ts`,
`src/domain/feed.ts`, `src/domain/schedule.ts`, `src/domain/insights.ts`, `src/index.css`,
`src/main.tsx`, `src/components/shell/nav.ts` and every route under `src/routes/app/`.

## What already exists, so it is not proposed here

Home, Desk, Vaults (list, new, detail), Tiers (ladder, compare, match, detail), Yield,
Telemetry, Insight, Ledger, Horizon, Signal, Markets, Circle, Copilot, Support, Atlas,
Glossary, Orientation, Settings. Inside those: Pulse, Trajectory, Countdown, Cadence,
Concurrent, First Light, Redeploy, Standards, Systems, TierBadge, Arrange, Wayfinder,
Explain, Provenance, and the pure planners in `src/features/ladder/plan.ts`
(`planFor`, `ladderSteps`, `stagger`, `maxParts`).

Two of those planners are already written and have no execution path. `stagger()` powers the
Laddering panel at the bottom of `src/routes/app/horizon.tsx` and that panel ends in prose, not
in a button. One of the three features below is that missing button.

## The constitution these must not break

- `CYCLE_DAYS = 30`, `CYCLE_RETURN = 0.30`, `DAILY_RATE = 0.01`. One rate, six tiers, and the
  tiers differ only on settlement target and tooling: Core $400 / 72h, Signal $1,000 / 48h,
  Vector $3,000 / 36h, Apex $5,000 / 24h, Meridian $8,000 / 12h, Sovereign $10,000 / 6h.
- **None of the three features below varies yield.** Not by tier, not by duration, not by size.
  The one structural variation that could be defended is a non callable term, where the member
  waives early settlement and the platform gains duration certainty. It is rejected here for a
  concrete reason: this build has no custody and a browser local ledger, so a lock up would be a
  fiction the product cannot enforce, and paying for it in rate would create a second headline
  number and destroy the single published rate the whole landing page rests on. Where a feature
  costs the member something, that cost is stated in days and dollars, and it is derived.
- Nothing here invents a licence, a partner, a regulator, a custody arrangement or a statistic.
- No serverless function is required by any of the three. The current API surface
  (`api/country.ts`, `api/ai/*`, `api/feed/publish.ts`) is untouched.

## Order, and why

1. **Relay** first. It is the smallest complete slice, it needs no new route, it carries the
   ledger correction the other two depend on, and it attacks the highest priority rule already
   in `src/domain/insights.ts` (`matured` at priority 100: principal that finished its term and
   stopped accruing).
2. **Course** second. It is the one that actually moves the deposit line, and it is the surface
   a member with no capital placed can still use.
3. **Echelon** third. It serves members who already have size, and it is mostly the execution
   path for a planner that is already built.

If the founder wants the deposit line to move before anything else, invert 1 and 2. Relay's
ledger correction still ships first, because Course cannot project standing correctly without it.

---

# Precondition: three corrections to `src/domain/ledger.ts`

All three features share these. They are small, purely additive, and every existing log replays
to the same numbers except where noted. Build them once, before feature work.

## P1. Atomic multi event writes

`append()` writes the whole array and emits per call. Every feature below needs two to five
events to land together or not at all.

```ts
export function newId(): string;                       // export the existing private helper
export type NewEvent = DistributiveOmit<LedgerEvent, "id" | "at"> & {
  at?: number;
  id?: string;                                          // caller may mint the id
};
export function appendMany(events: NewEvent[]): LedgerEvent[];  // one saveEvents, one emit
```

Callers mint ids with `newId()` so an event in the batch can reference another event in the same
batch. Nothing else changes.

## P2. The `fund` event, which fixes a live double count

Today `open` never debits `available`:

```ts
available = max(0, rewardsClaimed + returnedPrincipal - withdrawn)
```

That is correct while every position is funded by an external transfer, which is what the Desk
flow does. It is wrong the moment capital already inside the account is placed again, and the
product already does that: `src/routes/app/vault-detail.tsx` (`onRoll`, around line 108) claims,
closes, and navigates to `vaults/new?amount=principal+accrued`.

Worked, on $1,000 held one full term and rolled today:

| Figure | Today | Truth |
| --- | --- | --- |
| available | 300 claimed + 1,000 returned = **1,300** | 0 |
| deployed | 1,300 | 1,300 |
| portfolioValue | 1,300 + 0 + 1,300 = **2,600** | 1,300 |
| contributed | 1,000 + 1,300 = **2,300** | 1,000 |

The member has $1,300 and the product shows $2,600. Roll a second time and standing crosses
Vector on $1,000 of real money.

New event kind:

```ts
| { id: string; kind: "fund"; at: number; amount: number; positionId: string }
```

Meaning: `amount` of available cash was applied to the position with this id. Written in the same
batch as the `open` it funds. Derivation changes, three lines:

```ts
const funded = events.filter(e => e.kind === "fund").reduce((s, f) => s + f.amount, 0);
const available   = Math.max(0, rewardsClaimed + returnedPrincipal - withdrawn - funded);
const contributed = opens.reduce((s, o) => s + o.amount, 0) - funded;   // external capital only
```

New `Snapshot` field: `funded: number`. Write time invariants, enforced by the caller, not by
`derive`: a `fund` amount never exceeds `available` at that instant and never exceeds the
`open.amount` it references. Logs with no `fund` events replay bit identically.

## P3. Standing basis, so compounding still climbs the ladder

With P2, `contributed` becomes external capital only, so a member who turns $1,000 into $4,826
by rolling would sit at Signal forever. That is the wrong answer operationally: a $4,826 position
is a larger relationship than a $1,000 one.

```ts
// The most principal ever at work in started, unclosed positions at one instant.
peakDeployed: number;
standingBasis: number;   // Math.max(contributed, peakDeployed)
```

`peakDeployed` is a replay, not a stored figure: build deltas `{t: open.at, d: +amount}` and
`{t: close.at, d: -principal}`, drop anything with `t > now`, sort ascending by `t` with
decreases first on a tie, running sum, take the maximum. `tier`, `tierProgress` and `toNextTier`
move from `contributed` onto `standingBasis`. Neither input can be inflated by moving money
around: opening and closing the same $1,000 repeatedly never exceeds a peak of $1,000.

## P4. A position can start later than it was recorded

`open.at` is already the term start, and `accruedAt` already clamps elapsed days at 0, so a future
dated `open` accrues nothing until its date arrives. Two additions make that legible:

```ts
// Position
started: boolean;        // now >= openedAt

// Snapshot
deployed:  number;       // sum of active principal where started        (CHANGED)
scheduled: number;       // sum of active principal where !started       (NEW)
portfolioValue = deployed + scheduled + rewardsPending + available;      // unchanged total
```

Closing an unstarted position already behaves correctly: `closedAt < openedAt` clamps elapsed
days to 0, so principal returns and nothing is paid.

---

# 1. Relay

**Ranked first.**

## Name

A relay is the part of an instrument that closes a circuit when a condition is met, and it is the
formation where one leg hands to the next without stopping. Both readings are exactly the
feature: at maturity, one term hands itself to the next. It names the job, it is one word, and it
collides with nothing in `docs/NAMING.md`.

## The one sentence pitch

Arm a relay on a vault and, at maturity, its principal and its reward carry straight into a new
thirty day term instead of sitting still.

## The problem it solves

For the member: accrual stops dead at day 30. A matured position that has not been settled earns
nothing, and the member has to notice, decide, and perform three actions to keep the capital
working. `src/domain/insights.ts` already ranks this the single most urgent thing in the product,
above onboarding, at priority 100. Relay turns a recurring chore into a decision made once.

For the business: it is the retention primitive. Every day between maturity and a manual roll is
a day the capital is a withdrawal candidate. It also fixes a real defect on the way in: the
current roll path double counts portfolio value, which means the product is currently overstating
the balance of exactly the members it most wants to keep.

Honest limit: Relay does not bring in a dollar of new capital. It only keeps what is already
there deployed.

## How it works

**Vault detail (`/app/vaults/:id`).** Under the existing actions, a panel titled *Relay*. It
states the arithmetic for one term only, using this position's real figures. On a $1,000 Signal
position: "At maturity this carries $1,300 into a new thirty day term. That term accrues $13.00 a
day and releases $1,690 on 26 October." Two modes as radio options:

- *Carry principal and reward* (default). Everything goes back to work.
- *Carry principal only*. The reward is claimed to available cash and the principal alone
  reopens. The panel shows both figures side by side so the choice is a number, not a word.

A single button, `btn btn-primary`: **Arm relay**. Once armed, the panel becomes a status block
with a `Status kind="active"` chip, the date it fires, and a `btn btn-ghost` **Disarm**.

**First arm, one time.** An inline confirmation, not a modal: "A relay writes to your ledger
without asking again. It fires the next time you open Rigel after this term matures, never
before, and never backdated. You can close the new position immediately if you change your mind."

**Firing.** A `useRelays()` hook mounted once in `src/components/shell/AppShell.tsx`. On every
ledger tick it checks `snap.relaysDue`. For each due relay it writes one batch and raises one
`sonner` toast: "Signal vault rolled. $1,300 carried into a term maturing 26 October." No undo,
because the log is append only. The escape hatch is that the new position can be closed at once,
which returns principal and pays nothing.

**Vaults list (`/app/vaults`).** An armed position carries a small relay glyph beside its status
chip, so the list answers "which of these look after themselves" at a glance.

**Home and Desk.** When `snap.relaysDue.length > 0` and the hook has not yet fired (a member who
turned automatic firing off in Settings), a band offering **Fire now**.

## The domain model

New event kinds:

```ts
| { id: string; kind: "relay.set";   at: number; positionId: string; mode: "full" | "principal" }
| { id: string; kind: "relay.clear"; at: number; positionId: string }
```

Last event per `positionId` wins, so arming, changing mode and disarming are all the same
mechanism and the history stays readable in Ledger.

New derived type and `Snapshot` fields:

```ts
export type Relay = {
  positionId: string;
  mode: "full" | "principal";
  setAt: number;
  armed: boolean;        // latest event for this id is relay.set AND !position.closed
  firesAt: number;       // position.maturesAt
  due: boolean;          // armed && position.matured && !position.closed
  carries: number;       // mode === "full" ? principal + claimable : principal
  overdueDays: number;   // due ? (now - maturesAt) / DAY_MS : 0
  forgoneDaily: number;  // due ? carries * DAILY_RATE : 0
};

// Snapshot
relays: Relay[];
relaysArmed: Relay[];
relaysDue: Relay[];
relayCarry: number;      // sum of carries across relaysDue
relayForgoneDaily: number;
```

`carries` uses `claimable`, not `principal * CYCLE_RETURN`. A member who claimed mid term carries
principal plus what is left, and the panel says so.

The fire batch, for one due relay on position `p`, all through `appendMany` so it is all or
nothing:

```ts
const nextId = newId();
const carry  = p.claimable > 0 && mode === "full" ? p.principal + p.claimable : p.principal;
appendMany([
  ...(mode === "full" && p.claimable >= 0.01
    ? [{ kind: "claim", positionId: p.id, amount: p.claimable }] : []),
  { kind: "close", positionId: p.id },
  { id: nextId, kind: "open", amount: carry,
    tierId: (tierForAmount(carry) ?? p.tier).id, asset: p.asset, network: p.network },
  { kind: "fund", amount: carry, positionId: nextId },
  { kind: "relay.set", positionId: nextId, mode },     // the chain continues
]);
```

Every `at` is `Date.now()`. **Never `p.maturesAt`.** Backdating would fabricate accrual.

Verification, $1,000 at the end of term two, using P2 and P3:

- rewardsAccrued = 300 + 390 = 690, rewardsClaimed = 300, rewardsPending = 390
- deployed = 1,300, funded = 1,300, available = 300 + 1,000 - 0 - 1,300 = 0
- portfolioValue = 1,300 + 0 + 390 + 0 = 1,690, contributed = 2,300 - 1,300 = 1,000
- netGain = 690, returnPct = 0.69, and 1.30 x 1.30 = 1.69. The ledger and the arithmetic agree.

## The surfaces

- **No side navigation row.** A relay is a property of a position, not a place. A member with no
  positions would land on an empty page, and the nav is already seventeen rows. It lives on
  `/app/vaults/:id`, on `/app/vaults`, on Home and Desk when something is due, and in Insight.
- `src/routes/app/vault-detail.tsx`: the Relay panel replaces the current one shot **Roll into a
  new term** button, which becomes **Roll now** beside **Arm relay** and writes the `fund` event.
- `src/routes/app/vaults.tsx`: relay glyph in the row, and a rail stat "Armed: 3".
- `src/routes/app/home.tsx`: one entry in the `sections: ArrangeItem[]` array, key `"relay"`.
- `src/domain/insights.ts`: a `relay-fired` milestone after a fire, and the existing `matured`
  rule's action changes to "Arm a relay" when no relay is set on that position.

## The frontend

Grammar: a `.panel edge-light` inside vault detail, with the two modes as a two cell
`grid grid-cols-1 sm:grid-cols-2 gap-2` of bordered radio buttons in the pattern already used by
the asset picker in `src/routes/app/desk.tsx`. The one term arithmetic sits in a `.ledger` of
three `.rail-row`s: Carries, Accrues per day, Releases on. Classes: `.panel`, `.edge-light`,
`.eyebrow`, `.tag-micro`, `.figure-mid` for the carry figure, `.metric`, `.tabular`, `.chip`,
`.chip-accent`, `.chip-warn` for an overdue relay, `.btn btn-primary`, `.btn btn-ghost`, plus
`Status` and `Value` from `src/components/system`.

Motion: the arm transition is the existing rise, `initial {opacity:0,y:8}` to `{opacity:1,y:0}`,
`0.4s`, ease `[0.22,1,0.36,1]`. The fire is the only new motion: the closing position's row
crossfades to the new one over `0.5s` with a `layoutId` on the row so the capsule travels, the
same technique as the sidebar rail in `src/components/shell/Sidebar.tsx`
(`spring, stiffness 440, damping 36`). All of it behind `useReducedMotion()`, which collapses it
to an instant swap.

At 360px: the two mode cells stack to one column, each `min-h-[44px]`. The three `.rail-row`s are
already single column with a 56px floor. The carry figure uses `.figure-mid`
(`clamp(1.5rem, 5vw, 2.25rem)`), which is 24px at 360 and does not wrap. The toast is the existing
`Toaster` at `top-center`. No horizontal scroll anywhere on this feature.

## The backend

**None.** Every input is in the log and every output is derived. A server would only add firing
while the app is closed, which needs member accounts and a scheduler this product does not have,
and a reminder, which needs an identity and a channel it does not have either.

## The honesty test

The most misleading thing Relay could imply is that thirty percent compounds. Six armed terms
turn $1,000 into $4,826.81 (1.30^6 = 4.826809) and twelve turn it into $23,298.09
(1.30^12 = 23.2980851), which is an annualised gain above two thousand percent.
`src/routes/legal/risk.tsx` already names that magnitude as a warning, not a feature.

What prevents it:

1. **The Relay panel shows one term ahead and no further.** No forward curve, no series, no
   projected balance. The figures are: what this carries, what that one term accrues per day, what
   it releases, on what date.
2. The compounding series exists in exactly one place, a collapsed disclosure titled *What
   repeating a term actually means*, closed by default, whose body is fixed copy: "Six consecutive
   terms turn $1,000 into $4,826.81. That is an annualised rate above two thousand percent. No
   established market produces that, the figure describes arithmetic rather than a forecast, and
   it assumes every term completes and settles, which is the assumption that can fail." It links
   to `/legal/risk`.
3. A second implication to kill: that the relay runs while you are away. Fixed copy on every armed
   relay: "A relay fires the next time you open Rigel after the term matures. It is never
   backdated. On a $1,300 carry, five days between maturity and your next visit is $65 that did
   not accrue." Both figures derived from `carries * DAILY_RATE`.

## Effort

**Small to medium.** Build order:

1. P1 and P2 and P3 in `src/domain/ledger.ts`, checked against a hand written event log.
2. `relay.set` / `relay.clear`, the `Relay` type, the four `Snapshot` fields.
3. The Relay panel on vault detail, arm and disarm only, no firing.
4. The fire batch plus the `useRelays()` hook and the toast.
5. The vaults list glyph, the Home band, the Insight rules.

Usable slice: 1 through 4. A member can arm a relay and it rolls itself.

---

# 2. Course

## Name

A course is a heading you set once and hold, and holding one against drift is the whole point of
the navigation instruments this product is named after. It names the job, not the control. It is
not "recurring deposits", which describes a widget, and it is not Cadence, which is already the
consecutive day counter.

## The one sentence pitch

Set an amount and a rhythm, and Course lays out every placement between here and the rung you are
aiming at, with the date each one is due.

## The problem it solves

For the member: the ladder is a lump sum problem. Sovereign is $10,000 and there is no path
through the product that turns that into a plan. Meanwhile the only prompt to place more capital
is `Redeploy`, which fires reactively when cash is already sitting idle. Course inverts it: the
decision is made once, in advance, and the product then shows the schedule and the dates.

For the business: this is the deposit line. A member who sets a course of $400 every seven days
has declared an intention to place $10,000 across 168 days, and every leg is a funded event with
a date on it. It also gives the product a legitimate reason to be opened on a weekday, which
nothing else currently provides.

Honest limit: Rigel cannot take the money. There is no mandate, no server, no scheduler. A Course
is a schedule the member fills by hand, and the design leans into that rather than hiding it.

## How it works

**`/app/course/new`.** Four fields, all with live consequences.

1. *Amount per leg.* Minimum $400, because that is `TIERS[0].entry` and the smallest position the
   product can open. The field says so when a lower amount is typed.
2. *Interval.* A segmented control of 7 / 14 / 30 days, plus a custom integer 1 to 90.
3. *Length.* Number of legs, or open ended.
4. *Asset and network.* The same asset grid used on the Desk.

A live preview panel updates on every keystroke: the placement rate, the maturity of the first
leg, and the standing ladder. On $400 every 7 days:

- Each leg is its own thirty day term at 1% a day: $4.00 a day, $120 in rewards, releases $520.
- At least $1,600 enters terms in any thirty day stretch, because `floor(30 / 7) = 4` legs.
- The standing ladder, derived, one row per rung above current standing:

| Rung | Cumulative | Leg | Due |
| --- | --- | --- | --- |
| Signal, 48h | $1,200 | 3 | day 14 |
| Vector, 36h | $3,200 | 8 | day 49 |
| Apex, 24h | $5,200 | 13 | day 84 |
| Meridian, 12h | $8,000 | 20 | day 133 |
| Sovereign, 6h | $10,000 | 25 | day 168 |

**`/app/course`.** The index.

- Lede: the lead figure is the placement rate, "$1,600 every 30 days". The rail carries next leg
  due, legs placed, total placed.
- Band *Schedule*: a `.ledger` of legs. Each row shows leg number, amount, due date and a state
  chip. Four states: **Filled** (`chip-gain`), **Due** (`chip-warn`, with a **Place** button),
  **Scheduled** (`chip`), **Lapsed** (`chip` muted, `rail-row-mute`).
- Band *Standing*: the ladder table above, drawn from the member's real `standingBasis`.
- Band *What one leg does*: the per leg term arithmetic, so the rate is visible on the page where
  the commitment is made.

**Filling a leg.** A **Place** button on a due row routes to
`/app/vaults/new?amount=400&course=<courseId>&leg=<index>`. That flow already works. It commits
with `appendMany([open, course.fill])`, plus a `fund` event when the member pays from available
cash rather than a new transfer. Nothing about the deposit path changes.

**A missed leg.** Once the next leg comes due, an unfilled leg becomes **Lapsed** and stays on the
schedule, struck through. It is not silently rolled forward and it is not deleted. The ladder
recomputes without it, so the Sovereign date moves and the member can see that it moved.

## The domain model

New event kinds:

```ts
| { id: string; kind: "course.set";  at: number; courseId: string; amount: number;
    everyDays: number; legs: number; startAt: number; asset: string; network: string }
| { id: string; kind: "course.stop"; at: number; courseId: string }
| { id: string; kind: "course.fill"; at: number; courseId: string; leg: number; positionId: string }
```

`course.set` on an existing `courseId` supersedes the previous one, last write wins, so an edit is
recorded rather than applied. `legs: 0` means open ended. Write time validation: `amount >= 400`,
`everyDays` an integer in [1, 90], `legs` 0 or 1 to 104.

New derived types and `Snapshot` fields:

```ts
export type CourseLegState = "filled" | "due" | "scheduled" | "lapsed";

export type CourseLeg = {
  index: number;          // 0 based
  dueAt: number;
  amount: number;
  state: CourseLegState;
  positionId?: string;
  filledAt?: number;
};

export type CourseRung = { tier: Tier; onLeg: number; reachedAt: number; cumulative: number };

export type Course = {
  id: string; amount: number; everyDays: number; legsPlanned: number;
  asset: string; network: string; startAt: number; setAt: number;
  stoppedAt: number | null; active: boolean;
  legs: CourseLeg[];
  due: CourseLeg[]; nextDueAt: number | null;
  placed: number; placedCount: number; lapsedCount: number;
  outstanding: number;    // legsPlanned > 0 ? amount * (legsPlanned - placedCount - lapsedCount) : 0
  legsPerTerm: number;    // Math.floor(CYCLE_DAYS / everyDays)
  perTerm: number;        // amount * legsPerTerm
  ladder: CourseRung[];
};

// Snapshot
courses: Course[];
coursesActive: Course[];
courseDue: CourseLeg[];   // every due leg across active courses, sorted by dueAt
courseDueTotal: number;
```

Formulas, exactly:

- `dueAt(k) = startAt + k * everyDays * DAY_MS`.
- Legs materialised: `legsPlanned > 0 ? legsPlanned : (elapsedLegs + 8)` where
  `elapsedLegs = max(0, ceil((now - startAt) / (everyDays * DAY_MS)))`. Bounded, so an open ended
  course never builds an unbounded array.
- `state(k)`: **filled** if a `course.fill` exists for `(courseId, k)`. Otherwise if
  `stoppedAt !== null && dueAt(k) >= stoppedAt`, the leg is dropped and not rendered. Otherwise
  **scheduled** if `dueAt(k) > now`. Otherwise **due** if `now - dueAt(k) <= everyDays * DAY_MS`.
  Otherwise **lapsed**.
- `ladder`: start `running = snap.standingBasis`. Walk legs in index order, skipping lapsed. After
  each leg, `running += amount`. For each tier with `rank > snap.tier.rank`, the first leg at
  which `running >= tier.entry` yields `{tier, onLeg: k, reachedAt: dueAt(k), cumulative: running}`.
  Rungs never reached inside the materialised window are omitted rather than extrapolated.

**Course credits nothing.** The ladder is a projection of when capital placed reaches a rung, not
a grant of standing against a promise. Credited forward standing was considered and rejected: it
would make standing fall when a course lapses, which contradicts the existing rule that standing
is measured on what has actually been contributed, and it would commit the desk to a settlement
target bought with an intention rather than with capital.

## The surfaces

- **Yes, a side navigation row**, in the Capital group, immediately after Vaults:
  `{ to: "/app/course", label: "Course", icon: Repeat }`. It earns it on three grounds. It is the
  only one of these three that exists when the member has zero positions, so it is the onboarding
  surface. It must be reachable when nothing is due, which rules out living inside a prompt. And a
  lapsed leg has to have somewhere to be seen. To pay for the row, drop Atlas from the sidebar: it
  already has a Cmd/Ctrl+K launcher, so its nav row is the one genuinely redundant line in
  `src/components/shell/nav.ts`.
- Routes: `/app/course` and `/app/course/new`. Mobile tabs unchanged.
- `src/routes/app/home.tsx`: an `ArrangeItem` with key `"course"` showing the next due leg and
  the next rung with its date.
- `src/routes/app/desk.tsx`: due legs appear in the standing instructions panel described in the
  recommendations, next to Fund and Withdraw.
- `src/routes/app/vault-new.tsx`: reads `?course=` and `?leg=` and shows a chip "Leg 3 of your
  course" above the amount field, with the amount prefilled and the field still editable.

## The frontend

Grammar: `.lede` with `.lede-rail`, then three `.band` sections, which is exactly the pattern in
`src/routes/app/vaults.tsx` and `src/routes/app/rewards.tsx`. The schedule is `.ledger` and
`.rail-row`, never a table, so it reads as a ledger column rather than a tray of cards. Classes:
`.figure-lead` for the placement rate, `.rail-stat` and `.tag-micro` in the rail, `.band-head`,
`.band-title`, `.hairline`, `.chip`, `.chip-gain`, `.chip-warn`, `.rail-row-gain` for filled legs,
`.rail-row-mute` for lapsed, `.btn btn-primary` on Place, `Empty` for the no course state,
`Progress` for legs placed against legs planned.

The new form control is the interval segmented control. Build it as
`grid grid-cols-3 gap-2` of `aria-pressed` buttons with the accent border treatment already used
for asset selection in `src/routes/app/desk.tsx` and for parts selection in
`src/routes/app/horizon.tsx`. Do not introduce a new visual for it.

Motion: the standard staggered rise, `delay: i * 0.06`, `duration 0.45`, ease `[0.22,1,0.36,1]`.
One addition: when a leg moves from Due to Filled, animate that row's rail from `--accent` to
`--gain` over `0.4s` and let the state chip crossfade. `Progress` already animates its width over
`0.9s`. Everything gated by `useReducedMotion()`.

At 360px: `.lede` is one column, so the placement rate sits above the rail and the rail's
`border-top` hairline separates them, which is what `.lede-rail` already does below `lg`. The
ladder table is the only wide element: below `sm` it renders as stacked `.inset` blocks, one per
rung, rather than a table in a scroll container. Leg rows keep the 56px `.rail-row` floor and the
Place button is `min-h-[44px]`. `.figure-lead` is `clamp(2rem, 9vw, 4.5rem)`, so 32px at 360.

## The backend

**None.** Everything is a pure function of the event log, the tier constants and the clock. A
server would only add a reminder on the day a leg is due, which needs a member identity and a
delivery channel the product does not have. Note the shape it would take when it does:
`api/feed/publish.ts` already demonstrates a single daily run, and a reminder would sit beside it.

## The honesty test

The most misleading thing Course could imply is that it is a direct debit, that Rigel will take
the money on schedule. It cannot, it has no mandate and no server, and a member who believed
otherwise would find lapsed legs and a slipped Sovereign date.

What prevents it:

1. The words "automatic", "auto invest", "recurring payment" and "subscription" never appear on
   this surface. The verb is **Place**, and it is on a button the member presses.
2. A fixed line under the schedule, always visible: "Rigel does not move money for you. A course
   is your own schedule. Every leg is placed when you place it, and a leg that passes unplaced is
   marked lapsed rather than carried forward."
3. The `lapsed` state is real, rendered, and permanent on the row. A schedule that quietly
   reflowed around missed legs would be the lie. This one visibly slips.

Second implication, smaller: the ladder table could read as a wealth forecast. It only ever names
tiers, dates and cumulative contribution. It never names a projected portfolio value.

## Effort

**Medium.** Build order:

1. The three event kinds, the `Course` and `CourseLeg` types, `derive` extensions. Testable
   against a hand written log with no UI at all.
2. `/app/course` read only, against a course seeded by hand.
3. `/app/course/new` with the live preview.
4. The `?course=&leg=` handoff in `src/routes/app/vault-new.tsx`.
5. Home, Desk and Insight surfacing.

Usable slice: 1, 2 and 4. A member can see a schedule and fill a leg, with the course created by
a temporary form.

---

# 3. Echelon

## Name

An echelon is a formation in which each element is set back from the one ahead by a fixed
interval, which is precisely what a staggered set of maturities looks like on Horizon. One word,
a formation rather than a control, and it gives the product a single name for a concept it
currently calls "Laddering" in `src/routes/app/horizon.tsx` while `Ladder` already means the tier
progression in `src/features/ladder/`.

## The one sentence pitch

Place one sum as several terms that start days apart, so capital comes back in tranches on
separate dates instead of all at once.

## The problem it solves

For the member: a single $3,000 placement returns $3,900 on one day and nothing on any other day.
A member who wants capital arriving on a schedule has to open positions by hand, days apart,
remembering each time. The planner for this is already written and already on screen, at the
bottom of Horizon, and it ends in a paragraph instead of a button.

For the business: it is the primitive that makes larger placements comfortable. A member hesitant
to commit $3,000 to a single date will commit it to six. It also produces six positions instead of
one, each of which can carry its own relay, which means one Echelon plus six relays is a
self sustaining rolling schedule.

Honest limit: an echelon earns exactly the same total and costs real accrual in the first term.
Both are stated below, in dollars.

## How it works

**Horizon (`/app/horizon`).** The existing Laddering panel is renamed Echelon and gains a
comparison and a commit. The controls that already exist (total, number of positions, the leg
`.ledger`) are unchanged. Two things are added.

A two column comparison, both readings side by side, on $3,000 in 6 legs of $500 five days apart:

| | One placement | Echelon |
| --- | --- | --- |
| Accrues per day, from day 0 | $30.00 | $5.00 rising to $30.00 |
| Rewards by day 30 | $900 | $525 |
| Total rewards | $900 | $900 |
| Fully earned on | day 30 | day 55 |
| Capital returns | $3,900 on one date | $650 on each of six dates |

The arithmetic: each $500 leg accrues $5.00 a day and returns $150 over its own thirty days, six
legs is $900, identical to $3,000 x 0.30. By day 30 the legs have run 30, 25, 20, 15, 10 and 5
days, which is 105 leg days at $5.00, so $525 against $900. The shortfall is $375 and the full
$900 arrives 25 days later, which is `(parts - 1) x spacingDays`.

Then a single `btn btn-primary`: **Place this echelon**, routing to
`/app/vaults/new?echelon=6&spacing=5&amount=3000`.

**Vault new (`/app/vaults/new`).** With `?echelon=`, the amount step shows the leg breakdown
instead of a single tier badge and the funding step asks for the whole total once. The commit
writes one batch. Leg 1 opens now, legs 2 to 6 are recorded with future `at` values.

**Vaults (`/app/vaults`).** The six legs group under one header row, "Echelon, 6 legs, $3,000",
which expands. Unstarted legs carry a `chip-warn` reading "Starts 14 Oct, not accruing". A member
can close an unstarted leg at any time and get the principal back with nothing paid, which
`derive` already handles correctly.

**Horizon calendar.** Six marks instead of one, which is the argument for the feature made
visually on a surface that already exists.

## The domain model

One new event kind:

```ts
| { id: string; kind: "echelon.open"; at: number; echelonId: string;
    total: number; parts: number; spacingDays: number; positionIds: string[] }
```

Written through `appendMany` in one batch with the `parts` `open` events it names, plus `parts`
`fund` events when the total came from available cash. Ids are minted with `newId()` before the
batch so `positionIds` can reference them.

Leg construction is the existing `stagger()` in `src/features/ladder/plan.ts`, unchanged in its
arithmetic: `base = floor(total / parts)`, the remainder carried by leg 1 so the legs sum to
exactly the total, `spacingDays = CYCLE_DAYS / parts`. One small extension: let `stagger` accept
an explicit `spacingDays` so the member can choose 3 days instead of 5, defaulting to the current
`CYCLE_DAYS / parts`. Leg k opens at `from + round((k - 1) * spacingDays * DAY_MS)`.

New derived type and `Snapshot` field:

```ts
export type Echelon = {
  id: string; placedAt: number; total: number; parts: number; spacingDays: number;
  legs: Position[];        // in start order
  started: Position[];
  pending: Position[];     // !started
  nextStartsAt: number | null;
  firstMaturesAt: number;
  lastMaturesAt: number;
  reward: number;                 // total * CYCLE_RETURN
  releasePerLeg: number[];        // leg.principal * (1 + CYCLE_RETURN)
  accruedByLumpMaturity: number;  // the cost, derived
  lumpRewardAtMaturity: number;   // total * CYCLE_RETURN
  lagDays: number;                // (parts - 1) * spacingDays
};

// Snapshot
echelons: Echelon[];
// plus `scheduled` and Position.started from P4
```

```ts
accruedByLumpMaturity = legs.reduce((s, l) =>
  s + l.principal * DAILY_RATE *
      clamp((placedAt + CYCLE_DAYS * DAY_MS - l.openedAt) / DAY_MS, 0, CYCLE_DAYS), 0);
```

Standing is unaffected: `contributed` counts the full $3,000 whether it is one `open` or six, so an
echelon never costs a member a rung. Worth saying on the surface, because it is the first question
a member will ask.

## The surfaces

- **No side navigation row.** An echelon is a way of opening a vault, not a place to go back to.
  Its planner belongs on Horizon, where the maturity calendar it reshapes already lives, and its
  commit belongs in the placement flow. A nav row would be a dead end for any member without cash
  to place, and the nav is already seventeen rows.
- `src/routes/app/horizon.tsx`: rename the `Laddering` band to `Echelon`, add the comparison
  table and the commit button.
- `src/routes/app/vault-new.tsx`: a second mode driven by `?echelon=` and `?spacing=`.
- `src/routes/app/vaults.tsx`: grouping, and the unstarted chip.
- `src/routes/app/home.tsx`: `Scheduled` joins `Deployed` in the lede rail whenever
  `snap.scheduled > 0`. Never summed into Deployed.

## The frontend

Grammar: reuse the panel that is already there. The comparison is a `.bento` of two
`.bento-cell .inset` blocks at `lg:col-span-6` each, one per reading, with the single placement's
day 30 figure in `.figure-mid` and deliberately larger than the echelon's, because the honest
presentation puts the cost first. The leg list is the existing `.ledger`. The unstarted state uses
`.chip-warn` and `.rail-row-mute`. Classes: `.band`, `.band-head`, `.band-title`, `.hairline`,
`.inset`, `.bento`, `.bento-cell`, `.figure-mid`, `.metric`, `.tabular`, `.tag-micro`,
`.btn btn-primary`, `Status`, `Metric`.

Motion: when the member changes the number of parts, the leg rows re render. Give each row a
`layoutId` of `echelon-leg-${step}` so rows travel rather than pop, `spring stiffness 440
damping 36`, matching the sidebar capsule. The comparison figures animate through `Value`, which
already eases and already respects reduced motion.

At 360px: `.bento` collapses to one column, so the two readings stack with the single placement on
top. Six leg rows at 56px each is 336px of scroll, acceptable. The parts selector is already a
`flex flex-wrap gap-2` of `min-w-[3rem] min-h-[40px]` buttons in
`src/routes/app/horizon.tsx`; raise that to `min-h-[44px]` while touching the file. The comparison
must never become a horizontally scrolling table on a phone.

## The backend

**None.** Future dated `open` events need no scheduler: `derive` reads them against the clock on
every tick, so a leg starts accruing the moment its date passes whether the app is open or not.
This is the one of the three features that genuinely works while nobody is looking.

## The honesty test

The most misleading thing Echelon could imply is that spreading a placement earns more or reduces
risk. It does neither. The total reward is identical, $900 either way, and every leg carries the
same operator risk as one placement of the same size, because it is the same operator.

What prevents it:

1. The comparison table is not optional and not collapsed. It renders above the commit button,
   both columns, with `Total rewards $900` on both rows so the identity is visible rather than
   asserted.
2. A fixed line beneath it, with derived figures: "The rate is the same on every leg. An echelon
   does not earn more and it does not reduce risk. It accrues $375 less by day 30 and reaches the
   same $900 twenty five days later. What it changes is when capital comes back."
3. Second implication: scheduled capital reading as deployed capital. `scheduled` is a separate
   `Snapshot` field, shown in its own tile, never added into Deployed, and every unstarted leg
   carries "Starts 14 Oct, not accruing" in place.

## Effort

**Medium.** Build order:

1. P4 in `src/domain/ledger.ts`: `Position.started`, `Snapshot.scheduled`, `deployed` excluding
   unstarted principal. This is the piece with the widest blast radius, so it ships alone.
2. `echelon.open`, the `Echelon` type, the `spacingDays` argument on `stagger()`.
3. The comparison table and the commit button on Horizon.
4. The `?echelon=` mode in vault new, writing the batch.
5. Grouping on the vaults list, the unstarted chip everywhere a position renders.

Usable slice: 1, 2 and 4. The planner on Horizon can link straight to a prefilled vault new.

---

# Recommendations to make the whole thing flow

Twelve specific changes, in the order I would make them. Every one names the file.

1. **`src/domain/ledger.ts`: land P1 to P4 as one change, before any feature work.**
   `appendMany`, exported `newId`, the `fund` event, `peakDeployed` and `standingBasis`,
   `Position.started`, `Snapshot.scheduled`. Six of the new event kinds and all three features
   depend on them, and P2 fixes a portfolio figure that is currently overstated by the amount of
   every roll.

2. **`src/routes/app/vault-detail.tsx`: make `onRoll` write the `fund` event, in the same change.**
   Lines 108 to 113 currently claim, close and navigate with the carried amount on the query
   string. That is the exact path that produces the double count. Convert it to a single
   `appendMany` batch, and put **Arm relay** beside **Roll now** so the manual path and the
   standing instruction sit together.

3. **`src/components/shell/nav.ts`: add Course to Capital, drop Atlas from Account.**
   `{ to: "/app/course", label: "Course", icon: Repeat }` after Vaults. Remove the Atlas row: it
   already has a Cmd/Ctrl+K launcher, so the row is the one line in a seventeen row nav that costs
   something and returns nothing. Leave `MOBILE_TABS` alone at four.

4. **`src/domain/insights.ts`: three new rules and one edit, with weights in the existing `P` block.**
   `relay-due` at 96, just under `matured` at 100, body naming `relayCarry` and
   `relayForgoneDaily`. `course-leg-due` at 90, above `maturing` at 88, because a leg has a date
   and a maturity has a countdown. `course-lapsed` at 84. And change the existing `matured` rule's
   action from "Review positions" to "Arm a relay" when the position has no relay set. This is the
   file that decides what interrupts a member, so all three features must be represented in it or
   they will only be found by browsing.

5. **`src/routes/app/desk.tsx`: a third panel beside Fund and Withdraw, titled *Standing*.**
   It lists every due course leg and every due relay as `.rail-row`s with a single action each,
   and renders nothing when both are empty. The Desk is documented as "where a member acts", and
   right now the only two acts it offers are funding and withdrawing.

6. **`src/routes/app/home.tsx`: two new `ArrangeItem`s and one rail stat.**
   Keys `"course"` and `"relay"` in the `sections` array, so the member can order or bury them
   with `Arrange`. Add `Scheduled` to the lede rail, rendered only when `snap.scheduled > 0`, and
   never summed into `Deployed`.

7. **`src/routes/app/activity.tsx`: extend `describe()` with the six new event kinds and add an
   Instructions filter.** `course.set`, `course.stop`, `course.fill`, `relay.set`, `relay.clear`,
   `echelon.open`, `fund`. Ledger is the surface that proves nothing is invented, so an event kind
   it cannot render is a hole in that argument. A relay fire should read as five consecutive rows
   with the same timestamp, which is the honest picture of what happened.

8. **`src/features/explain/definitions.ts`: five new `FigureId`s with full Provenance.**
   `scheduled`, `standingBasis`, `carry`, `perTerm`, `lag`. The rule in that file's header is that
   every figure on screen traces to arithmetic a member can read, and these five are the new
   figures. `standingBasis` matters most, because P3 changes what tier standing is measured on and
   that change must be explainable in one screen.

9. **`src/routes/app/horizon.tsx`: rename Laddering to Echelon and let the planner commit.**
   The band heading, the copy, and a `btn btn-primary` at the foot of the leg `.ledger`. Also
   extend the calendar to mark scheduled starts, not only maturities, so a placed echelon is
   visible on the calendar before its legs begin. While in the file, raise the parts selector
   buttons from `min-h-[40px]` to `min-h-[44px]`.

10. **`src/domain/schedule.ts`: three writers in the `WRITERS` array.**
    One per instrument, built from `CYCLE_DAYS`, `DAILY_RATE`, `CYCLE_RETURN` and `TIERS` like
    every existing writer, so Signal explains the new instruments the day they ship and the copy
    cannot drift from the constants. The Relay writer must carry the "does not fire while the app
    is closed" sentence, and the Echelon writer must carry "identical total, different dates".

11. **`src/features/atlas/catalog.ts`: index the new surface and the three new actions.**
    Surface `/app/course`, actions "Set a course", "Arm a relay", "Place an echelon", plus the
    glossary terms behind them. Atlas is losing its nav row in item 3, so its coverage has to be
    complete for Cmd/Ctrl+K to be the way in.

12. **`src/components/system/ui.tsx`: two new `Status` kinds, and one perf note.**
    Add `scheduled` (`chip`, "Scheduled") and `lapsed` (`""`, "Lapsed") to the `STATUS` map, so leg
    and leg start states use the same badge as everything else rather than a bespoke chip.
    Separately: `valueSeries` in `src/domain/ledger.ts` calls `derive` up to 90 times, and P3 adds
    an O(n log n) sort to each call. One armed relay chain writes five events per term, so a
    year of rolling is 60 events. Fine today, worth hoisting the `peakDeployed` replay out of the
    per point loop before an account carries a few hundred events.

## One decision only the founder can make

P3 changes what tier standing is measured on, from lifetime contribution alone to the greater of
lifetime contribution and peak deployed capital. Under the current code, rolling a position
inflates standing because the redeployed amount is counted as a fresh contribution, which is the
same defect as the portfolio double count. Fixing the defect without P3 means a member who
compounds $1,000 into $4,826 stays at Signal. P3 says the ladder should measure the largest
relationship the member has actually had at work, which is honest, derived, and not inflatable.
It is still a change to a published rule, so it belongs in Signal and in
`src/routes/app/tiers.tsx` on the day it ships, not in a changelog.
