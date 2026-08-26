/**
 * Course: an amount and a rhythm, with a date on every placement between here
 * and the rung the member is aiming at.
 *
 * The events live in `@/domain/ledger` with everything else, because a course
 * is part of the same append only log rather than a store of its own.
 */
export { Rungs } from "./Rungs";
export type { RungsProps } from "./Rungs";
export { Schedule } from "./Schedule";
export type { ScheduleProps } from "./Schedule";
export {
  planCourse,
  planForCourse,
  planProblem,
  INTERVALS,
  MIN_LEG,
  MAX_EVERY_DAYS,
} from "./rungs";
export type { Plan, Rung } from "./rungs";
