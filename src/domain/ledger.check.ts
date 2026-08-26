/**
 * Assertions over the derivation, run against the real `derive`.
 *
 * These exist because the figures here are the product. A UI bug shows a wrong
 * colour; a derivation bug shows a member a balance they do not have. Case 2
 * is the regression that prompted the suite: an `open` never debited the
 * account balance, so closing a position and re-placing the same capital
 * counted it twice and the portfolio doubled on every fold.
 *
 * The economics changed underneath this file once already. Capital used to run
 * a fixed thirty day term at 1% a day and stop. It now accrues 30% a day for as
 * long as it is left in place, with no term and no maturity, and liquidity is a
 * withdrawal window rather than an end date. Section 7 and section 20 exist so
 * that neither half of that can quietly drift back.
 *
 * Run with `npm run check`.
 */

import {
  carryOf,
  classify,
  closeValue,
  compoundPosition,
  derive,
  fireRelay,
  fundingShortfall,
  isRoll,
  mergeStores,
  openPosition,
  parseStore,
  relayFiresAt,
  serialiseStore,
  settlePosition,
  withdrawWindow,
  DAY_MS,
  LEDGER_SCHEMA,
  RELAY_MIN_DAYS,
  type LedgerEvent,
  type LedgerStore,
} from "@/domain/ledger";
import { buildInsights, tierProximity } from "@/domain/insights";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS, dailyReward } from "@/domain/tiers";

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
const arm = (id: string, at: number, positionId: string, mode: "full" | "principal" = "full") =>
  ({ id, kind: "relay.set", at, positionId, mode }) as LedgerEvent;

console.log("\n1. A fresh external deposit");
{
  const s = derive([open("p1", T0, 1000, "vector")], day(10));
  is("deployed", s.deployed, 1000);
  is("contributed", s.contributed, 1000);
  is("available", s.available, 0);
  is("accrued 10d", s.rewardsAccrued, 1000 * DAILY_RATE * 10);
  is("which is the published rate ten times over", s.rewardsAccrued, 3000);
  is("portfolioValue", s.portfolioValue, 1000 + 3000);
  is("dailyRate", s.dailyRate, 300);
  is("peakDeployed", s.peakDeployed, 1000);
  is("standing", s.standing, 1000);
  is("days elapsed is not capped", s.positions[0].daysElapsed, 10);
}

console.log("\n2. The fold that used to double count");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 1000, "vector"),
    claim("c1", day(2), "p1", 600),
    close("x1", day(2), "p1"),
    open("p2", day(2), 1600, "vector", true),
  ];
  const s = derive(ev, day(2));
  is("deployed", s.deployed, 1600);
  is("available after the fold", s.available, 0);
  is("portfolioValue is the real 1600", s.portfolioValue, 1600);
  is("contributed is external only", s.contributed, 1000);
  is("peakDeployed", s.peakDeployed, 1600);
  is("standing", s.standing, 1600);
  is("netGain", s.netGain, 600);
  is("nothing is overdrawn", s.overdrawn, 0);
}

console.log("\n3. Circling the same money never buys a tier");
{
  const ev: LedgerEvent[] = [];
  for (let i = 0; i < 5; i++) {
    ev.push(open(`p${i}`, day(i * 2), 1000, "vector", i > 0));
    ev.push(close(`x${i}`, day((i + 1) * 2), `p${i}`));
  }
  const s = derive(ev, day(10));
  is("contributed stays at the one real deposit", s.contributed, 1000);
  is("peakDeployed never exceeds one position", s.peakDeployed, 1000);
  is("standing", s.standing, 1000);
  is("tier is the rung one deposit buys, not five", s.tier?.id, "vector");
}

console.log("\n4. Compounding does raise standing");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 1000, "vector"),
    claim("c1", day(1), "p1", 300),
    close("x1", day(1), "p1"),
    open("p2", day(1), 1300, "vector", true),
    claim("c2", day(2), "p2", 390),
    close("x2", day(2), "p2"),
    open("p3", day(2), 1690, "compass", true),
  ];
  const s = derive(ev, day(2));
  is("deployed", s.deployed, 1690);
  is("available", s.available, 0);
  is("portfolioValue", s.portfolioValue, 1690);
  is("peakDeployed", s.peakDeployed, 1690);
  is("standing follows the peak", s.standing, 1690);
  is("contributed still external only", s.contributed, 1000);
  is("the tier follows the standing", s.tier?.id, "compass");
}

