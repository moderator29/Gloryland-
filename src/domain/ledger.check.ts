/**
 * Assertions over the derivation, run against the real `derive`.
 *
 * These exist because the figures here are the product. A UI bug shows a wrong
 * colour; a derivation bug shows a member a balance they do not have. Case 2
 * is the regression that prompted the suite: an `open` never debited the
 * account balance, so settling a term and re-placing the same capital counted
 * it twice and the portfolio doubled on every roll.
 *
 * Run with `npm run check`.
 */

import {
  carryOf,
  classify,
  derive,
  earlyExit,
  fireRelay,
  fundingShortfall,
  isRoll,
  mergeStores,
  openPosition,
  parseStore,
  rollPosition,
  serialiseStore,
  settlePosition,
  DAY_MS,
  LEDGER_SCHEMA,
  type LedgerEvent,
  type LedgerStore,
} from "@/domain/ledger";
import { buildInsights, tierProximity } from "@/domain/insights";
import { CYCLE_DAYS, DAILY_RATE, TIERS } from "@/domain/tiers";

let pass = 0,
  fail = 0;
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
function is(label: string, actual: unknown, expected: unknown) {
  const ok =
    typeof actual === "number" && typeof expected === "number"
      ? near(actual, expected)
      : actual === expected;
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`  FAIL ${label}: got ${actual}, want ${expected}`);
  }
}

const T0 = Date.UTC(2026, 0, 1);
const day = (n: number) => T0 + n * DAY_MS;
const open = (id: string, at: number, amount: number, tierId: string, fromAvailable?: boolean) =>
  ({
    id,
    kind: "open",
    at,
    amount,
    tierId,
    asset: "USDT",
    network: "TRC20",
    ...(fromAvailable ? { fromAvailable } : {}),
  }) as LedgerEvent;
const close = (id: string, at: number, positionId: string) =>
  ({ id, kind: "close", at, positionId }) as LedgerEvent;
const claim = (id: string, at: number, positionId: string, amount: number) =>
  ({ id, kind: "claim", at, positionId, amount }) as LedgerEvent;
const withdraw = (id: string, at: number, amount: number) =>
  ({ id, kind: "withdraw", at, amount, address: "x" }) as LedgerEvent;

console.log("\n1. A fresh external deposit");
{
  const s = derive([open("p1", T0, 1000, "signal")], day(10));
  is("deployed", s.deployed, 1000);
  is("contributed", s.contributed, 1000);
  is("available", s.available, 0);
  is("accrued 10d", s.rewardsAccrued, 1000 * DAILY_RATE * 10);
  is("portfolioValue", s.portfolioValue, 1000 + 100);
  is("peakDeployed", s.peakDeployed, 1000);
  is("standing", s.standing, 1000);
}

console.log("\n2. The roll that used to double count");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    claim("c1", day(CYCLE_DAYS), "p1", 300),
    close("x1", day(CYCLE_DAYS), "p1"),
    open("p2", day(CYCLE_DAYS), 1300, "signal", true),
  ];
  const s = derive(ev, day(CYCLE_DAYS));
  is("deployed", s.deployed, 1300);
  is("available after roll", s.available, 0);
  is("portfolioValue is the real 1300", s.portfolioValue, 1300);
  is("contributed is external only", s.contributed, 1000);
  is("peakDeployed", s.peakDeployed, 1300);
  is("standing", s.standing, 1300);
  is("netGain", s.netGain, 300);
}

console.log("\n3. Circling the same money never buys a tier");
{
  const ev: LedgerEvent[] = [];
  for (let i = 0; i < 5; i++) {
    ev.push(open(`p${i}`, day(i * CYCLE_DAYS), 1000, "signal", i > 0));
    ev.push(close(`x${i}`, day((i + 1) * CYCLE_DAYS), `p${i}`));
  }
  const s = derive(ev, day(5 * CYCLE_DAYS));
  is("contributed stays at the one real deposit", s.contributed, 1000);
  is("peakDeployed never exceeds one term", s.peakDeployed, 1000);
  is("standing", s.standing, 1000);
  is("tier is the rung one deposit buys, not five", s.tier?.id, "signal");
}

