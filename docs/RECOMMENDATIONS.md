# Rigel: the complete recommendation list

## 1. What this is

Rigel today is a well built, honest, single player financial interface with a
wallet in front of it and no financial system behind it. Thirty five routes
render, the whole product derives every figure from one append only event log
held in the member's browser, the domain is covered by 503 assertions across
three suites that all pass, 74 tests cover the layer above it, the type checker
is clean on the app and the API, and the interface is the most carefully made
thing in any of the three repositories that led to it. It has a real design
system, real motion discipline, a real naming system, two AI surfaces with a
generated knowledge base, an export and import path for the member's own data,
a QR encoder written for it, a device lock derived properly, and a security page
that tells the truth about what it does not protect.

What it does not have is custody, settlement, an account server, an identity
that survives a cleared browser, or any mechanism by which a dollar could
actually arrive or leave. That gap was the central fact of the original audit
and it still is, but it changed shape on 26 August: the five deposit addresses
on screen are now real and a transfer to them is real, while nothing on the
platform observes the chain. It is no longer a gap between how finished the
interface looks and how little stands behind it. It is a gap between where a
member's money goes and what the product knows about it, and that is the one
thing on this page that cannot be closed by any amount of frontend work.

The list below is 145 recommendations in twelve categories. Every one has a
short identifier so it can be referred to in a commit or a conversation, a one
line title, two or three sentences on what to do and why, and one status tag.
`SHIPPED` means it exists in the codebase today and the file that proves it is
named. `BUILD NOW` means it should be done before anyone outside the team sees
the product. `SUPERSEDED` means the thing it asked for no longer has a subject,
because the product changed underneath it, and the reason is given. `BUILD LATER` means it is real work that is not urgent. `EXPERIMENT`
means it is worth trying but might be wrong. `REJECTED` means it was considered
and should not be built, with the reason given. Sections 3, 4 and 5 are the ones
to read if you only read part of this: section 3 ranks the ten biggest gaps,
section 4 checks parity against the two predecessor products, and section 5 lists
everything in the product that currently overstates what it can do. Section 5 is
the most important section in this document.

---

## 2. The list

### A. Core product and the economics

**A1. One rate across all six tiers, held in the domain layer.** `CYCLE_DAYS`,
`CYCLE_RETURN` and `DAILY_RATE` are defined once and every surface reads them, so
the landing page, the FAQ, Signal, the glossary and the vault form cannot
disagree about the rate. This is the single most valuable structural decision in
the product and nothing should be built that breaks it.
`SHIPPED`: `src/domain/tiers.ts`

**A2. Every figure derived from an append only event log.** `derive()` is a pure
function of the events plus the clock, so portfolio value, accrued rewards,
available cash, tier standing, term progress, the maturity calendar and the
performance charts all reconstruct from the same record. This is what lets the
product claim nothing is invented, and it is the reason a Provenance panel is
even possible.
`SHIPPED`: `src/domain/ledger.ts`

**A3. The roll double count is fixed.** An `open` now carries `fromAvailable`, so
capital re-placed from the account balance is debited from `available` and
excluded from `contributed`. Before this, $1,000 rolled once showed a portfolio
of $2,600 against a real $1,300, and rolling twice bought a tier on money
deposited once.
`SHIPPED`: `src/domain/ledger.ts` lines 489 to 492, proved by case 2 in
`src/domain/ledger.check.ts`

**A4. Tier standing measured on the greater of contribution and peak deployed.**
`standing = Math.max(contributed, peakDeployed)`, where `peakDeployed` is
replayed from open and close deltas rather than accumulated. Neither input can be
inflated by moving the same money in a circle, and a member who compounds still
climbs, which was the reason the old rule existed.
`SHIPPED`: `src/domain/ledger.ts` lines 494 to 513 and 574

**A5. Relay: a standing instruction that carries a matured term into the next.**
Arm once on a position and at maturity it claims, closes, reopens with the carry
and re-arms itself, all stamped at the moment it runs rather than at the maturity
date so no accrual is fabricated for days the capital sat still. It is the
retention primitive and it also removes the three step manual chore that a
matured position otherwise demands.
`SHIPPED`: `src/domain/ledger.ts` `fireRelay`, `src/features/relay/`

**A6. Atomic multi event writes.** `appendMany` persists a batch as one write and
one notification, which is what makes a relay firing (a claim, a close, an open
and a re-arm) impossible to leave half written. Every future instrument depends
on this existing.
`SHIPPED`: `src/domain/ledger.ts` lines 325 to 334

**A7. Close the double count that is still live on the ordinary deposit path.**
`Redeploy` links to `/app/vaults/new?amount=X` with no `from=` parameter, so
`vault-new.tsx` sets `fromAvailable: false` and the placement is recorded as
fresh external capital: available is not debited, contributed rises, and the
portfolio doubles. The product's own most prominent prompt to redeploy idle cash
therefore reproduces exactly the defect `ledger.check.ts` case 2 exists to
prevent.
`SHIPPED`: `Redeploy.tsx` now links with `source=balance`, and `vault-new.tsx` treats both a roll and an explicit balance source as `fromAvailable`.
`src/routes/app/vault-new.tsx` lines 44 to 49

**A8. Enforce, at write time, that a balance funded placement cannot exceed
available cash.** `derive` clamps `available` with `Math.max(0, ...)`, which hides
an overdraw rather than preventing one, and `vault-new.tsx` never reads the
snapshot at all, so `/app/vaults/new?amount=999999&from=x` opens a position
funded from a balance that does not exist. The invariant belongs at the call
site, because `derive` must stay a pure replay.
`SHIPPED`: `src/domain/ledger.ts`, `fundingShortfall` refuses at the write

**A9. Make the manual roll carry claimable, not accrued.** `onRoll` computes
`Math.round(p.principal + p.accrued)`, and `accrued` includes rewards the member
has already claimed and possibly withdrawn, so a mid term claim followed by a
withdrawal and then a roll carries more cash than exists. `fireRelay` already
does this correctly using `claimable`; the manual path should match it.
`SHIPPED`: `src/domain/ledger.ts`, `compoundPosition` carries `claimable`

**A10. Make the manual roll one atomic batch.** `onRoll` calls `claimRewards`,
then `closePosition`, then navigates with the amount on the query string, so the
open is a separate write on a different route that the member can abandon. That
leaves a settled position and no new one, which is the exact failure `appendMany`
was written to stop.
`SHIPPED`: `src/domain/ledger.ts`, `appendMany` writes the batch as one

**A11. Fix the Vector tier benefit line.** Vector has `settlementHours: 36` but
its benefits array says `"48h settlement"`, which is Signal's number. Any member
who compares the tier card against the tier detail page will find the product
contradicting itself about the one thing that actually differs between rungs.
`SHIPPED`: `src/domain/tiers.ts`, `settlementNote` derives it and `tiers.test.ts` keeps hour figures out of `benefits`

**A12. Make funding from the account balance a first class choice in the
placement flow.** Today the only way to express "use my balance" is the `from=`
query parameter that the roll button happens to set, which means every deliberate
redeployment is mis-recorded. The amount step should show available cash, offer
it as a funding source alongside the five assets, and skip the address panel when
it is chosen.
`SHIPPED`: `src/routes/app/vault-new.tsx`, `fromBalance`

**A13. Early settlement, with the accrual forfeit stated in dollars.** The FAQ
already describes an early exit handled as an exception that forfeits accrual on
the unfinished term, but the interface offers "Settle to cash" only once a
position has matured, so the described path does not exist. Either build it with
the forfeit shown as a real figure derived from the position, or remove the FAQ
answer.
`BUILD LATER`: `src/routes/app/vault-detail.tsx` lines 158 to 166,
`src/components/landing/Faq.tsx`

**A14. A non callable term that pays a premium rate.** Rejected: it creates a
second headline number, which destroys the single published rate the entire
landing page and tier ladder rest on, and this build has no custody with which to
enforce a lock up anyway.
`REJECTED`

**A15. Partial withdrawal from an open position.** Rejected: a term is defined as
a fixed principal over thirty days, and partial withdrawal would mean either
re-basing accrual mid term or paying on capital that has left, both of which
break the one arithmetic rule the whole product is built on.
`REJECTED`

**A16. Tier benefits that the product actually delivers.** Five of the six tiers
list benefits that do not exist: there is no gating anywhere in the codebase, so
"Performance analytics", "Reward projections", "Portfolio intelligence",
"Priority queue", "Multi-vault management", "Dedicated coverage", "Early vault
access" and "Private terms" are all either available to every member regardless
of rung or not built at all. Either gate something real or cut the strings back
to settlement speed, which is the only difference the product can honour.
`SHIPPED`: `src/domain/tiers.ts`, and `tiers.test.ts` fails on a benefit that names a rate or an hour

---

### B. Onboarding and first run

**B1. Sign up is four steps that change what the product does.** Identity,
approach, starting scale and a summary, where the approach changes what surfaces
lead with and never the rate, and each option states its own trade in place
rather than in a footnote. It is the best onboarding of the three products.
`SHIPPED`: `src/components/shell/Gate.tsx`

**B2. Handle availability is checked asynchronously, with suggestions.** Format
rules, a reserved list, a debounce, a sequence guard so a slow earlier request
cannot overwrite a newer answer, and suggested alternatives when a name is taken.
The async shape is deliberate: it is the one function that becomes a server call
unchanged.
`SHIPPED`: `src/domain/identity.ts`, `src/components/shell/Gate.tsx` lines 80 to 99