console.log("\n5. Closing and withdrawing");
{
  const ev: LedgerEvent[] = [
    open("p1", T0, 5000, "apex"),
    claim("c1", day(1), "p1", 1500),
    close("x1", day(1), "p1"),
    withdraw("w1", day(2), 6500),
  ];
  const s = derive(ev, day(2));
  is("available drains", s.available, 0);
  is("withdrawn", s.withdrawn, 6500);
  is("portfolioValue", s.portfolioValue, 0);
  is("netGain", s.netGain, 1500);
  is("standing survives the exit", s.standing, 5000);
  is("tier held", s.tier?.id, "apex");
}

console.log("\n6. Legacy events with no funding flag read as external");
{
  const s = derive([open("p1", T0, 3000, "azimuth")], day(1));
  is("contributed", s.contributed, 3000);
  is("available", s.available, 0);
  is("standing", s.standing, 3000);
  is("tier", s.tier?.id, "azimuth");
}

console.log("\n7. Accrual stops when the position closes, and at nothing else");
{
  const early = derive([open("p1", T0, 1000, "vector"), close("x", day(10), "p1")], day(25));
  is("frozen at settlement", early.rewardsAccrued, 1000 * DAILY_RATE * 10);
  is("and not a day further", early.rewardsAccrued, 3000);
  is("the close date is carried", early.positions[0].closedAt, day(10));
  is(
    "an open position has none",
    derive([open("p1", T0, 1000, "vector")], day(1)).positions[0].closedAt,
    null,
  );

  // The old model stopped dead on day 30. Nothing stops now, so a run past that
  // date has to keep climbing in exact proportion to the days it ran.
  const atThirty = derive([open("p1", T0, 1000, "vector")], day(30));
  const atThirtyOne = derive([open("p1", T0, 1000, "vector")], day(31));
  const atSixty = derive([open("p1", T0, 1000, "vector")], day(60));
  const atYear = derive([open("p1", T0, 1000, "vector")], day(365));
  is("thirty days", atThirty.rewardsAccrued, 1000 * DAILY_RATE * 30);
  is("day thirty one earns another full day", atThirtyOne.rewardsAccrued, 1000 * DAILY_RATE * 31);
  is(
    "it is strictly more than day thirty",
    atThirtyOne.rewardsAccrued > atThirty.rewardsAccrued,
    true,
  );
  is("sixty days is exactly twice thirty", atSixty.rewardsAccrued, atThirty.rewardsAccrued * 2);
  is("a full year keeps accruing", atYear.rewardsAccrued, 1000 * DAILY_RATE * 365);
  is("and the position is still counted as deployed", atYear.deployed, 1000);
  is("still earning its daily rate", atYear.dailyRate, 300);
  is("having run 365 days", atYear.positions[0].daysElapsed, 365);

  // Accrual is linear in the days, so any two spans are in exact ratio.
  const a = derive([open("p1", T0, 2500, "sextant")], day(7)).rewardsAccrued;
  const b = derive([open("p1", T0, 2500, "sextant")], day(21)).rewardsAccrued;
  is("three times the days is three times the reward", b, a * 3);
}