console.log("\n4. Compounding does raise standing");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    claim("c1", day(30), "p1", 300),
    close("x1", day(30), "p1"),
    open("p2", day(30), 1300, "signal", true),
    claim("c2", day(60), "p2", 390),
    close("x2", day(60), "p2"),
    open("p3", day(60), 1690, "signal", true),
  ];
  const s = derive(ev, day(60));
  is("deployed", s.deployed, 1690);
  is("available", s.available, 0);
  is("portfolioValue", s.portfolioValue, 1690);
  is("peakDeployed", s.peakDeployed, 1690);
  is("standing follows the peak", s.standing, 1690);
  is("contributed still external only", s.contributed, 1000);
}

console.log("\n5. Settling and withdrawing");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 5000, "apex"),
    claim("c1", day(30), "p1", 1500),
    close("x1", day(30), "p1"),
    withdraw("w1", day(31), 6500),
  ];
  const s = derive(ev, day(31));
  is("available drains", s.available, 0);
  is("withdrawn", s.withdrawn, 6500);
  is("portfolioValue", s.portfolioValue, 0);
  is("netGain", s.netGain, 1500);
  is("standing survives the exit", s.standing, 5000);
  is("tier held", s.tier?.id, "apex");
}

console.log("\n6. Legacy events with no funding flag read as external");
{
  const s = derive([open("p1", T0, 3000, "vector")], day(1));
  is("contributed", s.contributed, 3000);
  is("available", s.available, 0);
  is("standing", s.standing, 3000);
}

console.log("\n7. Accrual still stops at settlement and at maturity");
{
  const early = derive([open("p1", T0, 1000, "signal"), close("x", day(10), "p1")], day(25));
  is("frozen at settlement", early.rewardsAccrued, 1000 * DAILY_RATE * 10);
  const late = derive([open("p1", T0, 1000, "signal")], day(90));
  is("capped at the term", late.rewardsAccrued, 1000 * DAILY_RATE * CYCLE_DAYS);
}

console.log("\n8. Relays");
{
  const armed: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    { id: "r1", kind: "relay.set", at: day(1), positionId: "p1", mode: "full" } as LedgerEvent,
  ];

  const midTerm = derive(armed, day(10));
  is("armed", midTerm.relaysArmed.length, 1);
  is("not due mid term", midTerm.relaysDue.length, 0);
  is("fires at maturity", midTerm.relays[0].firesAt, day(CYCLE_DAYS));

  const matured = derive(armed, day(CYCLE_DAYS + 2));
  is("due once matured", matured.relaysDue.length, 1);
  is("carries principal plus reward", matured.relaysDue[0].carries, 1300);
  is("overdue by two days", matured.relaysDue[0].overdueDays, 2);
  is("forgone per day", matured.relayForgoneDaily, 13);
  is("relayCarry", matured.relayCarry, 1300);

  // Principal only mode leaves the reward behind.
  const principalOnly = derive(
    [
      open("p1", T0, 1000, "signal"),
      {
        id: "r1",
        kind: "relay.set",
        at: day(1),
        positionId: "p1",
        mode: "principal",
      } as LedgerEvent,
    ],
    day(CYCLE_DAYS),
  );
  is("principal only carries principal", principalOnly.relaysDue[0].carries, 1000);

  // A later clear wins over an earlier set.
  const cleared = derive(
    [...armed, { id: "r2", kind: "relay.clear", at: day(5), positionId: "p1" } as LedgerEvent],
    day(CYCLE_DAYS),
  );
  is("disarmed", cleared.relaysArmed.length, 0);
  is("nothing due", cleared.relaysDue.length, 0);

  // A claim mid term lowers what the relay can carry, because it carries what
  // is actually left rather than the full term reward.
  const partlyClaimed = derive([...armed, claim("c1", day(15), "p1", 150)], day(CYCLE_DAYS));
  is("carries principal plus what remains", partlyClaimed.relaysDue[0].carries, 1150);

  // Firing writes the batch, and the result must not double count.
  const fired: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    { id: "r1", kind: "relay.set", at: day(1), positionId: "p1", mode: "full" } as LedgerEvent,
    claim("c1", day(CYCLE_DAYS), "p1", 300),
    close("x1", day(CYCLE_DAYS), "p1"),
    open("p2", day(CYCLE_DAYS), 1300, "signal", true),
    {
      id: "r2",
      kind: "relay.set",
      at: day(CYCLE_DAYS),
      positionId: "p2",
      mode: "full",
    } as LedgerEvent,
  ];
  const after = derive(fired, day(CYCLE_DAYS));
  is("portfolio is the real carry", after.portfolioValue, 1300);
  is("balance is empty", after.available, 0);
  is("contribution unchanged", after.contributed, 1000);
  is("the chain rearmed itself", after.relaysArmed.length, 1);
  is("rearmed on the new position", after.relaysArmed[0].positionId, "p2");
}