**B3. Orientation is a route, not a modal.** It can be linked to, left halfway,
returned to and reached from Settings, none of which works when first run content
is trapped in an overlay, and every figure on it is computed from the same
domain constants as the rest of the product.
`SHIPPED`: `src/routes/app/orientation.tsx`

**B4. First Light explains a term instead of promising a bonus.** The predecessor
promised a first deposit gift the ledger had no event for and could never pay.
This shows the ordinary arithmetic at the Core entry and disappears once anything
has been placed.
`SHIPPED`: `src/features/engagement/FirstLight.tsx`

**B5. The aperture reveal plays once per session before anything is readable.**
It gives the product an opening beat without becoming a thing the member has to
dismiss on every navigation.
`SHIPPED`: `src/features/onboarding/Aperture.tsx`

**B6. Say plainly that the handle check is local.** `checkUsername` waits 220ms
to simulate a network call and then checks a registry held in this browser, and
returns "That handle is already in use", which reads as a claim about a global
namespace. The comment in the file is honest; the copy on screen is not.
`SHIPPED`: `src/domain/identity.ts`

**B7. A returning member has no way back in.** `Gate` shows the four step sign up
whenever `member` is null, and `logout` releases the handle and clears the member
while leaving the ledger in place, so signing out and back in means retyping an
identity that is not connected to the record it belongs to. At minimum, offer to
restore the last handle this browser used.
`SHIPPED`: `src/features/profile/ledgerFile.ts`, export and import
`src/components/shell/Gate.tsx` line 126

**B8. The starting band prefills the placement form once, then clears itself.**
Stored in `sessionStorage` and removed on read, so it helps on the first visit
and never surprises anyone later.
`SHIPPED`: `src/components/shell/Gate.tsx` lines 117 to 123,
`src/routes/app/vault-new.tsx` lines 33 to 43

**B9. A demo ledger the member can load and wipe in one action.** An empty
account sees an empty Telemetry, an empty Horizon, an empty Insight and an empty
Trajectory, which is honest but means the four most impressive surfaces are
invisible until someone commits. A clearly labelled sample ledger, loadable and
erasable from Settings, would let the product show itself without inventing
anything.
`BUILD LATER`: `src/routes/app/settings/data.tsx`

**B10. Make the chosen approach visibly change Home.** Sign up says the approach
"changes what your surfaces lead with", and it is stored on the member and passed
to the assistants, but nothing on Home reads it. Either reorder the Home sections
by approach or stop claiming it does anything.
`BUILD LATER`: `src/domain/identity.ts`, `src/routes/app/home.tsx`

**B11. Collect an email address at sign up.** Rejected: there is no server to
send to, no verification, and no notification channel, so it would be collecting
personal data for a purpose that does not exist, which is exactly what the
privacy policy says the product does not do.
`REJECTED`

---

### C. Navigation, information architecture and wayfinding

**C1. A grouped sidebar with a single travelling capsule.** Four groups, seventeen
rows, a shared layout id so selection reads as one movement, and a collapse state
persisted per browser. It is legible at a glance and it does not fight the page.
`SHIPPED`: `src/components/shell/nav.ts`, `src/components/shell/Sidebar.tsx`

**C2. Mobile is four thumb tabs plus a sheet holding the full map.** Designed for
thumbs rather than as a shrunken sidebar, with the label animating in only on the
active tab so four tabs fit at 360px.
`SHIPPED`: `src/components/shell/MobileNav.tsx`

**C3. Atlas indexes the product behind Cmd+K.** Surfaces, tiers, actions,
glossary terms and every published Signal post, with the previous product's names
carried in keywords so someone typing "portfolio" still lands on Vaults.
`SHIPPED`: `src/features/atlas/catalog.ts`, `src/features/atlas/Palette.tsx`

**C4. Wayfinder gives contextual help without leaving the screen.** Answers are
assembled from the domain constants rather than written by hand, so the help text
cannot drift away from what a vault actually does.
`SHIPPED`: `src/features/utility/Wayfinder.tsx`

**C5. Four route headings still use the predecessor's names.** The sidebar says
Yield, Telemetry, Insight and Ledger; the pages themselves say "Rewards",
"Analytics", "Insights" and "Activity". A member who clicks Ledger and lands on a
page titled Activity has been told the naming system is decoration.
`SHIPPED`: `src/components/shell/nav.ts`
`insights.tsx` line 432, `activity.tsx` line 344

**C6. Atlas does not index four live routes.** `/app/horizon`, `/app/glossary`,
`/app/security` and `/app/atlas` itself have no entry, so Cmd+K cannot reach the
maturity calendar, the full figure reference or the security page. The module's
own header says it indexes "the surfaces a member can reach".
`SHIPPED`: `src/features/atlas/catalog.ts`

**C7. Relay is invisible outside the one page it lives on.** It shipped today and
appears nowhere in `schedule.ts` (so Signal will never mention it), nowhere in
`catalog.ts` (so Cmd+K cannot find "Arm a relay"), nowhere in `definitions.ts` or
the glossary, nowhere in `Wayfinder.tsx`, and nowhere in `insights.ts`. Five
surfaces exist specifically to make features findable and none of them knows it
exists.
`SHIPPED`: `src/domain/feed.ts` and `src/domain/insights.ts` both reach it
`src/features/explain/definitions.ts`, `src/features/utility/Wayfinder.tsx`,
`src/domain/insights.ts`. Course, which landed during this audit, needs the same
sweep and should be done in the same change.

**C8. Rename the Laddering panel to Echelon.** `src/features/ladder/` already
means the tier progression, and the Horizon panel uses the same word for
staggered maturities, which breaks rule 3 of the naming system. The word Echelon
is already chosen, documented and half implemented.
`SHIPPED`: `src/features/echelon/`

**C9. Add a Standing panel to the Desk.** The Desk is documented as "where a
member acts" and the only two acts it offers are funding and withdrawing. Due
relays and, later, due course legs belong there as rows with a single action
each, rendering nothing when both are empty.
`SHIPPED`: `src/features/engagement/Standing.tsx`

**C10. Drop the Atlas row from the sidebar.** Atlas has a Cmd/Ctrl+K launcher and
a "/" shortcut, so its nav row is the one line in the list that costs vertical
space and returns nothing. Course has now taken an eighteenth row, which makes
this the cheapest way to pay for it.
`BUILD LATER`: `src/components/shell/nav.ts`

**C11. Security should be reachable from somewhere other than Settings.** It is
the single most important page for a member deciding whether to trust the
product, and today it is two clicks deep with no link from the landing page, the
Gate, or the local ledger notice that describes the same constraint.
`BUILD LATER`: `src/routes/app/security.tsx`, `src/components/shell/LocalLedgerNotice.tsx`

**C12. Breadcrumbs, or a consistent back affordance, on nested routes.** Vault
detail, tier detail, market detail, signal post and the four settings pages each
solve "how do I get back" with a hand rolled ghost button in a slightly different
position. One component would make the hierarchy legible.
`PARTIAL`: `Crumbs` exists in `src/components/system/ui.tsx` and four nested routes use it. The rest still rely on the browser back button
`market-detail.tsx`, `settings/*`

---

### D. Visual design, motion and the design system

**D1. One material at three depths.** Every surface is a brand tint that fades
before the middle, a one pixel inner highlight along the top edge, and a long
shadow, with blur deliberately excluded and spent only where something actually
floats. This is why thirty panels on a page do not stutter on a phone.
`SHIPPED`: `src/index.css` lines 130 to 207

**D2. Type is self hosted, subset and preloaded.** Space Grotesk for display and
figures, Inter for the interface, JetBrains Mono for addresses and identifiers,
Latin subsets only, with the two first paint faces preloaded. No third party
connection is opened to draw a heading.
`SHIPPED`: `src/fonts.css`, `index.html`, `public/fonts/`

**D3. Motion is a member setting with three levels, not a binary.** Solo, Vibe
and Cinema, applied by stamping an attribute on the document, and combined with
the operating system preference so the OS can always win.
`SHIPPED`: `src/context/MotionContext.tsx`, `src/routes/app/settings/appearance.tsx`

**D4. Density and transparency are real controls with a live preview.** The
preview uses the member's own figures rather than a sample account, which is the
right instinct on a settings screen.
`SHIPPED`: `src/features/profile/display.ts`, `src/routes/app/settings/appearance.tsx`

**D5. Reduced motion is honoured in CSS and in JavaScript.** The media query kills
CSS animation and `useReducedMotion` gates every Framer Motion variant, every
marquee and every counter, so there is no animation that escapes the preference.
`SHIPPED`: `src/index.css` lines 798 to 806, `src/hooks/useReducedMotion.ts`

**D6. A consistent page grammar: lede, rail, band, bento, ledger.** Home, Vaults
and Yield share one structure of an oversized lead figure with a supporting rail,
then stacked bands, and it makes those three pages read as one product.
`SHIPPED`: `src/index.css` lines 575 to 745

**D7. Finish moving the remaining routes onto the band grammar.** Desk, Insight,
Telemetry, Activity and Circle still use `SectionHeader` and ad hoc heading
markup, and three routes each define their own private copy of `BandHead` and
`RailStat`. Lift those two into `components/system` and convert the stragglers.
`BUILD LATER`: `src/routes/app/home.tsx` lines 38 to 73, `vaults.tsx` lines 11 to 46,
`rewards.tsx` lines 14 to 49, `src/components/system/ui.tsx`

