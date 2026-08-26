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

import { derive, DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE } from "@/domain/tiers";

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
      id: "cs", kind: "course.set", at, courseId: "c1", amount, everyDays: every,
      legs, startAt: at, asset: "USDT", network: "TRC20",
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
    [courseSet(T0, 25), { id: "st", kind: "course.stop", at: day(20), courseId: "c1" } as LedgerEvent],
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
    [courseSet(T0, 25), { ...(courseSet(day(10), 12, 14, 1000) as object), id: "cs2" } as LedgerEvent],
    day(10),
  );
  is("still one course", changed.courses.length, 1);
  is("new amount", changed.activeCourse?.amount, 1000);
  is("new rhythm", changed.activeCourse?.everyDays, 14);
  is("recomputed per thirty days", changed.activeCourse?.per30, 2000);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