console.log("\n9. Courses");
{
  const courseSet = (at: number, legs: number, every = 7, amount = 400): LedgerEvent =>
    ({
      id: "cs",
      kind: "course.set",
      at,
      courseId: "c1",
      amount,
      everyDays: every,
      legs,
      startAt: at,
      asset: "USDT",
      network: "TRC20",
    }) as LedgerEvent;
  const fill = (id: string, at: number, leg: number, positionId: string): LedgerEvent =>
    ({ id, kind: "course.fill", at, courseId: "c1", leg, positionId }) as LedgerEvent;

  const fresh = derive([courseSet(T0, 25)], T0);
  is("one course", fresh.courses.length, 1);
  is("active", fresh.activeCourse?.id, "c1");
  is("25 legs scheduled", fresh.courses[0].schedule.length, 25);
  is("first leg is due on day zero", fresh.courses[0].nextDue?.index, 1);
  // floor(30 / 7) = 4 legs land in any thirty day stretch.
  is("capital per thirty days", fresh.courses[0].per30, 1600);

  // Two weeks in with nothing filled: leg 3 is due, legs 1 and 2 have lapsed.
  const drifted = derive([courseSet(T0, 25)], day(14));
  is("leg three is the one to act on", drifted.activeCourse?.nextDue?.index, 3);
  is("two legs lapsed", drifted.activeCourse?.lapsedCount, 2);
  is("nothing placed", drifted.activeCourse?.placed, 0);

  // Filling legs one and two moves the count and the money.
  const kept = derive(
    [
      courseSet(T0, 25),
      open("p1", T0, 400, "core"),
      fill("f1", T0, 1, "p1"),
      open("p2", day(7), 400, "core", true),
      fill("f2", day(7), 2, "p2"),
    ],
    day(14),
  );
  is("two legs filled", kept.activeCourse?.filledCount, 2);
  is("placed", kept.activeCourse?.placed, 800);
  is("no lapses", kept.activeCourse?.lapsedCount, 0);
  is("leg three is due", kept.activeCourse?.nextDue?.index, 3);

  // Stopping ends it without deleting the history.
  const stopped = derive(
    [
      courseSet(T0, 25),
      { id: "st", kind: "course.stop", at: day(20), courseId: "c1" } as LedgerEvent,
    ],
    day(30),
  );
  is("no longer active", stopped.activeCourse, null);
  is("still on the record", stopped.courses.length, 1);
  is("nothing due", stopped.courseDue.length, 0);

  // Open ended terminates rather than generating forever.
  const openEnded = derive([courseSet(T0, 0)], day(400));
  is("schedule is bounded", openEnded.courses[0].schedule.length, 60);

  // A later instruction replaces the terms without a second course appearing.
  const changed = derive(
    [
      courseSet(T0, 25),
      { ...(courseSet(day(10), 12, 14, 1000) as object), id: "cs2" } as LedgerEvent,
    ],
    day(10),
  );
  is("still one course", changed.courses.length, 1);
  is("new amount", changed.activeCourse?.amount, 1000);
  is("new rhythm", changed.activeCourse?.everyDays, 14);
  is("recomputed per thirty days", changed.activeCourse?.per30, 2000);
}

