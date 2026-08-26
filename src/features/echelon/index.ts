/**
 * Echelon: what splitting one sum into placements days apart costs.
 *
 * It was a formation once. One sum placed as several terms that started days
 * apart returned capital on several dates instead of one, and the argument was
 * the stagger of those maturities. There are no maturities now, and liquidity
 * is a member level window rather than a position level one, so the argument
 * does not survive: the only thing a stagger changes is that the later legs
 * accrue nothing while they wait.
 *
 * What is left is the arithmetic of that cost, and a surface honest enough to
 * show it and recommend against itself. `plan` is the arithmetic, `Compare`
 * renders it.
 *
 * Nothing here writes to the ledger and nothing here schedules anything. A leg
 * becomes a real position only when the member opens it.
 */

export { Compare, type CompareProps } from "./Compare";
export {
  echelon,
  validate,
  legChoices,
  spacingChoices,
  MIN_LEGS,
  MIN_SPACING_DAYS,
  MAX_SPACING_DAYS,
  type EchelonPlan,
  type EchelonLeg,
  type EchelonProblem,
  type Comparison,
  type Validity,
} from "./plan";