console.log("\n8. Relays fold accrued reward back into principal");
{
  const armed: LedgerEvent[] = [open("p1", T0, 1000, "vector"), arm("r1", T0, "p1")];

  const beforeADay = derive(armed, day(0.5));
  is("armed", beforeADay.relaysArmed.length, 1);
  is("not due inside the first day", beforeADay.relaysDue.length, 0);
  is("it fires once a whole day has accrued", beforeADay.relays[0].firesAt, day(RELAY_MIN_DAYS));

  const later = derive(armed, day(3));
  is("due once a day of reward is waiting", later.relaysDue.length, 1);
  is("carries principal plus the reward", later.relaysDue[0].carries, 1900);
  is("which is the reward three days earned", later.positions[0].claimable, 900);
  is("waiting two days past its fire date", later.relaysDue[0].overdueDays, 2);
  is("the unfolded reward forgoes its own accrual", later.relayForgoneDaily, 270);
  is("relayCarry", later.relayCarry, 1900);

  // A harvest moves the reward alone: the principal is untouched and keeps
  // accruing, so nothing is forgone by waiting.
  const harvest = derive(
    [open("p1", T0, 1000, "vector"), arm("r1", T0, "p1", "principal")],
    day(3),
  );
  is("a harvest moves the reward only", harvest.relaysDue[0].carries, 900);
  is("and forgoes nothing by waiting", harvest.relayForgoneDaily, 0);

  // A later clear wins over an earlier set.
  const cleared = derive(
    [...armed, { id: "r2", kind: "relay.clear", at: day(0.5), positionId: "p1" } as LedgerEvent],
    day(3),
  );
  is("disarmed", cleared.relaysArmed.length, 0);
  is("nothing due", cleared.relaysDue.length, 0);

  // A claim lowers what the relay can move, because it moves what is actually
  // left rather than everything the position ever generated.
  const partlyClaimed = derive([...armed, claim("c1", day(1), "p1", 150)], day(3));
  is("carries principal plus what remains", partlyClaimed.relaysDue[0].carries, 1750);
  is(
    "and the next fold is pushed out by what was claimed",
    partlyClaimed.relays[0].firesAt,
    day(1.5),
  );

  // A position that has not started has nothing to fold and cannot be due.
  const scheduled = derive(
    [
      {
        id: "p1",
        kind: "open",
        at: T0,
        amount: 1000,
        tierId: "vector",
        asset: "USDT",
        network: "TRC20",
        startsAt: day(5),
      } as LedgerEvent,
      arm("r1", T0, "p1"),
    ],
    day(2),
  );
  is("armed but not started", scheduled.relaysArmed.length, 1);
  is("nothing is due", scheduled.relaysDue.length, 0);

  // A closed position cannot hold a live instruction.
  const closed = derive([...armed, close("x1", day(2), "p1")], day(4));
  is("closing disarms it", closed.relaysArmed.length, 0);
  is("and nothing is due", closed.relaysDue.length, 0);

  // Firing writes the batch, and the result must not double count.
  const fired: LedgerEvent[] = [
    open("p1", T0, 1000, "vector"),
    arm("r1", T0, "p1"),
    claim("c1", day(2), "p1", 600),
    close("x1", day(2), "p1"),
    open("p2", day(2), 1600, "vector", true),
    arm("r2", day(2), "p2"),
  ];
  const after = derive(fired, day(2));
  is("portfolio is the real folded figure", after.portfolioValue, 1600);
  is("balance is empty", after.available, 0);
  is("contribution unchanged", after.contributed, 1000);
  is("the chain rearmed itself", after.relaysArmed.length, 1);
  is("rearmed on the new position", after.relaysArmed[0].positionId, "p2");
  is("and the new position is not due again yet", after.relaysDue.length, 0);
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
      open("p2", day(7), 400, "core"),
      fill("f2", day(7), 2, "p2"),
    ],
    day(14),
  );
  is("two legs filled", kept.activeCourse?.filledCount, 2);
  is("placed", kept.activeCourse?.placed, 800);
  is("no lapses", kept.activeCourse?.lapsedCount, 0);
  is("leg three is due", kept.activeCourse?.nextDue?.index, 3);
  is("and both placements are accruing", kept.deployed, 800);

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
    tierId: "vector",
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
    tierId: "vector",
    asset: "USDT",
    network: "TRC20",
  });
  is("external capital is written", external.ok, true);

  // An overdraw can still arrive in an imported file, and is reported rather
  // than hidden inside the clamp that keeps `available` at zero.
  const overdrawn = derive(
    [
      open("p1", T0, 1000, "vector"),
      close("x1", day(2), "p1"),
      open("p2", day(2), 1500, "compass", true),
    ],
    day(2),
  );
  is("balance never goes negative", overdrawn.available, 0);
  is("the overdraw is named", overdrawn.overdrawn, 500);
  const sound = derive([open("p1", T0, 1000, "vector")], day(1));
  is("a sound log overdraws nothing", sound.overdrawn, 0);
}

