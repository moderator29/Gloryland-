import { MarketPanel } from "@/features/market";

export default function Market() {
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Reference</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Markets</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-low)]">
          Live prices for the assets you can fund with. Open any asset for the full chart and its
          deposit address.
        </p>
      </div>
      <MarketPanel />
    </div>
  );
}