console.log("\n10. A balance funded placement cannot exceed the balance");
{
  // Pure first: the figure the form shows is the figure the write refuses on.
  is("exact fit is not short", fundingShortfall(1000, 1000), 0);
  is("a cent of accrual slack is tolerated", fundingShortfall(1000, 999.995), 0);
  is("a real gap is reported whole", fundingShortfall(1000, 900), 100);
  is("a gap past the tolerance is not shaved", fundingShortfall(1000, 999.9), 0.1);
  is("nothing available means the whole amount", fundingShortfall(400, 0), 400);

  // And at the write. This browserless run holds no log, so the balance is
  // empty and a placement funded from it must be refused rather than clamped.
  const refused = openPosition({
    amount: 1000,
    tierId: "signal",
    asset: "USD",
    network: "Account balance",
    fromAvailable: true,
  });
  is("refused", refused.ok, false);
  if (!refused.ok) {
    is("reason", refused.reason, "insufficient-balance");
    is("available named", refused.available, 0);
    is("shortfall named", refused.shortfall, 1000);
  }

  // External capital is not checked against the balance, because none of it
  // comes from there.
  const external = openPosition({
    amount: 1000,
    tierId: "signal",
    asset: "USDT",
    network: "TRC20",
  });
  is("external capital is written", external.ok, true);

  // An overdraw can still arrive in an imported file, and is reported rather
  // than hidden inside the clamp that keeps `available` at zero.
  const overdrawn = derive(
    [
      open("p1", T0, 1000, "signal"),
      close("x1", day(CYCLE_DAYS), "p1"),
      open("p2", day(CYCLE_DAYS), 1500, "signal", true),
    ],
    day(CYCLE_DAYS),
  );
  is("balance never goes negative", overdrawn.available, 0);
  is("the overdraw is named", overdrawn.overdrawn, 500);
  const sound = derive([open("p1", T0, 1000, "signal")], day(1));
  is("a sound log overdraws nothing", sound.overdrawn, 0);
}

console.log("\n11. A roll carries claimable, not accrued");
{
  // Claimed at the halfway mark, then withdrawn, so the cash is genuinely gone.
  const base: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    claim("c1", day(15), "p1", 150),
    withdraw("w1", day(15), 150),
  ];
  const p = derive(base, day(CYCLE_DAYS)).positions[0];
  is("accrued is the whole term", p.accrued, 300);
  is("claimed", p.claimed, 150);
  is("claimable is what is left", p.claimable, 150);
  is("the carry is principal plus claimable", carryOf(p), 1150);
  is("principal only leaves the reward", carryOf(p, "principal"), 1000);

  // The roll as the ledger records it: claim the rest, close, re-place 1150.
  const rolled = derive(
    [
      ...base,
      claim("c2", day(CYCLE_DAYS), "p1", 150),
      close("x1", day(CYCLE_DAYS), "p1"),
      open("p2", day(CYCLE_DAYS), 1150, "signal", true),
    ],
    day(CYCLE_DAYS),
  );
  is("the balance covers it exactly", rolled.available, 0);
  is("nothing is overdrawn", rolled.overdrawn, 0);
  is("portfolio is the carry", rolled.portfolioValue, 1150);
  is("net gain is the reward less nothing", rolled.netGain, 300);

  // The same log carrying `accrued` instead. The extra 150 is money that was
  // claimed and withdrawn, so the ledger cannot fund it: this is the bug.
  const overcarried = derive(
    [
      ...base,
      claim("c2", day(CYCLE_DAYS), "p1", 150),
      close("x1", day(CYCLE_DAYS), "p1"),
      open("p2", day(CYCLE_DAYS), 1300, "signal", true),
    ],
    day(CYCLE_DAYS),
  );
  is("carrying accrued overdraws by the withdrawn claim", overcarried.overdrawn, 150);
}

console.log("\n12. A roll is one batch, and the same batch a relay fires");
{
  const events: LedgerEvent[] = [open("p1", T0, 1000, "signal"), claim("c1", day(15), "p1", 150)];
  const snap = derive(events, day(CYCLE_DAYS));
  const p = snap.positions[0];

  const roll = rollPosition(p);
  is("a matured term rolls", roll !== null, true);
  if (roll) {
    is("one batch of three", roll.events.length, 3);
    is("claim first", roll.events[0].kind, "claim");
    is("then the close", roll.events[1].kind, "close");
    is("then the open", roll.events[2].kind, "open");
    is("the carry is claimable, not accrued", roll.carry, 1150);
    const opened = roll.events[2];
    if (opened.kind === "open") {
      is("the new term opens with the carry", opened.amount, 1150);
      is("funded from the balance", opened.fromAvailable, true);
      is("and is the position the caller is sent to", opened.id, roll.positionId);
    }
  }

  // A term still running has nothing to carry, and there is no early exit.
  is("an unmatured term does not roll", rollPosition(derive(events, day(10)).positions[0]), null);

  // The relay writes the same batch plus the re-arm, so the two paths cannot
  // drift apart on what a carry is.
  const armed = derive(
    [
      ...events,
      { id: "r1", kind: "relay.set", at: day(1), positionId: "p1", mode: "full" } as LedgerEvent,
    ],
    day(CYCLE_DAYS),
  );
  const fired = fireRelay(armed.relays[0], armed.positions[0]);
  is("the relay batch re-arms as well", fired.length, 4);
  is("last event is the new instruction", fired[3].kind, "relay.set");
  const relayOpen = fired[2];
  if (relayOpen.kind === "open") {
    is("both paths carry the same figure", relayOpen.amount, 1150);
  }
  is("and it is the figure the panel quotes", armed.relays[0].carries, 1150);

  // Settling is a batch for the same reason: a claim without its close leaves
  // a position that looks open and holds nothing.
  const settled = settlePosition(p);
  is("settle is claim then close", settled.length, 2);
  is("claim", settled[0].kind, "claim");
  is("close", settled[1].kind, "close");
}