console.log("\n11. A fold carries claimable, not accrued");
{
  // Claimed on day one, then withdrawn, so the cash is genuinely gone.
  const base: LedgerEvent[] = [
    open("p1", T0, 1000, "vector"),
    claim("c1", day(1), "p1", 150),
    withdraw("w1", day(1), 150),
  ];
  const p = derive(base, day(2)).positions[0];
  is("accrued is every day it ran", p.accrued, 600);
  is("claimed", p.claimed, 150);
  is("claimable is what is left", p.claimable, 450);
  is("the carry is principal plus claimable", carryOf(p), 1450);
  is("a harvest moves the reward alone", carryOf(p, "principal"), 450);

  // The fold as the ledger records it: claim the rest, close, re-place 1450.
  const folded = derive(
    [
      ...base,
      claim("c2", day(2), "p1", 450),
      close("x1", day(2), "p1"),
      open("p2", day(2), 1450, "vector", true),
    ],
    day(2),
  );
  is("the balance covers it exactly", folded.available, 0);
  is("nothing is overdrawn", folded.overdrawn, 0);
  is("portfolio is the folded figure", folded.portfolioValue, 1450);
  is("net gain is everything accrued", folded.netGain, 600);

  // The same log carrying `accrued` instead. The extra 150 is money that was
  // claimed and withdrawn, so the ledger cannot fund it: this is the bug.
  const overcarried = derive(
    [
      ...base,
      claim("c2", day(2), "p1", 450),
      close("x1", day(2), "p1"),
      open("p2", day(2), 1600, "compass", true),
    ],
    day(2),
  );
  is("carrying accrued overdraws by the withdrawn claim", overcarried.overdrawn, 150);
}

console.log("\n12. A fold is one batch, and the same batch a relay fires");
{
  const events: LedgerEvent[] = [open("p1", T0, 1000, "vector"), claim("c1", day(1), "p1", 150)];
  const snap = derive(events, day(2));
  const p = snap.positions[0];

  const folded = compoundPosition(p);
  is("a position with reward on it folds", folded !== null, true);
  if (folded) {
    is("one batch of three", folded.events.length, 3);
    is("claim first", folded.events[0].kind, "claim");
    is("then the close", folded.events[1].kind, "close");
    is("then the open", folded.events[2].kind, "open");
    is("the carry is claimable, not accrued", folded.carry, 1450);
    const opened = folded.events[2];
    if (opened.kind === "open") {
      is("the new position opens with the carry", opened.amount, 1450);
      is("funded from the balance", opened.fromAvailable, true);
      is("and is the position the caller is sent to", opened.id, folded.positionId);
      is("on the rung the folded figure clears", opened.tierId, "vector");
    }
  }

  // Nothing to fold is refused rather than written: three events that change
  // no figure, and the fold clock restarted for free.
  is(
    "a position with no reward does not fold",
    compoundPosition(derive(events, T0).positions[0]),
    null,
  );

  // The relay writes the same batch plus the re-arm, so the two paths cannot
  // drift apart on what a fold is.
  const armed = derive([...events, arm("r1", T0, "p1")], day(2));
  is("the relay is due", armed.relays[0].due, true);
  const fired = fireRelay(armed.relays[0], armed.positions[0]);
  is("the relay batch re-arms as well", fired.length, 4);
  is("last event is the new instruction", fired[3].kind, "relay.set");
  const relayOpen = fired[2];
  if (relayOpen.kind === "open") {
    is("both paths carry the same figure", relayOpen.amount, 1450);
  }
  is("and it is the figure the panel quotes", armed.relays[0].carries, 1450);

  // A harvest is a single claim. The principal is untouched, so there is
  // nothing to close and nothing to re-open.
  const harvest = derive([...events, arm("r1", T0, "p1", "principal")], day(2));
  const harvested = fireRelay(harvest.relays[0], harvest.positions[0]);
  is("a harvest is one event", harvested.length, 1);
  is("and it is a claim", harvested[0].kind, "claim");
  if (harvested[0].kind === "claim") {
    is("of exactly what was left", harvested[0].amount, 450);
  }

  // A relay that is not due writes nothing at all.
  const notDue = derive([open("q1", T0, 1000, "vector"), arm("r9", T0, "q1")], day(0.5));
  is("an undue relay writes nothing", fireRelay(notDue.relays[0], notDue.positions[0]).length, 0);

  // Closing is a batch for the same reason: a claim without its close leaves
  // a position that looks open and holds nothing.
  const settled = settlePosition(p);
  is("settle is claim then close", settled.length, 2);
  is("claim", settled[0].kind, "claim");
  is("close", settled[1].kind, "close");
}