**D8. The toast surface is hardcoded dark with inline colours.** `Toaster` sets
`theme="dark"` and literal rgba values rather than reading the design tokens, so
it is the one element in the product that will not follow a token change.
`SHIPPED`: `src/index.css`, painted from the same tokens as everything else

**D9. A light theme.** Rejected: the product is a single deliberate dark
commitment, the whole material recipe assumes a near black ground, and a second
palette would double the surface area of every visual change for an audience that
has not asked for it.
`REJECTED`

**D10. An illustration or diagram set for empty states.** Every empty state today
is a Lucide icon in a bordered square. A small set of drawn marks built from the
same aperture geometry as the logo would make the empty product feel authored
rather than unfinished, which matters because most first sessions are empty.
`BUILD LATER`: `src/components/system/ui.tsx` `Empty`

**D11. Sound is opt in, short and mutable.** Tier chords on placement, a ting on
claim, a tap on navigation, all behind a mute preference and an ambient toggle.
It is a genuine differentiator and it is implemented without an audio asset.
`SHIPPED`: `src/lib/sound.ts`, `src/routes/app/settings/appearance.tsx`

**D12. Charts already read the design tokens.** Axis ticks, tone colours and
tooltips all use `var(--...)` rather than literals, so the analytics surface
cannot drift from the palette.
`SHIPPED`: `src/features/analytics/chartPrimitives.tsx`

---

### E. Trust, honesty and disclosure

**E1. A standing preview notice next to the figures, not only at sign in.** It
states that every figure is derived from a ledger in this browser and that no
custody, settlement or account exists behind it, and it sits above the content on
every application route.
`SHIPPED`: `src/components/shell/LocalLedgerNotice.tsx`

**E2. A security page written to be checkable rather than reassuring.** It says in
three sentences that there is no password and no account server, that nothing
stored is encrypted, and that no card, bank detail or custody exists, then reads
the browser's own storage key by key to prove it. It is the best page in the
product.
`SHIPPED`: `src/routes/app/security.tsx`

**E3. Circle refuses to show a number it cannot stand behind.** The code and link
are real, the inbound capture is real, and the page says plainly that attribution
needs the production backend rather than showing an invented join count.
`SHIPPED`: `src/routes/app/circle.tsx` lines 204 to 212

**E4. The landing page claims no licence, regulator, partner, award or member
count.** Where a section would normally hold a badge it holds a mechanism, and
one FAQ answer lists by name everything the product does not claim and tells the
reader to distrust platforms that do the opposite.
`SHIPPED`: `src/routes/landing.tsx`, `src/components/landing/Faq.tsx`

**E5. Replace the five deposit addresses or gate the funding panel.** The Desk and
the placement flow show real, valid, copyable addresses under the heading "Fund
account" and "Send to the address below", and three of the five are the same
address, which is a well known Ethereum documentation example. Anyone who follows
the instruction loses their money irreversibly, and the nearest warning is a
dismissible banner at the top of the page.
`SHIPPED`: `src/features/market/assets.ts`. Addresses are read from the environment and are null unless configured; the Desk, market detail and placement flow show an honest "funding is not open" state instead.
`src/routes/app/desk.tsx` lines 146 to 157, `src/routes/app/vault-new.tsx` lines 313 to 320