console.log("\n13. A roll reads as a roll, and an instruction as an instruction");
{
  const deposit = open("p1", T0, 1000, "signal");
  const roll = open("p2", T0, 1000, "signal", true);
  is("a deposit is a placement", classify(deposit), "placement");
  is("a balance funded open is a roll", classify(roll), "roll");
  is("and the two are told apart", isRoll(deposit) === isRoll(roll), false);
  is("claims", classify(claim("c", T0, "p1", 10)), "claim");
  is("withdrawals", classify(withdraw("w", T0, 10)), "withdrawal");
  is("settlements", classify(close("x", T0, "p1")), "settlement");
  is(
    "arming a relay moves nothing",
    classify({ id: "r", kind: "relay.set", at: T0, positionId: "p1", mode: "full" } as LedgerEvent),
    "instruction",
  );
  is(
    "nor does setting a course",
    classify({ id: "cs", kind: "course.stop", at: T0, courseId: "c1" } as LedgerEvent),
    "instruction",
  );
}

console.log("\n14. Scheduled capital is not deployed capital");
{
  const later = day(5);
  const scheduled: LedgerEvent = {
    id: "p1",
    kind: "open",
    at: T0,
    amount: 1000,
    tierId: "signal",
    asset: "USDT",
    network: "TRC20",
    startsAt: later,
  } as LedgerEvent;

  const before = derive([scheduled], day(2));
  is("nothing is deployed", before.deployed, 0);
  is("the principal is scheduled", before.scheduled, 1000);
  is("it is still the member's money", before.portfolioValue, 1000);
  is("it accrues nothing", before.rewardsAccrued, 0);
  is("and adds nothing to the daily rate", before.dailyRate, 0);
  is("a term that has not begun is not a peak", before.peakDeployed, 0);
  is("standing rests on the contribution", before.standing, 1000);
  is("the position knows it has not started", before.positions[0].started, false);

  const running = derive([scheduled], later + 10 * DAY_MS);
  is("once begun it is deployed", running.deployed, 1000);
  is("and nothing is scheduled", running.scheduled, 0);
  is("accrual runs from the start date", running.rewardsAccrued, 1000 * DAILY_RATE * 10);
  is(
    "maturity follows the start date",
    running.positions[0].maturesAt,
    later + CYCLE_DAYS * DAY_MS,
  );
  is("peak deployed follows too", running.peakDeployed, 1000);

  // One leg running and one still to start: the two figures never overlap.
  const both = derive([open("p0", T0, 400, "core"), scheduled], day(2));
  is("deployed is the started leg", both.deployed, 400);
  is("scheduled is the other", both.scheduled, 1000);
  is("portfolio holds both", both.portfolioValue, 1400 + both.rewardsPending);
}

console.log("\n15. What an early exit would cost, in dollars");
{
  const p = derive([open("p1", T0, 1000, "signal"), claim("c1", day(5), "p1", 50)], day(10))
    .positions[0];
  const exit = earlyExit(p);
  is("principal comes back", exit.principal, 1000);
  is("unclaimed accrual is forfeited", exit.forfeited, 50);
  is("the rest of the term is never earned", exit.foregone, 200);
  is("days still to run", exit.daysRemaining, 20);
  // Claimed, forfeited and never earned account for the whole term reward.
  is("the three account for the term", p.claimed + exit.forfeited + exit.foregone, p.termReward);

  const atMaturity = earlyExit(
    derive([open("p1", T0, 1000, "signal")], day(CYCLE_DAYS)).positions[0],
  );
  is("nothing is foregone at maturity", atMaturity.foregone, 0);
}