console.log("\n13. A roll reads as a roll, and an instruction as an instruction");
{
  const deposit = open("p1", T0, 1000, "vector");
  const roll = open("p2", T0, 1000, "vector", true);
  is("a deposit is a placement", classify(deposit), "placement");
  is("a balance funded open is a roll", classify(roll), "roll");
  is("and the two are told apart", isRoll(deposit) === isRoll(roll), false);
  is("claims", classify(claim("c", T0, "p1", 10)), "claim");
  is("withdrawals", classify(withdraw("w", T0, 10)), "withdrawal");
  is("settlements", classify(close("x", T0, "p1")), "settlement");
  is("arming a relay moves nothing", classify(arm("r", T0, "p1")), "instruction");
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
    tierId: "vector",
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
  is("a position that has not begun is not a peak", before.peakDeployed, 0);
  is("standing rests on the contribution", before.standing, 1000);
  is("the position knows it has not started", before.positions[0].started, false);

  const running = derive([scheduled], later + 10 * DAY_MS);
  is("once begun it is deployed", running.deployed, 1000);
  is("and nothing is scheduled", running.scheduled, 0);
  is("accrual runs from the start date", running.rewardsAccrued, 1000 * DAILY_RATE * 10);
  is("the days are counted from it too", running.positions[0].daysElapsed, 10);
  is("peak deployed follows too", running.peakDeployed, 1000);

  // One position running and one still to start: the two figures never overlap.
  const both = derive([open("p0", T0, 400, "core"), scheduled], day(2));
  is("deployed is the started one", both.deployed, 400);
  is("scheduled is the other", both.scheduled, 1000);
  is("portfolio holds both", both.portfolioValue, 1400 + both.rewardsPending);
}

console.log("\n15. What closing a position returns, in dollars");
{
  const p = derive([open("p1", T0, 1000, "vector"), claim("c1", day(0.5), "p1", 50)], day(1))
    .positions[0];
  const exit = closeValue(p);
  is("principal comes back", exit.principal, 1000);
  is("unclaimed reward is claimed on the way out", exit.claimable, 250);
  is("the balance receives both", exit.returns, 1250);
  is("and the position stops earning this much a day", exit.forgoneDaily, 300);
  // Claimed and claimable account for everything the position generated. There
  // is no third bucket, because nothing is forfeited and nothing is foregone.
  is("the two account for the accrual", p.claimed + exit.claimable, p.accrued);

  // Nothing about closing depends on how long it ran.
  const long = closeValue(derive([open("p1", T0, 1000, "vector")], day(200)).positions[0]);
  is("a long run returns the same principal", long.principal, 1000);
  is("with two hundred days of reward on it", long.claimable, 1000 * DAILY_RATE * 200);
  is("and the same daily figure it always had", long.forgoneDaily, 300);
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
      open("p1", T0, 1000, "vector"),
      claim("c1", day(1.3), "p1", 390),
      close("x1", day(1.3), "p1"),
      open("p2", day(1.3), 1390, "vector", true),
    ],
    day(1.4),
  );
  is("standing is the peak", compounded.standing, 1390);
  is("contribution is the deposit", compounded.contributed, 1000);
  const tier = buildInsights(compounded, day(1.4)).find((i) => i.id === "tier-proximity");
  is("the proximity insight is raised", tier !== undefined, true);
  is("titles the gap", tier?.title, "$110 from Compass");
  is("names the standing it measured", tier?.body.includes("$1,390"), true);
  is("names the entry", tier?.body.includes("$1,500"), true);
  is("and says which of the two standing is", tier?.body.includes("at work at one time"), true);

  // A member who only ever deposited reads the other half of the same rule.
  const deposited = derive([open("p1", T0, 1390, "vector")], day(0.01));
  const plain = buildInsights(deposited, day(0.01)).find((i) => i.id === "tier-proximity");
  is("standing is the contribution", deposited.standing, 1390);
  is("named as what came in", plain?.body.includes("everything you have brought in"), true);
}

