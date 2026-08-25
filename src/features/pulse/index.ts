/**
 * Pulse: the two surfaces that show the member's account in motion.
 *
 * Both read the derived ledger snapshot and nothing else, so neither can show
 * a figure the member did not create.
 */

export { LiveTicker, type LiveTickerProps } from "./LiveTicker";
export { Trajectory, type TrajectoryProps } from "./Trajectory";