console.log("\n16. Insight quotes figures that add up");
{
  // The gap is measured from standing as it will be printed, so the two
  // figures on screen and the tier entry are one sum.
  for (const standing of [1690, 1690.4, 1690.5, 2999.4, 1000.06]) {
    const { shown, gap } = tierProximity(standing, 3000);
    is(`${standing} adds up`, shown + gap, 3000);
  }
  is("a compounded standing rounds up", tierProximity(1690.6, 3000).shown, 1691);
  is("and the gap follows it", tierProximity(1690.6, 3000).gap, 1309);
  // Rounding the two figures apart is what used to break: on a half cent both
  // round up and the sentence reads one dollar over the entry it names.
  is("rounding them apart does not add up", Math.round(2600.5) + Math.round(3000 - 2600.5), 3001);
  const half = tierProximity(2600.5, 3000);
  is("rounding once does", half.shown + half.gap, 3000);

  // A member who compounded: standing is the peak, not the contribution, and
  // the sentence has to say so or the figures look invented.
  const compounded = derive(
    [
      open("p1", T0, 2000, "signal"),
      claim("c1", day(CYCLE_DAYS), "p1", 600),
      close("x1", day(CYCLE_DAYS), "p1"),
      open("p2", day(CYCLE_DAYS), 2600, "signal", true),
    ],
    day(CYCLE_DAYS + 1),
  );
  is("standing is the peak", compounded.standing, 2600);
  is("contribution is the deposit", compounded.contributed, 2000);
  const tier = buildInsights(compounded, day(CYCLE_DAYS + 1)).find(
    (i) => i.id === "tier-proximity",
  );
  is("the proximity insight is raised", tier !== undefined, true);
  is("titles the gap", tier?.title, "$400 from Vector");
  is("names the standing it measured", tier?.body.includes("$2,600"), true);
  is("names the entry", tier?.body.includes("$3,000"), true);
  is("and says which of the two standing is", tier?.body.includes("at work at one time"), true);

  // A member who only ever deposited reads the other half of the same rule.
  const deposited = derive([open("p1", T0, 2600, "vector")], day(1));
  const plain = buildInsights(deposited, day(1)).find((i) => i.id === "tier-proximity");
  is("standing is the contribution", deposited.standing, 2600);
  is("named as what came in", plain?.body.includes("everything you have brought in"), true);
}

console.log("\n17. Insight has a rule for a relay that has come due");
{
  const events: LedgerEvent[] = [
    open("p1", T0, 1000, "signal"),
    { id: "r1", kind: "relay.set", at: day(1), positionId: "p1", mode: "full" } as LedgerEvent,
  ];
  const now = day(CYCLE_DAYS + 2);
  const snap = derive(events, now);
  const list = buildInsights(snap, now);
  const relay = list.find((i) => i.id === "relay-due");

  is("the rule fires", relay !== undefined, true);
  is("it outranks everything but a matured term", list[0].id, "relay-due");
  is("it names the carry", relay?.body.includes("$1,300"), true);
  is("and what the delay costs a day", relay?.body.includes("$13.00"), true);
  is("the action is to run it", relay?.action?.label, "Fire it now");

  // The same position must not also be reported as idle and matured, or the
  // one sum of capital is counted in two insights at once.
  is(
    "the matured rule stands down",
    list.some((i) => i.id === "matured-idle"),
    false,
  );

  // With no relay armed, the matured rule takes over and now points at arming
  // one rather than at a review.
  const bare = derive([open("p1", T0, 1000, "signal")], now);
  const matured = buildInsights(bare, now).find((i) => i.id === "matured-idle");
  is("matured is reported", matured !== undefined, true);
  is("and the advice is the relay", matured?.action?.label, "Arm a relay");
  is("which points at the position", matured?.action?.to, "/app/vaults/p1");
  is("the body offers all three moves", matured?.body.includes("arm a relay"), true);
}