console.log("\n17. Insight has a rule for a relay that has come due");
{
  const events: LedgerEvent[] = [open("p1", T0, 1000, "vector"), arm("r1", T0, "p1")];
  const now = day(3);
  const snap = derive(events, now);
  const list = buildInsights(snap, now);
  const relay = list.find((i) => i.id === "relay-due");

  is("the rule fires", relay !== undefined, true);
  is("it outranks everything else", list[0].id, "relay-due");
  is("it names what is waiting", relay?.body.includes("$1,900"), true);
  is("and what the delay costs a day", relay?.body.includes("$270.00"), true);
  is("the action is to run it", relay?.action?.label, "Fire it now");

  // The same reward must not also be reported as idle, or one sum is counted
  // in two insights at once.
  is(
    "the idle reward rule stands down",
    list.some((i) => i.id === "reward-idle"),
    false,
  );

  // With no relay armed, the idle reward rule takes over.
  const bare = derive([open("p1", T0, 1000, "vector")], now);
  const idle = buildInsights(bare, now).find((i) => i.id === "reward-idle");
  is("idle reward is reported", idle !== undefined, true);
  is("it names the amount sitting still", idle?.title, "$900 in reward is not accruing");
  is("and what folding it in would add", idle?.body.includes("$270.00"), true);
  is("the action offers both moves", idle?.action?.label, "Claim or compound");
  is("which points at rewards", idle?.action?.to, "/app/rewards");

  // An empty log gets the one way in, and it quotes the daily rate rather than
  // any total, because there is no span to total across.
  const first = buildInsights(derive([], now), now);
  is("one insight", first.length, 1);
  is("onboarding", first[0].id, "onboarding");
  is("it names the daily rate", first[0].body.includes("30%"), true);
  is("and the withdrawal interval", first[0].body.includes("every 4 days"), true);
  is("it promises no total", /across the term|at maturity/.test(first[0].body), false);
}

