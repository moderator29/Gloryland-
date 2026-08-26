/**
 * Echelon: one sum placed as several terms that start days apart.
 *
 * A formation rather than a control. The name is the shape it makes on
 * Horizon, where each maturity is set back from the one ahead by a fixed
 * interval, and it keeps this concept apart from Ladder, which is the tier
 * progression and not this at all.
 *
 * Nothing here writes to the ledger and nothing here schedules anything. The
 * planner is arithmetic over the tier ladder, the two components render it,
 * and a leg becomes a real position only when the member opens it.
 */

export { Schedule, type ScheduleProps } from "./Schedule";
export { Compare, type CompareProps } from "./Compare";
export {
  echelon,
  validate,
  evenSpacing,
  legChoices,
  spacingChoices,
  runningAt,
  deployedAt,
  MIN_LEGS,
  MIN_SPACING_DAYS,
  MAX_SPACING_DAYS,
  type EchelonPlan,
  type EchelonLeg,
  type EchelonProblem,
  type AccrualPoint,
  type Comparison,
  type Steady,
  type Validity,
} from "./plan";
