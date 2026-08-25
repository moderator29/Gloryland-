/** Analytics surface: charts plus the controls that drive them. */

export {
  PerformanceChart,
  type PerformanceChartProps,
  type PerformancePoint,
} from "./PerformanceChart";
export { RewardsChart, type RewardsChartProps, type RewardsBucket } from "./RewardsChart";
export {
  AllocationChart,
  type AllocationChartProps,
  type AllocationSlice,
} from "./AllocationChart";
export { RangeTabs, type RangeTabsProps } from "./RangeTabs";
export { RANGES, type Range } from "./ranges";
export {
  ChartEmpty,
  ChartHeader,
  TooltipShell,
  COMPACT_WIDTH,
  type TooltipRow,
} from "./chartPrimitives";
export { useContainerWidth } from "./useContainerWidth";