console.log("\n18. The persisted envelope, and which log wins");
{
  const events = [open("p1", T0, 1000, "vector"), close("x1", day(2), "p1")];

  // A bare array is what this product wrote before the envelope existed. It
  // reads unchanged, and it reads as unowned.
  const legacy = parseStore(JSON.stringify(events));
  is("legacy events survive", legacy.events.length, 2);
  is("in order", legacy.events[0].id, "p1");
  is("at the current schema", legacy.v, LEDGER_SCHEMA);
  is("with no owner", legacy.owner, null);
  is("and a write time evidenced by the log", legacy.updatedAt, day(2));
  is("the derivation is identical", derive(legacy.events, day(2)).contributed, 1000);

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
    is("and the figures replay", derive(merged.store.events, day(2)).contributed, 1400);
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

console.log("\n19. The ladder: twenty rungs, one rate, settlement the only column that moves");
{
  // The entries, exactly as published, in order. Written out rather than
  // derived from the table, so a change to the table has to be a deliberate
  // change here too.
  const ENTRIES = [
    300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6500, 8000, 10000, 12500, 15000, 18000,
    22000, 26000, 30000, 35000, 40000,
  ];
  is("twenty rungs", TIERS.length, 20);
  is("twenty entries to match", ENTRIES.length, TIERS.length);
  for (let i = 0; i < ENTRIES.length; i++) {
    is(`entry ${i + 1} is ${ENTRIES[i]}`, TIERS[i].entry, ENTRIES[i]);
    is(`rank ${i + 1}`, TIERS[i].rank, i + 1);
  }
  is("the ladder opens at three hundred", TIERS[0].entry, 300);
  is("and tops out at forty thousand", TIERS[TIERS.length - 1].entry, 40000);
  is("core is first", TIERS[0].id, "core");
  is("sovereign is last", TIERS[TIERS.length - 1].id, "sovereign");

  // Settlement is the one column that moves, and it moves one way.
  is("every rung has its own target", new Set(TIERS.map((t) => t.settlementHours)).size, 20);
  is("the bottom rung targets seventy two hours", TIERS[0].settlementHours, 72);
  is("the top rung targets two", TIERS[TIERS.length - 1].settlementHours, 2);
  for (let i = 1; i < TIERS.length; i++) {
    is(
      `${TIERS[i].name} settles faster than ${TIERS[i - 1].name}`,
      TIERS[i].settlementHours < TIERS[i - 1].settlementHours,
      true,
    );
  }

  // Nothing built above may introduce a second rate. The same principal on
  // every rung accrues the same amount a day, read through the real engine
  // rather than off the tier table.
  const perDay = new Set(
    TIERS.map((t) => derive([open(`p-${t.id}`, T0, 1000, t.id)], day(1)).dailyRate),
  );
  is("one rate across twenty rungs", perDay.size, 1);
  is("and it is the published one", [...perDay][0], 1000 * DAILY_RATE);
  is("the published rate is thirty percent a day", DAILY_RATE, 0.3);
  is("stated per day, not per anything else", dailyReward(1000), 300);

  // The same holds over a long run and at the entry of each rung, so no rung
  // can pay a different multiple of its own size.
  for (const t of TIERS) {
    const s = derive([open(`e-${t.id}`, T0, t.entry, t.id)], day(50));
    is(
      `${t.name} earns its entry times the rate times the days`,
      s.rewardsAccrued,
      t.entry * DAILY_RATE * 50,
    );
    is(
      `${t.name} returns the same multiple of principal`,
      s.rewardsAccrued / t.entry,
      DAILY_RATE * 50,
    );
  }

  // And the top and the bottom, on identical capital, are indistinguishable.
  const bottom = derive([open("b", T0, 40000, TIERS[0].id)], day(90));
  const top = derive([open("t", T0, 40000, TIERS[TIERS.length - 1].id)], day(90));
  is("the same capital earns the same at both ends", bottom.rewardsAccrued, top.rewardsAccrued);
  is("and the same every day", bottom.dailyRate, top.dailyRate);
}

console.log("\n20. Withdrawals open on a four day window");
{
  is("the interval is four days", WITHDRAW_INTERVAL_DAYS, 4);

  // A member who has never withdrawn may withdraw now.
  const fresh = derive([open("p1", T0, 1000, "vector")], day(10));
  is("no request has been made", fresh.lastWithdrawAt, null);
  is("a first withdrawal is allowed immediately", fresh.withdrawAllowed, true);
  is("with nothing to wait for", fresh.daysUntilWithdraw, 0);
  is("and the window reads as open now", fresh.withdrawUnlocksAt, day(10));

  // An empty log is the same: the window is a gap after a request, and there
  // has been no request.
  const empty = derive([], day(3));
  is("an empty log may still withdraw", empty.withdrawAllowed, true);
  is("nothing to wait for", empty.daysUntilWithdraw, 0);

  const events: LedgerEvent[] = [
    open("p1", T0, 1000, "vector"),
    claim("c1", day(1), "p1", 300),
    close("x1", day(1), "p1"),
    withdraw("w1", day(5), 100),
  ];

  const justAfter = derive(events, day(5));
  is("the request is recorded", justAfter.lastWithdrawAt, day(5));
  is("the next one is four days out", justAfter.withdrawUnlocksAt, day(9));
  is("and is not allowed yet", justAfter.withdrawAllowed, false);
  is("four days to wait", justAfter.daysUntilWithdraw, 4);

  const partway = derive(events, day(7));
  is("two days in, two to go", partway.daysUntilWithdraw, 2);
  is("still closed", partway.withdrawAllowed, false);

  const almost = derive(events, day(9) - 1);
  is("a millisecond short is still closed", almost.withdrawAllowed, false);

  const openAgain = derive(events, day(9));
  is("on the fourth day it opens", openAgain.withdrawAllowed, true);
  is("with nothing left to wait", openAgain.daysUntilWithdraw, 0);

  const wellAfter = derive(events, day(40));
  is("and it stays open", wellAfter.withdrawAllowed, true);
  is("the unlock date does not move", wellAfter.withdrawUnlocksAt, day(9));

  // A second request restarts the window from itself, not from the first.
  const twice = derive([...events, withdraw("w2", day(9), 50)], day(10));
  is("the latest request is the one that counts", twice.lastWithdrawAt, day(9));
  is("the window runs from it", twice.withdrawUnlocksAt, day(13));
  is("closed again", twice.withdrawAllowed, false);
  is("three days to wait", twice.daysUntilWithdraw, 3);

  // Requests out of order in the log still resolve to the latest one.
  const shuffled = derive(
    [...events, withdraw("w3", day(9), 50), withdraw("w2", day(7), 25)],
    day(10),
  );
  is("order in the log does not decide it", shuffled.lastWithdrawAt, day(9));
  is("the window still runs from the latest", shuffled.withdrawUnlocksAt, day(13));

  // The pure helper is the same rule, so a planner projecting windows forward
  // cannot disagree with the snapshot.
  is("no prior request is open", withdrawWindow(null, T0).withdrawAllowed, true);
  is("and unlocks now", withdrawWindow(null, T0).withdrawUnlocksAt, T0);
  is("a request locks it", withdrawWindow(T0, T0).withdrawAllowed, false);
  is("for exactly four days", withdrawWindow(T0, T0).withdrawUnlocksAt, day(4));
  is("still locked a moment short", withdrawWindow(T0, day(4) - 1).withdrawAllowed, false);
  is("open on the day", withdrawWindow(T0, day(4)).withdrawAllowed, true);
  is(
    "and the snapshot agrees with it",
    justAfter.withdrawUnlocksAt,
    withdrawWindow(day(5), day(5)).withdrawUnlocksAt,
  );

  // The window is a programme rule, not a rung. It reads identically on every
  // tier, so no amount of standing buys faster access to cash.
  const windows = new Set(
    TIERS.map(
      (t) =>
        derive([open(`p-${t.id}`, T0, t.entry, t.id), withdraw(`w-${t.id}`, day(5), 1)], day(6))
          .daysUntilWithdraw,
    ),
  );
  is("one window across twenty rungs", windows.size, 1);
  is("and it is three days from day six", [...windows][0], 3);

  // Nothing about the window touches accrual: capital keeps earning while the
  // balance waits.
  const stillEarning = derive(
    [open("p1", T0, 1000, "vector"), withdraw("w1", day(5), 0.01)],
    day(6),
  );
  is("the window is closed", stillEarning.withdrawAllowed, false);
  is("and the position is still accruing", stillEarning.dailyRate, 300);
  is("six days of it", stillEarning.rewardsAccrued, 1000 * DAILY_RATE * 6);
}

console.log("\n21. Relay fire dates are derived, never assumed");
{
  const p = derive([open("p1", T0, 1000, "vector")], day(0.25)).positions[0];
  is("a fresh position folds after one whole day", relayFiresAt(p), day(RELAY_MIN_DAYS));
  is("the minimum is one day", RELAY_MIN_DAYS, 1);

  // Claiming pushes the next fold out by exactly what was claimed, measured in
  // days of this position's own accrual.
  const claimedHalf = derive(
    [open("p1", T0, 1000, "vector"), claim("c1", day(0.5), "p1", 150)],
    day(0.6),
  ).positions[0];
  is("half a day claimed pushes the fold half a day out", relayFiresAt(claimedHalf), day(1.5));

  const claimedTwice = derive(
    [open("p1", T0, 1000, "vector"), claim("c1", day(1), "p1", 300), claim("c2", day(2), "p2", 0)],
    day(2),
  ).positions[0];
  is("a whole day claimed pushes it a whole day", relayFiresAt(claimedTwice), day(2));

  // A position that starts later folds later, by the same offset.
  const late = derive(
    [
      {
        id: "p1",
        kind: "open",
        at: T0,
        amount: 1000,
        tierId: "vector",
        asset: "USDT",
        network: "TRC20",
        startsAt: day(5),
      } as LedgerEvent,
    ],
    day(6),
  ).positions[0];
  is("the fold clock starts when accrual does", relayFiresAt(late), day(6));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