console.log("\n18. The persisted envelope, and which log wins");
{
  const events = [open("p1", T0, 1000, "signal"), close("x1", day(CYCLE_DAYS), "p1")];

  // A bare array is what this product wrote before the envelope existed. It
  // reads unchanged, and it reads as unowned.
  const legacy = parseStore(JSON.stringify(events));
  is("legacy events survive", legacy.events.length, 2);
  is("in order", legacy.events[0].id, "p1");
  is("at the current schema", legacy.v, LEDGER_SCHEMA);
  is("with no owner", legacy.owner, null);
  is("and a write time evidenced by the log", legacy.updatedAt, day(CYCLE_DAYS));
  is("the derivation is identical", derive(legacy.events, day(CYCLE_DAYS)).contributed, 1000);

  // The envelope round trips.
  const store: LedgerStore = {
    v: LEDGER_SCHEMA,
    owner: "rigel-member",
    updatedAt: day(1),
    count: 2,
    events,
  };
  const round = parseStore(serialiseStore(store));
  is("owner survives", round.owner, "rigel-member");
  is("count survives", round.count, 2);
  is("events survive", round.events.length, 2);

  // A count that disagrees with the events read is how a truncated write shows
  // itself. It is preserved rather than recomputed, so the discrepancy lasts.
  const truncated = parseStore(JSON.stringify({ ...store, count: 5 }));
  is("the events that survived are read", truncated.events.length, 2);
  is("and the count still says what was written", truncated.count, 5);

  // Nothing readable means nothing, never a throw and never a guess.
  is("no value", parseStore(null).events.length, 0);
  is("not json", parseStore("{oh no").events.length, 0);
  is("not a log", parseStore(JSON.stringify({ hello: true })).events.length, 0);
  is(
    "entries that are not events are dropped",
    parseStore(JSON.stringify([{ nope: 1 }, events[0]])).events.length,
    1,
  );

  // Rule 1 and 2: the union, ordered, with the held copy winning an id clash.
  const mine: LedgerStore = { ...store, owner: null, events: [events[0]] };
  const theirs: LedgerStore = {
    ...store,
    owner: null,
    updatedAt: day(2),
    events: [events[1], open("p2", day(2), 400, "core")],
  };
  const merged = mergeStores(mine, theirs);
  is("the merge is allowed", merged.ok, true);
  if (merged.ok) {
    is("nothing is lost", merged.store.events.length, 3);
    is("two were added", merged.added, 2);
    is("ordered by time", merged.store.events[0].id, "p1");
    is("then the next", merged.store.events[1].id, "p2");
    is("write time is the later of the two", merged.store.updatedAt, day(2));
    is("and the figures replay", derive(merged.store.events, day(CYCLE_DAYS)).contributed, 1400);
  }

  const twice = mergeStores(mine, mine);
  is("merging a log with itself adds nothing", twice.ok && twice.added, 0);

  // Rule 4: an unowned log adopts an owner it is offered.
  const adopting = mergeStores(mine, { ...theirs, owner: "rigel-member" });
  is("the unowned side adopts", adopting.ok && adopting.store.owner, "rigel-member");

  // Rule 3: two members' logs never join.
  const clash = mergeStores({ ...mine, owner: "one" }, { ...theirs, owner: "two" });
  is("refused", clash.ok, false);
  is("because of the owner", !clash.ok && clash.reason, "owner");

  // Rule 5: a newer schema is refused rather than rewritten and truncated.
  const newer = mergeStores(mine, { ...theirs, v: LEDGER_SCHEMA + 1 });
  is("refused", newer.ok, false);
  is("because of the schema", !newer.ok && newer.reason, "schema");
}

console.log("\n19. The ladder still differs on settlement alone");
{
  // Nothing built above may introduce a second rate. The same principal on
  // every rung accrues the same amount a day, read through the real engine
  // rather than off the tier table.
  const perDay = new Set(
    TIERS.map((t) => derive([open(`p-${t.id}`, T0, 1000, t.id)], day(1)).dailyRate),
  );
  is("one rate across six rungs", perDay.size, 1);
  is("and it is the published one", [...perDay][0], 1000 * DAILY_RATE);
  is("six rungs", TIERS.length, 6);
  is("settlement is what differs", new Set(TIERS.map((t) => t.settlementHours)).size, 6);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