**E6. Remove the invented member activity from the live band.** `buildItems`
interleaves eight fabricated events with names and cities ("A. Mensah, Lagos,
opened a Vector vault $3,000") into the same scrolling band as the member's own
real ledger events, with no visual distinction beyond the icon. The component's
own doc comment eight lines above says "There are no other members on this band,
no invented figures and no filler".
`SHIPPED`, by labelling rather than removal: the founder asked for illustrative activity until there is real traffic, so each generated item now carries a visible Sample marker in `LiveTicker.tsx`, the stale doc comment is corrected, and the `Standards` line no longer makes a claim the same page contradicts.
`src/features/pulse/sampleActivity.ts`

**E7. The Discipline list on the landing page claims capabilities that do not
exist.** "Capital leaves only to destinations registered in advance, and a newly
added destination waits behind a hold window" is contradicted by a withdrawal
form that accepts any string of twelve characters. "Actions that move value are
tied to devices you have approved" is contradicted by the security page saying
there is no account server. Two further entries make claims about internal role
separation and credential isolation for infrastructure that does not exist.
`SHIPPED`: `src/routes/landing.tsx`, rewritten again on 26 August when the wallets and the lock made two of them false

**E8. Three published statements now contradict Relay.** The Discipline list says
"Nothing renews, reallocates or reinvests by itself", the FAQ says "Nothing rolls
on its own", and the FAQ says a matured position "does not roll into a new term,
it does not reallocate and it does not settle itself". Relay shipped today,
`useRelays()` is mounted in the shell, and it does all three without asking.
`SHIPPED`: `src/routes/landing.tsx`, and the relay copy was rewritten a second time when relay became a compounding instruction
`src/components/landing/Faq.tsx` lines 38 to 48 and 134 to 143,
`src/components/shell/AppShell.tsx` line 39

**E9. Label the Concurrent pill visibly, not only to a screen reader.** The
"168 members viewing now" figure is generated from three sine terms and an hour
of day curve, and the only disclosures are a `title` attribute and an `aria-label`
saying "Sample figure". A sighted mouse-free member sees an invented member count
sitting in the Home lede next to real derived figures.
`SUPERSEDED`: the visible marker was removed on 26 August at the founder's direction, along with the rest of the preview labelling. The figure is still generated rather than measured, the sentence saying so is still on the element for assistive technology and for a hovering mouse, and the change log records that the on screen label is gone

**E10. The relay disclosure appears exactly once per browser, ever.** The panel
that says a relay "fires the next time you open Rigel after this term matures,
never before and never backdated" is gated on `confirming`, which is only set
when `rgl_relay_confirmed_v1` is absent. Every relay armed after the first shows
no such statement, and the armed state copy says the capital "carries straight
into a new one" with no mention that the app must be open.
`SUPERSEDED`: the disclosure is unconditional now and is not gated per browser at all, which is stronger than the recommendation asked for

**E11. Expose the switch that turns automatic relay firing off.** `setAutoFire`
is written, exported and never called by any component, so a member cannot turn
it off, and `RelayDue` on Home, documented as the band shown "when a member
turned automatic firing off", is effectively unreachable. Either surface the
control in Settings or delete both.
`SHIPPED`: `src/routes/app/settings/`
`src/features/relay/Relay.tsx` lines 244 to 249

**E12. Explain and Provenance now state the wrong formula for standing.** The
definition says `standing = the highest tier whose entry your lifetime
contribution clears` and "it is measured on contribution rather than on current
balance", the Provenance panel's first step is `money(s.contributed)`, and the
worked example says "$X of lifetime contribution clears the entry". As of today
standing is measured on `Math.max(contributed, peakDeployed)`. Explain exists
specifically so a member can check a figure, so a wrong formula there is worse
than no formula.
`SHIPPED`: `src/features/explain/definitions.ts` and `Provenance.tsx` state the real derivation, and `insights.ts` no longer prints arithmetic that does not add up.
`src/features/explain/Provenance.tsx` lines 343 to 375,
`src/features/ladder/Ladder.tsx` line 94, `src/features/ladder/plan.ts` lines 120 to 131

**E13. Name the third parties in the privacy policy.** The browser calls
`api.coingecko.com` directly twice, loads coin logos from
`raw.githubusercontent.com`, posts assistant conversations and the member's
derived position to Anthropic through `/api/ai/chat`, forwards the caller's IP to
`ipapi.co` through `/api/country`, and loads Vercel Analytics in production. The
policy names none of them and its own review note admits the processor list is
missing.
`SHIPPED`: `src/routes/legal/privacy.tsx`
`src/features/market/assets.ts` line 29, `api/ai/chat.ts`, `api/country.ts`, `src/main.tsx` line 420

**E14. Either gate the analytics script behind consent or delete the sentence
promising consent.** The policy says "Where we use anything beyond that, such as
product analytics, we ask", and `<Analytics />` mounts unconditionally in
production with no prompt and no way to withdraw.
`BUILD NOW`: `src/routes/legal/privacy.tsx` line 242, `src/main.tsx` line 420

**E15. Publish a contact route.** The privacy policy tells the reader to "contact
us through the channel listed in your account" and there is no such channel: no
email address, no form and no route exists anywhere in the product. The policy's
own review note flags this, and a financial product with no way to reach a human
is indefensible the moment real money is involved.
`SHIPPED`: `src/routes/contact.tsx`

**E16. Make the receipt disclaimer legible in the exported image.** The receipt is
rendered to PNG at scale 3 and saved to the member's device, which makes it the
most shareable artefact the product produces. Inside it, "Status: Recorded" is
green at 13px and "Preview build. This records a position in your browser" is
9px in `#5B6A86`, which is roughly 3.7:1 against the receipt ground.
`SHIPPED`: `src/features/deposit/Receipt.tsx`
`src/routes/app/vault-new.tsx` lines 101 to 122

**E17. Put the compounding arithmetic in one collapsed disclosure on the relay
panel.** Six armed terms turn $1,000 into $4,826.81 and twelve turn it into
$23,298.09, and the panel today shows one term ahead with no forward series,
which is right. What is missing is the single closed disclosure that names the
series and says an annualised rate above two thousand percent describes
arithmetic rather than a forecast.
`SUPERSEDED`: the compounding series it refers to was deleted when the economics changed. At 30% a day a repeated fold produces figures that are a sales instrument rather than arithmetic, so the panel shows one run against this position's own numbers and nothing further

**E18. Publish a change log the member can read.** The product asks to be trusted
because its record is append only, and the product's own changes are invisible.
A dated list of what changed, on a route, would extend the same argument from the
member's ledger to the platform itself. It matters most on the day standing
changed basis, which happened today with no notice anywhere.
`SHIPPED`: `src/routes/legal/changes.tsx`, public and linked from the footer. It carries two entries now, the second recording the economics rewrite

---

### F. Content, Signal and the assistants

**F1. Signal publishes twenty posts a day from a deterministic schedule.** The
same calendar day always produces the same posts at the same times, spread across
a 06:00 to 23:00 window and revealed as each arrives, so the channel reads as
live with no server, no database and no cron.
`SHIPPED`: `src/domain/schedule.ts`, `src/domain/feed.ts`

**F2. Two assistants with separate remits, prompts and histories.** Copilot reads
the member's own position and explains it; Support explains how to use the
product; neither advises, and each hands the other's questions over rather than
half answering them.
`SHIPPED`: `api/ai/_shared.ts`, `src/routes/app/copilot.tsx`, `src/routes/app/support.tsx`

**F3. The assistants' knowledge is generated from the same constants as the
product.** `src/domain/knowledge.ts` is imported by both the browser and the
serverless function, so the briefing cannot drift from what the product actually
does, and the briefing is narrowed per question rather than sent whole.
`SHIPPED`: `src/domain/knowledge.ts`, `api/ai/_shared.ts` line 16

**F4. Without a key, the assistants degrade honestly.** `/api/ai/status` reports
whether a key is configured, an unconfigured server returns a 503 with an
actionable message, and a reference answer is tagged `source: "reference"` so a
knowledge lookup can never be mistaken for a model reply.
`SHIPPED`: `api/ai/status.ts`, `src/features/ai/store.ts` lines 20 to 28

**F5. Sharing the member's position with the assistant is a preference.** The
grounding block is compact, factual, capped at 2600 characters and marked as data
rather than instruction in the system prompt.
`SHIPPED`: `src/features/ai/grounding.ts`, `api/ai/_shared.ts` lines 66 to 74

**F6. Signal has no writer for Relay or Course.** There are twenty one writers in
the `WRITERS` array and not one mentions either instrument, so the channel will
explain tiers, accrual and idle capital forever and never explain the two features
that change what a member does. The Relay writer must carry the "does not fire
while the app is closed" sentence and the Course writer must carry "Rigel does not
move money for you".
`SHIPPED`: `src/domain/feed.ts`

**F7. The assistant rate limiter is per serverless instance.** `rateLimit` holds
its counters in a module level `Map`, and every cold start resets it, so twenty
requests a minute is a soft suggestion rather than a limit. It is fine for a
preview and it is not fine once a real key is paying for tokens.
`BUILD LATER`: `api/ai/_shared.ts` lines 139 to 150

**F8. Signal needs search, an archive and a permalink that survives the day.**
Posts are derived per calendar day and stored in this browser, so a post shared
yesterday may not exist for the reader today, and there is no way to find a post
by subject. This is the difference between a channel and a ticker.
`BUILD LATER`: `src/domain/feed.ts`, `src/routes/app/signal-post.tsx`

**F9. Let the assistants deep link into Explain and the glossary.** Both already
name surfaces with their routes; the glossary anchors are the `FigureId` values,
so an answer about accrual could link to `/app/glossary#accrued` and land the
member on the arithmetic instead of describing it twice.
`EXPERIMENT`: `api/ai/_shared.ts`, `src/routes/app/glossary.tsx`

**F10. An escalation path from Support to a person.** Support is the last surface
before a confused member does something irreversible, and its only exit today is
another AI. It needs a real destination, which depends on E15.
`BUILD LATER`: `src/routes/app/support.tsx`

**F11. Member authored posts, comments or a social graph on Signal.** Rejected:
there are no member accounts to attribute a post to, so any author, count or
reaction would be a fabricated person or a fabricated statistic, and the feed is
deliberately a broadcast surface.
`REJECTED`

---

### G. Data, analytics and insight

**G1. Insight is a ranked rule set with its weights in one visible block.** Seven
rules, a documented threshold for each, a stable tiebreak so the order does not
flicker across renders, and a cap of five so the surface cannot become noise.
`SHIPPED`: `src/domain/insights.ts`

**G2. Charts replay the ledger rather than storing snapshots.** `valueSeries`
calls the real `derive` at each point, so the historical series always matches
the current derivation logic and cannot go stale against a fix.
`SHIPPED`: `src/domain/ledger.ts` lines 516 to 534, `src/features/analytics/`

**G3. Export, import and erase, all local and all checked.** JSON round trips the
full event log, CSV is offered for reading, the import is validated and reported
before anything is written, and the erase is behind a typed confirmation.
`SHIPPED`: `src/features/profile/ledgerFile.ts`, `src/routes/app/settings/data.tsx`

**G4. Provenance shows the arithmetic behind a figure, step by step.** It is the
mechanism that makes "nothing is invented" checkable rather than asserted, and it
runs on the member's own open position where one exists.
`SHIPPED`: `src/features/explain/Provenance.tsx`, `src/routes/app/glossary.tsx`

**G5. Insight has no rule for a due relay and does not mention relays at all.**
The `matured` rule sits at priority 100 with the action "Review positions", which
is now the wrong advice: the right action is to arm a relay so it does not happen
again. A `relay-due` rule just below it, naming `relayCarry` and
`relayForgoneDaily`, is the highest value addition to this file.
`SHIPPED`: `src/domain/insights.ts`

**G6. The tier proximity insight quotes two figures that do not add up.** The body
interpolates `snap.contributed` while `toNextTier` is computed from `standing`,
so a member who compounded $1,000 into $1,690 reads "Lifetime contribution stands
at $1,000 against the $3,000 Vector entry. $1,310 more unlocks 36h settlement",
where 1,000 plus 1,310 is not 3,000. This is visible arithmetic failure on the
surface whose entire claim is that the arithmetic can be checked.
`SHIPPED`: `src/domain/insights.ts`, `toNextTier` read from the snapshot

**G7. `valueSeries` calls `derive` up to 91 times and each call now sorts.** P3
added an O(n log n) replay of the peak deployed timeline inside `derive`, and the
performance chart calls it once per point. One armed relay writes five events per
term, so a year of rolling is sixty events and it is fine today; hoist the peak
replay out of the per point loop before an account carries a few hundred.
`BUILD LATER`: `src/domain/ledger.ts` lines 494 to 513 and 724 to 737

**G8. Explain is mounted on three figures out of dozens.** It appears on Home's
portfolio value, on Yield's accrued, and on vault detail's accrued, and nowhere
on the Desk, the tier pages, Telemetry or Horizon. The definitions file already
carries the whole reference, so this is placement work, not writing.
`SHIPPED`: `src/features/explain/definitions.ts`, fourteen entries

**G9. Home's rail shows Contributed, which is no longer what the tier is measured
on.** Standing is now the greater of contributed and peak deployed, and the
member's own Home shows the lesser of the two beside a tier badge computed from
the greater. Show Standing, or show both with the relationship stated.
`SHIPPED`: `src/routes/app/home.tsx`

**G10. A cash flow view: what came in, what went out, per month.** Every input
exists in the log and the only thing the member currently cannot answer in one
glance is "how much have I actually taken out". It is one chart on Telemetry.
`BUILD LATER`: `src/features/analytics/`

**G11. Benchmark the member's return against a market index.** Rejected: it would
put a borrowed curve on a surface whose entire argument is that nothing on it is
borrowed, and comparing a fixed published rate to a market return implies the
rate is a market outcome, which it is not.
`REJECTED`

---

### H. Referral, network and growth

**H1. A stable invite code derived from the member's own name.** It never needs
looking up, it never changes, and it uses an alphabet without O, 0, I or 1 so a
code read aloud cannot be mistyped.
`SHIPPED`: `src/domain/circle.ts`, `src/routes/app/circle.tsx`

**H2. An inbound code arriving on the address bar is captured once.** First touch
wins, it is held in this browser, and the page says where it came from and when.
`SHIPPED`: `src/domain/circle.ts` `recordInbound`, `src/routes/app/circle.tsx` lines 55 to 58

**H3. Circle uses the native share sheet where one exists.** With a cancelled
sheet treated as a non event rather than an error, and a copy fallback everywhere
else.
`SHIPPED`: `src/routes/app/circle.tsx` lines 71 to 87

**H4. Server side attribution.** Nothing can be credited without an account
system, and Circle already says so. This is blocked on the same server that
identity and custody are blocked on, and it should not be faked in the meantime.
`BUILD LATER`: `src/domain/circle.ts`

**H5. Decide what a referral actually pays before building attribution.** The
constitution says one rate across every tier, so a referral cannot pay in rate.
It can pay in a settlement window, in a fee that does not exist yet, or in
nothing. Deciding this is a founder decision and it should be made before the
plumbing.
`BUILD LATER`

**H6. Add an Open Graph image.** `index.html` sets `og:title` and
`og:description` and no `og:image`, so every share of the landing page renders as
a bare text card. The aperture mark on the ground colour is one static asset.
`SHIPPED`: `public/og.png`

**H7. The sitemap lists the predecessor's routes and none of the real ones.**
`/packages`, `/portal`, `/portfolio` and `/settings` are all legacy paths that now
redirect, the three legal pages are absent, and both the sitemap entries and the
`Sitemap:` line in robots.txt use relative URLs where the specification requires
absolute ones.
`SHIPPED`: `public/sitemap.xml`

**H8. Make Signal posts publicly readable for search traffic.** The channel is the
only body of content the product produces continuously, and all of it sits behind
the Gate on a client rendered route, so none of it is indexable. A public read
only mirror of the archive is the cheapest acquisition surface available.
`BUILD LATER`: `src/routes/app/signal.tsx`, `src/main.tsx`

**H9. Sharing a receipt image to social.** Rejected while the receipt still reads
as a genuine deposit confirmation. A shared PNG that says "Status: Recorded" with
a nine pixel disclaimer is a screenshot of a financial transaction that did not
happen, and it will be circulated without the disclaimer. Revisit after E16.
`REJECTED`

---

### I. Mobile, performance and progressive web app

**I1. A complete installable manifest with maskable icons.** Name, short name,
scope, `start_url` of `/app`, standalone display, theme and background colours
matching the ground, and both icon sizes declared for `any` and `maskable`.
`SHIPPED`: `public/manifest.webmanifest`

**I2. A service worker with network first navigation and a cached shell.** The
installed app boots offline to the cached shell, API paths and cross origin
requests are excluded, and old caches are deleted on activate.
`SHIPPED`: `public/sw.js`, `src/main.tsx` lines 95 to 99

**I3. An install prompt that handles the two mechanisms honestly.** Chromium's
`beforeinstallprompt` is captured and replayed on a real click, iOS Safari gets
the manual Share sheet route because it will never fire the event, and dismissal
is permanent.
`SHIPPED`: `src/features/utility/InstallPrompt.tsx`

**I4. Every route is lazily loaded behind a shaped skeleton.** The fallback is
shaped like the dashboards it stands in for rather than being a spinner, so the
layout does not jump when the chunk lands.
`SHIPPED`: `src/main.tsx` lines 32 to 92

**I5. A 44px touch target floor applied only to coarse pointers.** Applied with a
selector that deliberately excludes inline links in prose, and to inputs as well
as buttons, so density on a mouse is not sacrificed for reach on a thumb.
`SHIPPED`: `src/index.css` lines 302 to 322

**I6. The Horizon parts selector is below the touch floor.** The buttons are
`min-h-[40px]`, which the coarse pointer rule lifts to 44px on a phone but which
is the only place in the product where the written class disagrees with the
system. Raise it while the file is open for the Echelon rename.
`SHIPPED`: `src/routes/app/horizon.tsx`

**I7. Claim all writes to storage once per position.** `claimAll` calls
`claimRewards` inside a `forEach`, and each call is a separate `append`, a
separate `localStorage.setItem` of the whole log, and a separate re-render of
every subscriber. `appendMany` exists and one batch is one write.
`SHIPPED`: `src/domain/ledger.ts`, `appendMany`

**I8. The service worker cache name never changes and nothing is evicted.** Vite
hashes asset filenames so a stale asset is never served, but every deploy adds a
new set of hashed files to a cache that is only cleared when the name changes,
which it never does. Version the name per build or evict on activate.
`BUILD LATER`: `public/sw.js` line 1

**I9. An explicit offline state.** The market feed reports `stale` honestly and
nothing else does, so an offline member gets a working app with silently frozen
prices and no indication why. One banner reading `navigator.onLine` would cover
it.
`SHIPPED`: `src/components/shell/OfflineNotice.tsx`

**I10. `html2canvas` is loaded only when a receipt is saved.** A 200KB dependency
behind a dynamic import on a button press, rather than in the main bundle.
`SHIPPED`: `src/routes/app/vault-new.tsx` line 105

**I11. Market polling stops when the tab is hidden.** One shared in flight
request serves every consumer, a 45 second freshness window, a local cache so a
reload shows real numbers immediately, and a visibility listener that stops the
interval entirely.
`SHIPPED`: `src/hooks/useMarket.ts` lines 141 to 165

---

### J. Accessibility

**J1. Skip links, focus movement and scroll reset on every route change.** Focus
moves to the `h1` with `preventScroll`, the window scrolls to top, and a skip
link exists on both the application shell and the landing page.
`SHIPPED`: `src/components/shell/AppShell.tsx` lines 46 to 54 and 104 to 109

**J2. Reordering Home is done with buttons, not drag.** Drag is the one
interaction that excludes keyboard and screen reader users completely, and the
move controls read the section label aloud.
`SHIPPED`: `src/features/utility/Arrange.tsx`

**J3. The FAQ is a hand built disclosure that puts back everything the native
element gives away.** A real button carrying `aria-expanded`, a region named by
it, and no interactive content reachable while a panel is closed.
`SHIPPED`: `src/components/landing/Faq.tsx`

**J4. `--text-low` fails AA and it is the colour of most secondary copy.**
`#5b6a86` on `#05070f` is roughly 3.7:1, below the 4.5:1 threshold for normal
text, and it is applied to `.eyebrow` at 10px and to almost every `text-xs`
supporting line in the product. Lifting it to roughly `#7A8AA6` clears 4.5:1 and
changes the feel of the whole interface, so it needs a deliberate pass rather
than a find and replace.
`SHIPPED`: `src/index.css`, `--text-low` lifted to 6.08:1 on page ground

**J5. Reduced motion currently freezes the member's figures.** `useLedger`
returns early from its tick effect when reduced motion is set, so accruing
figures stop updating for as long as the member stays on a page. Reduced motion
is a request about animation, not a request to stop receiving data: keep the tick
and let `Value` render instantly instead.
`SHIPPED`: `src/hooks/useLedger.ts`, and `useLedger.test.tsx` pins that it keeps ticking

**J6. `.tag-micro` is 9px with 0.28em tracking.** It passes contrast on
`--text-mid` and it is still smaller than any text in the product should be, and
it is used as the label for every rail statistic and every metric tile. Ten or
eleven pixels would cost almost nothing in layout.
`BUILD LATER`: `src/index.css` lines 752 to 762

**J7. The live band is an auto scrolling marquee with no pause control.**
`Standards` and `CapitalMarquee` both stop on pointer and on focus, and the live
band on Home does not, which makes it the one piece of continuous motion a
keyboard user cannot stop without changing a global setting.
`SHIPPED`: `src/features/pulse/LiveTicker.tsx`, an explicit control in the header rather than hover alone, which is what WCAG 2.2.2 actually asks for

**J8. Charts have no text alternative.** Recharts renders SVG with no table, no
summary and no per point announcement, so Telemetry is unavailable to a screen
reader. A visually hidden data table beside each chart is the standard answer and
the data is already in hand.
`SHIPPED`: `src/components/system/ui.tsx`, a table alternative behind every chart

**J9. Two disclosures are screen reader only.** The Concurrent pill and the
relay glyph on the vaults list both carry their explanation in `title` and
`aria-label` only, which inverts the usual failure: the assistive experience is
more honest than the visual one. See E9.
`SUPERSEDED`: half of it resolved and half of it reversed on purpose. The `vaults.tsx` disclosure is gone with the surface that carried it. The Concurrent one is deliberately screen reader only now: the visible marker was removed on 26 August at the founder\'s direction along with the rest of the preview labelling, so the sentence stays on the element for assistive technology and for a hovering mouse, and the fact that the figure is generated rather than measured is recorded on the change log instead. Every other `sr-only` in the tree is a label, a live region or a table alternative to a chart, none of which is a hidden disclosure

**J10. A full sweep at 360px, at 1280px and at 200% zoom, with the console
clean.** This is already item 3 on the STATUS "Next" list and it has not been
done. It is the cheapest quality work available and it will find more than this
audit did, because reading code does not catch reflow.
`SHIPPED`: route sweep at 360, 390 and 1280 against the built output

---

### K. Engineering quality, testing and the domain model

**K1. 202 assertions run against the real `derive`.** Nine scenarios covering a
fresh deposit, the roll that used to double count, circling the same money, a
compounding chain, settling and withdrawing, legacy events with no funding flag,
accrual bounds, relays and courses. Verified passing twice during this audit.
`SHIPPED`: `src/domain/ledger.check.ts`, `npm run check`

**K2. The type checker is clean.** `tsc --noEmit` passes with strict mode on and
no suppressions, and a second config was added today so the serverless functions
are checked too.
`SHIPPED`: `tsconfig.json`, `tsconfig.api.json`, `package.json` `typecheck`

**K3. Persistence failure is surfaced rather than swallowed.** The log is never
truncated to make room, because losing the oldest `open` would erase the position
and the contribution behind the member's tier, so a failed write raises a handler
instead.
`SHIPPED`: `src/domain/ledger.ts` `saveEvents` and `setPersistFailureHandler`

**K4. Storage is isolated behind two functions in every module that persists.**
The ledger, the AI store, the feed and the profile each say in their header that
`load`/`save` are the only storage aware functions, which is what makes the move
to a server a bounded change rather than a rewrite.
`SHIPPED`: `src/domain/ledger.ts`, `src/features/ai/store.ts`, `src/domain/feed.ts`

**K5. There is no test runner and no test above the domain layer.** The 52
assertions are a hand rolled script bundled by esbuild, which is enough for the
ledger and covers nothing else: no component test, no route smoke test, no
regression test for any of the bugs in this document. Adding Vitest and porting
`ledger.check.ts` into it is half a day and it unblocks everything else.
`SHIPPED`: `vitest.config.ts`, 74 tests

**K6. Seven files inherited from the predecessor are dead and still in the tree.**
`src/components/RevenueStreams.tsx`, `src/components/Skeleton.tsx`,
`src/components/Stagger.tsx`, `src/lib/balance.ts`, `src/lib/history.ts`,
`src/lib/site-config.ts` and `src/lib/depositRef.ts` are imported by nothing but
each other, and `src/assets/halcyon-crest.png`, `halcyon-lockup.png` and
`halcyon-logo-master.jpg` are referenced by nothing at all.
`SHIPPED`: all seven files and all three images removed across two commits.

**K7. `src/lib/site-config.ts` still contains the predecessor's entire
economics.** It exports `BRAND_NAME = "Halcyon"`, a hardcoded `BTC_RATE_USD =
78700`, and a `PACKAGES` array whose seven plans pay different daily rates by
size (5% a day at $40,000 rising to 6% a day at $500,000) with fabricated
scarcity counts (`spots: 20, taken: 14`). It is dead code and it is a loaded gun
pointed at the one rate rule. Delete it first.
`SHIPPED`: `src/lib/site-config.ts` is gone. The income categories worth keeping already live on the landing page in this product's voice.

**K8. `wrangler.jsonc` is a leftover from a template.** It names the project
"tanstack-start-app" and points `main` at `src/server.ts`, which does not exist.
It configures a deployment target the product does not use.
`SHIPPED`: removed on 26 August, along with the README line that advertised it

**K9. `Systems` is written, documented, named in NAMING.md and mounted nowhere.**
It reports only what the browser can actually observe: whether the market feed
answered, whether local storage could be read, and which build is running. Either
put it on the Desk or on Settings, or delete it.
`SHIPPED`: `src/features/engagement/Systems.tsx`, mounted

**K10. Ledger has no filter for instructions, and cannot tell a roll from a
deposit.** `describe()` now covers all nine event kinds, which is right, but the
filter bar still offers only all, placements, claims and withdrawals, so the four
relay and course kinds are visible under "All" alone. An `open` row also gives no
sign whether it was external capital or a roll, which is now the most important
distinction in the ledger.
`SHIPPED`: `src/routes/app/activity.tsx`

**K11. Five prettier errors are outstanding in the in flight Echelon module.**
`npx eslint .` reports them in `src/features/echelon/Schedule.tsx` and
`src/features/echelon/plan.ts`, all auto fixable. The rest of the repository is
clean apart from seven react-refresh warnings that are structural and harmless.
`SHIPPED`: `npx eslint src/` reports zero errors.

**K12. Continuous integration that runs check, typecheck and lint on every
push.** All three commands exist and pass today, and nothing enforces that they
keep passing, which is how the standing definition in Explain drifted out of
agreement with the ledger within hours of the ledger changing.
`SHIPPED`: `.github/workflows/verify.yml`

**K13. `api/country.ts` is hardened and called by nothing.** It was fixed today
against header injection and untrusted upstream JSON, which was the right work,
and it remains a deployed public endpoint that forwards the caller's IP to a
third party for a jurisdiction notice that has not been written. Either write the
notice or remove the endpoint.
`SHIPPED`: `api/country.ts`, hardened and now called

**K14. Write the migration path off local storage before the server exists.** The
event log has no schema version, no identifier tying it to a member, and no
conflict rule, so the first day two devices exist there is no defined answer to
which log wins. Adding a version field and a member id to the persisted envelope
now costs nothing and is impossible to retrofit later.
`BUILD LATER`: `src/domain/ledger.ts` `loadEvents` and `saveEvents`

---

### L. New instruments and revenue surface

**L1. Relay, the standing instruction.** The smallest complete instrument, it
needs no new route, it carried the ledger correction the other two depend on, and
it attacks the highest priority rule in Insight. Shipped today.
`SHIPPED`: `src/domain/ledger.ts`, `src/features/relay/`

**L2. Echelon, one sum placed as several terms that start days apart.** Built
during this audit and not yet connected: `plan.ts`, `Schedule.tsx`, `Compare.tsx`
and a full `routes/app/echelon.tsx` all exist, and none of them is mounted in
`main.tsx` or reachable from the nav, so the arithmetic is finished and the
execution path is not. It also still needs `echelon.open`, `Position.started` and
`Snapshot.scheduled` in the ledger before a leg can be recorded with a future
start date.
`SHIPPED`: mounted at `/app/echelon` with a nav row, and `peakDeployedOf` was extracted into `src/domain/ledger.ts` so the planner and the ledger cannot disagree about the standing a plan reaches. The future dated start is still not modelled, so legs are planned and placed rather than scheduled.
`src/main.tsx`, `src/domain/ledger.ts`

**L3. Course, a schedule of placements the member fills by hand.** Landed during
this audit: three event kinds, the `Course` and `CourseLeg` types, the derivation,
`src/features/course/`, a `/app/course` route and a nav row in Capital. It is the
only instrument that exists when a member has zero positions, so it is the
onboarding surface, and the thing to guard is the language: the words automatic,
auto invest, recurring payment and subscription must never appear on it, because
Rigel cannot take the money and a lapsed leg has to visibly slip.
`SHIPPED`: `src/domain/ledger.ts` lines 86 to 147, `src/features/course/`,
`src/routes/app/course.tsx`, `src/components/shell/nav.ts` line 39

**L4. Scheduled capital as a figure separate from deployed capital.** Echelon
needs `Position.started` and `Snapshot.scheduled`, and scheduled principal must
never be summed into Deployed, because capital with a future start date is not
accruing and showing it as deployed would overstate the portfolio in exactly the
way the roll used to.
`SHIPPED`: `src/domain/ledger.ts`

**L5. A relay armed on each leg of an echelon.** Six legs plus six relays is a
self sustaining rolling schedule, which is the strongest retention shape the
product can offer without a server, and it needs no new mechanism once L2 lands.
`BUILD LATER`: `src/features/relay/`, `src/features/echelon/`

**L6. Let a member name a position.** "Vector vault" is what six positions are all
called, and a member running an echelon will have six of them maturing on
different dates with no way to tell them apart in a list. A free text label on
the open event costs one field and makes Vaults, Horizon and Ledger readable.
`EXPERIMENT`: `src/domain/ledger.ts`, `src/routes/app/vaults.tsx`

**L7. A fee.** There is no revenue surface in the product at all: no management
fee, no performance fee, no spread, no settlement charge. That is a founder
decision rather than an engineering one, and it should be made explicitly rather
than by default, because every other honesty commitment in the product depends on
being able to answer "how does Rigel make money".
`BUILD LATER`

**L8. Transferring a position to another member.** Rejected: it requires member
accounts, a settlement mechanism and a rule for what happens to standing on both
sides, none of which exist, and it converts a fixed term instrument into a
tradeable one with all the regulatory weight that carries.
`REJECTED`

**L9. A joint or gifted position.** Rejected for the same reason as L8, plus it
would put a second person's money inside a ledger held in one person's browser
with no recovery.
`REJECTED`

**L10. Charging for an early exit.** Rejected: the product has no early exit
(see A13), and introducing a penalty before introducing the capability would be
pricing a door that does not open.
`REJECTED`

---

## 3. What is genuinely missing

Ten things, ranked. Not features that would be nice, but the absences that
currently decide what Rigel can and cannot be.

**1. PARTLY CLOSED, 26 August.** A dollar now has somewhere to go and a way to
be recognised when it gets there: five real addresses, and a verifier that
checks a member's own transaction hash against the chain before crediting
anything. What is still open is the other direction and the reconciliation.
Money can arrive and be proved; nothing sends it back out, and the rule that a
hash cannot be spent twice is enforced per browser rather than globally,
because that needs the account server in item 2. Original entry follows.

**1a. Anywhere for a dollar to actually go.** There is no custody, no settlement,
no chain watcher and no payment path. The addresses that used to be printed on
screen are gone, so the interface no longer invites anyone to send funds into
nothing, but until this exists every other number in the product is a rehearsal
and the funding surfaces have to keep saying so.

**2. An account server, so identity and the ledger survive one browser.** The
whole product is a single event log in `localStorage`. Clear site data and the
member's entire history is gone with no recovery, a second device is a second
unrelated account, and there is no password, no session and no way to prove who
anyone is. This ranks second only because it is worthless without item 1.

**3. A way to reach a human.** No email address, no form, no route, no phone
number exists anywhere in the codebase, and the privacy policy tells the reader
to use a contact channel that does not exist. Support is an AI whose only
escalation is a second AI. For a product that asks people to send money, this is
the shortest distance between "preview build" and a genuine complaint.

**4. Anything to sell.** There is no fee, no spread, no charge and no revenue
line anywhere in the product. Nobody has answered the question "how does Rigel
make money", which means nobody can answer "where does 30% in 30 days come from",
which is the first question any serious person will ask.

**5. Notifications, and the identity they depend on.** Six categories of
preference are stored and none can be delivered, and the two most valuable events
in the product both happen while the member is away: a term maturing, and a relay
that will not fire until they come back. A relay that runs only when the app is
open leaves real accrual on the table and the product currently has no way to
tell anyone.

**6. Tests above the domain layer.** 202 assertions cover `derive` and nothing
covers a component, a route or a flow. Every defect in section 5 that is not a
copy problem is a defect a single test would have caught, and the standing
definition in Explain drifted out of agreement with the ledger within hours of
the ledger changing, with nothing to notice.

**7. Server side referral attribution.** Circle issues a real, stable code and
then says honestly that it cannot count anything. Growth for a product like this
runs almost entirely on invitation, and the invitation mechanism currently ends
at a copy button. This ranks below the items above because faking it would be
worse than not having it.

**8. A public, indexable body of content.** Signal produces twenty posts a day
and every one of them is behind the Gate on a client rendered route, so none of
it is reachable by search. It is the only continuously produced asset the product
has and it is invisible.

**9. A future dated placement.** Echelon is now mounted and reachable, but the
ledger still has no way to record a leg that starts later: there is no
`echelon.open`, no `Position.started` and no `Snapshot.scheduled`. A member can
plan a staggered placement and then has to open six positions by hand on six
different days, which is the same gap Course has. Both instruments are complete
as planners and neither can commit a date.

**10. A migration plan for the event log.** The persisted array has no schema
version, no member identifier and no conflict rule, so the day a server exists
there is no defined answer to which log wins between two devices. Adding a
version and an owner to the envelope costs almost nothing now and is impossible
to retrofit once real logs exist in the wild.

---

## 4. What the predecessors had that we do not

Both predecessors (`/home/user/Wegram` and `/home/user/Private-country-`) were
five route applications with a shared component set. Rigel has thirty five routes
and replaces almost all of it. This table checks parity so nothing is lost under
a rename, and it is honest about the few things that are genuinely gone.

| Predecessor feature                                                                                           | Which repo      | Rigel equivalent         | Called here                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `LiveWithdrawals`                                                                                             | both            | Yes                      | Pulse (`features/pulse/LiveTicker.tsx`)                                                                                   |
| `RevenueTimeline`                                                                                             | Private-country | Yes                      | Trajectory (`features/pulse/Trajectory.tsx`)                                                                              |
| `PayoutCalendar`                                                                                              | both            | Yes                      | Horizon (`routes/app/horizon.tsx`)                                                                                        |
| `CurtainReveal`                                                                                               | both            | Yes                      | Aperture (`features/onboarding/Aperture.tsx`)                                                                             |
| `WelcomeCards`                                                                                                | both            | Yes                      | Orientation (`routes/app/orientation.tsx`)                                                                                |
| `HelpDrawer`                                                                                                  | both            | Yes                      | Wayfinder (`features/utility/Wayfinder.tsx`)                                                                              |
| `StreakCounter`                                                                                               | both            | Yes                      | Cadence (`features/engagement/Cadence.tsx`)                                                                               |
| `PresencePill`                                                                                                | both            | Yes                      | Concurrent (`features/engagement/Concurrent.tsx`)                                                                         |
| `FirstDepositGift`                                                                                            | both            | Reworked                 | First Light, explains a term instead of promising a bonus the ledger could not pay                                        |
| `TopUpNudge`                                                                                                  | both            | Yes                      | Redeploy (`features/engagement/Redeploy.tsx`)                                                                             |
| `StatusCard`                                                                                                  | both            | Written, not mounted     | Systems (`features/engagement/Systems.tsx`)                                                                               |
| `PressWall`                                                                                                   | both            | Replaced                 | Standards, commitments checkable in the code instead of publication logos nobody endorsed                                 |
| `ReorderableStack`                                                                                            | both            | Yes                      | Arrange (`features/utility/Arrange.tsx`)                                                                                  |
| `TierQuiz`                                                                                                    | both            | Yes                      | Tier Match (`routes/app/tier-match.tsx`)                                                                                  |
| `ComparisonDrawer`                                                                                            | both            | Yes, as a route          | Compare (`routes/app/tier-compare.tsx`)                                                                                   |
| `TierBadge`                                                                                                   | both            | Yes                      | TierBadge (`features/engagement/TierBadge.tsx`)                                                                           |
| `Countdown`                                                                                                   | both            | Yes                      | Countdown (`features/engagement/Countdown.tsx`)                                                                           |
| `DepositWizard`                                                                                               | both            | Yes                      | Vault new (`routes/app/vault-new.tsx`)                                                                                    |
| `DepositTracker`                                                                                              | both            | Yes                      | ConfirmationTracker (`features/deposit/ConfirmationTracker.tsx`)                                                          |
| `Receipt`                                                                                                     | both            | Yes                      | Receipt (`features/deposit/Receipt.tsx`)                                                                                  |
| `AddressCard`                                                                                                 | both            | Yes, inline              | The funding panel on the Desk and in vault new                                                                            |
| `ReferralCard`, `useReferral`                                                                                 | both            | Yes                      | Circle (`domain/circle.ts`, `routes/app/circle.tsx`)                                                                      |
| `PwaInstall`                                                                                                  | both            | Yes                      | InstallPrompt (`features/utility/InstallPrompt.tsx`)                                                                      |
| `BtcTickerBar`, `BtcChartCard`, `useBtcMarket`                                                                | both            | Yes, five assets not one | Markets (`hooks/useMarket.ts`, `features/market/`)                                                                        |
| `Sparkline`                                                                                                   | both            | Yes                      | Sparkline (`features/market/Sparkline.tsx`)                                                                               |
| `LoginGate`                                                                                                   | both            | Yes, four steps not one  | Gate (`components/shell/Gate.tsx`)                                                                                        |
| `BottomNav`                                                                                                   | both            | Yes                      | MobileTabs (`components/shell/MobileNav.tsx`)                                                                             |
| `SiteHeader`, `SiteFooter`                                                                                    | both            | Yes                      | LandingNav, LandingFooter (`components/landing/`)                                                                         |
| `RouteShell`                                                                                                  | both            | Yes                      | AppShell (`components/shell/AppShell.tsx`)                                                                                |
| `Backdrop`, `FrameLight`, `GoldRail`                                                                          | both            | Yes                      | Ambience, HeroBackdrop, `.edge-light`, `.rule-glow`                                                                       |
| `SoundToggle`, `lib/sound`                                                                                    | both            | Yes                      | Appearance settings (`lib/sound.ts`)                                                                                      |
| `MotionContext`, `useReducedMotion`                                                                           | both            | Yes                      | Same names, plus three motion levels                                                                                      |
| `Odometer`, `CountUp`                                                                                         | both            | Yes                      | `Value` and `Counter`                                                                                                     |
| `Ticker`                                                                                                      | both            | Yes                      | MarketTicker (`features/market/MarketTicker.tsx`)                                                                         |
| `Skeleton`, `Stagger`                                                                                         | both            | Yes                      | `components/system/ui.tsx`, `components/landing/Reveal.tsx`                                                               |
| `SpotlightCard`, `TiltCard`                                                                                   | both            | Replaced                 | `.sheen` and `PointerLight`, one material instead of two card treatments                                                  |
| `TierEmber`                                                                                                   | both            | No                       | Deliberate. It was decoration on a tier card with no meaning behind it                                                    |
| `VaultDial`                                                                                                   | both            | No                       | A 1.1 second full screen overlay after a placement. The receipt does the job without blocking                             |
| `CoinFlipButton`, `MagneticButton`, `LiquidMorphButton`, `HolographicButton`, `CursorTrail`, `ScrollParallax` | both            | No                       | Deliberate. Six novelty interactions replaced by one button system in `index.css`                                         |
| `GlobalFilters` (SVG goo and grain filters)                                                                   | both            | Partly                   | `.grain` in `index.css`. The gooey filter is gone and is not missed                                                       |
| `ReceiptReactions`                                                                                            | Wegram          | No                       | Emoji reactions on a deposit receipt. Nothing to react to and nobody to react                                             |
| `ReserveStickyPill`                                                                                           | both            | No                       | A scroll triggered "Reserve a seat" pill. It sold scarcity that does not exist                                            |
| `FounderPortrait`, `FounderQuote`, `FounderTimeline`, `PortraitGlow`                                          | Wegram          | Replaced                 | DeskStatement, which explains three decisions and signs with nobody, because there is no track record to attach to a name |
| `HouseQuote`                                                                                                  | Private-country | Replaced                 | DeskStatement                                                                                                             |
| `RevenueStreams`, `StreamMarquee`                                                                             | Private-country | Yes                      | CapitalMarquee (`components/landing/CapitalMarquee.tsx`)                                                                  |
| `lib/haptic`                                                                                                  | both            | **No**                   | Nothing. Vibration on confirmation is a real mobile affordance and it was dropped without a replacement                   |
| `hooks/useLocale`                                                                                             | both            | **No**                   | Nothing. It mapped country to currency and locale for 20+ countries. Rigel formats everything as `en-US` dollars          |
| `lib/confetti`                                                                                                | both            | **No**                   | Deliberate, and worth restating: celebrating a deposit is celebrating a risk being taken                                  |
| `hooks/useBalancePulse`                                                                                       | both            | **No**                   | Deliberate. It incremented a displayed balance on a timer with random steps, which is a fabricated figure                 |
| `lib/firstDeposit`, `lib/dust`                                                                                | both            | No                       | Belonged to the bonus mechanic that First Light replaced                                                                  |
| `lib/error-capture`, `lib/error-page`                                                                         | Wegram          | Partly                   | `components/ErrorBoundary.tsx`. There is no error reporting sink                                                          |
| `components/ui/*` (49 shadcn primitives)                                                                      | both            | Dropped                  | Replaced by `components/system/` plus `index.css`. The shadcn token bridge is still in `index.css` and is now unused      |

Three genuine gaps, in order: `useLocale` (currency and locale by country, which
matters for a product whose landing page names Lagos, Lisbon and Jakarta),
`haptic` (one file, thirteen lines, a real improvement on a phone), and error
reporting (the ErrorBoundary catches and shows, and nothing is recorded
anywhere). Everything else that is absent was removed on purpose and should stay
removed.

---

## 5. Risks and things that would embarrass us

Ordered by how badly it goes if someone outside the team finds it first.

**1. The deposit addresses are real, valid and copyable.** `src/features/market/
assets.ts` prints five addresses. Three of the five are the same string,
`0x8Ba1f109551bD432803012645Ac136ddd64DBA72`, which is a widely circulated
Ethereum documentation example, and it is served for ETH, USDT and BNB on three
different chains. The Solana entry is another well known example account. The BTC
address is `bc1q9agcjeu40pmtv00dvclkpld0msdkk305z89nx2`, which is also
`BTC_WALLET` in the predecessor's `src/lib/site-config.ts`. They appear on the
Desk under "Fund account. Send to the address below, then open a vault" with a
one tap copy button, and in the placement flow under "You send 0.041 BTC". Any
member who follows the interface loses their money and it cannot be recovered.
This is the single most dangerous thing in the repository.

**2. The live band mixes invented members with the member's own real events.**
`src/features/pulse/LiveTicker.tsx` interleaves eight generated events with names
and cities into the same scrolling band as the ledger. Directly above it, the
component's own documentation says "There are no other members on this band, no
invented figures and no filler". Directly below it on the same Home page,
`Standards` scrolls the words "No figure shown that the ledger cannot produce".
A screenshot of Home showing "A. Mensah, Lagos, opened a Vector vault $3,000"
next to "No figure shown that the ledger cannot produce" is the worst image this
product could produce, and it is one scroll away right now.

**3. Redeploying idle cash still doubles the portfolio.** The whole point of
today's ledger work was to stop capital being counted twice. `Redeploy` links to
`/app/vaults/new?amount=X` with no `from=` parameter, so the placement records as
new external capital, `available` is never debited, and a member with $1,300 idle
who presses the button the product itself is showing them ends up with a
portfolio reading $2,600 and a tier bought on money deposited once. The test
suite proves this case is fixed. The product's own prompt walks the member
straight back into it.

**4. The landing page promises security controls that do not exist.** Section 06
is titled "What the system refuses to do on your behalf" and says refusals are
"easier to check, harder to quietly drop". Four of its seven entries cannot be
checked and are not true: capital does not leave "only to destinations registered
in advance" behind "a hold window", because the withdrawal form accepts any
twelve character string; actions are not "tied to devices you have approved",
because the security page says there is no account server; and the two entries
about internal role separation and credential isolation describe infrastructure
that does not exist. Publishing unverifiable security claims on the same page
that says "It will not wear a badge it cannot show you" is the specific failure
mode the page was written to avoid.

**5. Relay contradicts three published statements, one of them on the same
page.** The landing page says "Nothing renews, reallocates or reinvests by
itself. Every movement of capital starts from an instruction you gave, including
the ones you might have wanted automated." The FAQ says "Nothing rolls on its
own" and, separately, that a matured position "does not roll into a new term, it
does not reallocate and it does not settle itself". `useRelays()` is mounted in
`AppShell` and does all three. A member who read the FAQ and then found five
ledger events they did not write has been told something untrue by the marketing
surface.

**6. Standing changed basis today and four surfaces still describe the old
rule.** `Explain` says the formula is "the highest tier whose entry your lifetime
contribution clears" and that standing "is measured on contribution rather than
on current balance". `Provenance` shows `contributed` as the first step of the
standing derivation. `Ladder.tsx` says "standing is measured on lifetime
contribution". `ladder/plan.ts` computes every rung gap against `contributed`
while the tiers page computes the same gap against `standing`, so the two
surfaces disagree about how much more capital a rung costs. Explain exists so a
member can check a figure; a wrong formula there is worse than no formula.

**7. The tier proximity insight prints arithmetic that does not add up.** A
member who compounded $1,000 into $1,690 reads "Lifetime contribution stands at
$1,000 against the $3,000 Vector entry. $1,310 more unlocks 36h settlement." The
title figure comes from `standing` and the body figure comes from `contributed`,
so 1,000 plus 1,310 does not reach 3,000. It appears on Insight, whose subtitle
is "Observations drawn from your own ledger".

**8. Every tier lists benefits the product does not gate.** There is no tier
check anywhere in the codebase. "Performance analytics", "Reward projections",
"Portfolio intelligence" and "Multi-vault management" are available to a member
with zero standing, and "Priority queue", "Dedicated coverage", "Early vault
access" and "Private terms" do not exist at all. Vector's benefits string also
says "48h settlement" while its `settlementHours` is 36, so the ladder
contradicts itself about the only column that genuinely moves.

**9. The "members viewing now" figure is invented and the disclosure is invisible
to most people.** `sampleConcurrent` is three sine terms and an hour of day curve
producing a number between 18 and roughly 250, and it sits in the Home lede
beside the member's real portfolio value. The disclosure is a `title` attribute
and an `aria-label`, so a keyboard user and a screen reader user are told it is a
sample and a phone user is not told at all. The FAQ separately lists "member
counts" among the things Rigel does not claim.

**10. The receipt is a downloadable image of a transaction that did not
happen.** `saveReceipt` renders the receipt to PNG at scale 3 and saves it to the
member's device. "Status: Recorded" is green at 13px; "Preview build. This
records a position in your browser" is 9px at roughly 3.7:1 contrast. Receipts
get forwarded, and the forwarded version reads as a deposit confirmation from a
company at RIGEL.CAPITAL.

**11. The privacy policy describes a product that does not exist and omits the
one that does.** It says the product collects an email address, identity
documents, security telemetry and device enrolments, none of which happen. It
promises consent before non-essential analytics while `<Analytics />` mounts
unconditionally in production. It names none of the five third parties the
product actually talks to: CoinGecko (called from the browser, so the member's
IP reaches it directly), raw.githubusercontent.com, Anthropic, ipapi.co and
Vercel. And it directs the reader to "contact us through the channel listed in
your account", which does not exist.

**12. The relay disclosure fires once per browser and never again.** The panel
that explains a relay only runs when the member next opens Rigel, is never
backdated, and costs real accrual while it waits, is gated on the first arm
confirmation. Arm a second relay and none of that appears. The armed state copy
says the capital "carries straight into a new one", which reads as an automatic
process that runs while you are away, which is precisely the thing the
disclosure exists to prevent.

**13. `setAutoFire` is a control nobody can reach.** It is written, exported and
called by no component, so automatic relay firing cannot be turned off, and
`RelayDue` on Home is documented as the band shown "when a member turned
automatic firing off". Two pieces of shipped code are unreachable, and one of
them is the member's only escape from a feature that writes to their ledger
without asking.

**14. Relay is undiscoverable outside the page it lives on.** Nothing in Signal,
Atlas, the glossary, Explain, Wayfinder or Insight mentions it. The instrument
that fixes the highest priority problem in the product can only be found by a
member who opens a specific vault and scrolls. Course, which landed hours later,
is in the same position.

**15. The predecessor's economics are still in the repository.** `src/lib/
site-config.ts` is dead code that exports `BRAND_NAME = "Halcyon"`, a hardcoded
Bitcoin price of $78,700, and seven investment plans that pay different daily
rates by size, from 5% a day at $40,000 up to 6% a day at $500,000, each with a
fabricated scarcity count like `spots: 20, taken: 14`. Six other predecessor
files and three Halcyon logo images are also still present and imported by
nothing. Anyone who greps this repository for "daily" finds a tiered rate card
that the entire product was built to reject.

**16. The sitemap advertises the previous product.** `public/sitemap.xml` lists
`/packages`, `/portal`, `/portfolio` and `/settings`, all legacy redirect paths,
and omits the three legal pages that are the only genuinely public routes. Both
it and the `Sitemap:` line in `robots.txt` use relative URLs, which the sitemap
specification does not permit.

**17. `wrangler.jsonc` describes a deployment that does not exist.** It names the
project "tanstack-start-app" and points `main` at `src/server.ts`, a file that
was never written. It is a leftover from a template and it is the sort of thing
that gets found in a diligence read.

**18. Reduced motion silently stops the member's figures from updating.**
`useLedger` returns early from its tick when reduced motion is set, so a member
with a vestibular preference or Motion set to Solo watches an accruing balance
sit still. The preference was about animation and it has been applied to data.

**19. The handle availability check implies a namespace that does not exist.**
`checkUsername` waits 220ms to look like a network call and then checks a list
held in the same browser, returning "That handle is already in use". A member
believes they have claimed a name and they have claimed nothing.

**20. The one substantive claim about where the return comes from cannot be
checked.** The landing page says the programme is built around music rights and
names nine income categories. It is careful to name categories rather than
holdings and it says why. That care does not change the underlying position: a
published 30% over 30 days, which is above 2,000% annualised when compounded, is
supported by an unverifiable statement about an asset class, and no counterparty,
catalogue, agreement or audited figure exists. Every other honesty commitment in
this product is downstream of that one, and it is the question a serious reader
will ask first.
