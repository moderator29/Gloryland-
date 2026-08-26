/**
 * Ladder: planning the next position, because the running one is fixed.
 *
 * A term cannot be edited once it starts, so everything here is about what
 * comes next. `plan` holds the arithmetic as pure functions over the ledger
 * snapshot and the tier ladder, `Ladder` shows the rungs still above the
 * member and what they cost, and `TopUp` answers the request to add capital
 * with the only honest version of it: a second position on its own term.
 *
 * Neither component writes to the ledger. Both hand their amount to the
 * deposit flow, which owns that.
 */

export { Ladder, type LadderProps } from "./Ladder";
export { TopUp, type TopUpProps } from "./TopUp";
export {
  planFor,
  ladderSteps,
  stagger,
  maxParts,
  MINIMUM_PLACEMENT,
  TOP_TIER,
  type Plan,
  type LadderStep,
  type StaggerLeg,
  type StaggerPlan,
} from "./plan";
