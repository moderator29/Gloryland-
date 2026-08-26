import { forwardRef } from "react";
import { TriangleAlert } from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { assetById, type AssetId } from "@/features/market/assets";
import { CoinLogo } from "@/features/market/CoinLogo";
import { money, fullDate } from "@/components/system/format";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, tierById } from "@/domain/tiers";

export type ReceiptData = {
  reference: string;
  amount: number;
  assetId: AssetId;
  tierId: string;
  at: number;
  units?: number;
};

/**
 * Record of a position, rendered for export.
 *
 * Fixed at a 380px column so the saved image is identical on a phone and a
 * desktop: exporting a fluid layout produces a receipt whose proportions
 * depend on the window that happened to be open. Colours are literal rather
 * than CSS variables because the export rasterises this node outside the
 * app's cascade.
 *
 * WHY THE TYPE IS THE SIZE IT IS. `saveReceipt` renders this node with
 * html2canvas at `scale: 3`, and html2canvas sets the canvas to
 * `width * scale` and then calls `ctx.scale(3, 3)`, so every element is still
 * drawn in CSS pixels onto a canvas with three times the resolution. Scale
 * buys sharpness and nothing else: it does not change how large the type is
 * relative to the receipt, and it cannot change a contrast ratio at all. The
 * disclaimer used to be 9px in #5B6A86, which is about 3.4:1 on this ground
 * and fails AA at any resolution, and it was the only thing on the image
 * saying no money had moved. Nothing here is below 12px, and the disclaimer
 * is the highest contrast text on the card after the amount.
 *
 * WHY IT NO LONGER LOOKS LIKE A TRANSFER. Receipts get forwarded, and a
 * forwarded PNG arrives without the app around it. A green tick and "Status:
 * Recorded" read as a confirmed deposit from a company, so both are gone: the
 * card is marked Preview at the top, states in the status row that nothing
 * moved, and carries the disclaimer in a bordered block that survives a crop.
 */
export const Receipt = forwardRef<HTMLDivElement, { data: ReceiptData }>(function Receipt(
  { data },
  ref,
) {
  const meta = assetById(data.assetId);
  const tier = tierById(data.tierId);

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      style={{ borderBottom: "1px solid rgba(120,160,220,0.13)" }}
    >
      <span
        style={{
          color: "#8494B0",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ color: "#F2F6FF", fontSize: 13, fontWeight: 600, textAlign: "right" }}>
        {children}
      </span>
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 380,
        background: "linear-gradient(180deg, #111829 0%, #080B16 100%)",
        border: "1px solid rgba(120,170,240,0.26)",
        borderRadius: 20,
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Brand, and the one word that has to survive being cropped out of
          context. It sits where a confirmation tick used to. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Mark size={26} glow={false} />
          <div>
            <p style={{ color: "#F2F6FF", fontSize: 15, fontWeight: 600, letterSpacing: "0.18em" }}>
              RIGEL
            </p>
            <p style={{ color: "#7DD3FC", fontSize: 10, letterSpacing: "0.26em", marginTop: 3 }}>
              CAPITAL
            </p>
          </div>
        </div>
        <span
          style={{
            color: "#FBBF24",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            border: "1px solid rgba(251,191,36,0.42)",
            background: "rgba(251,191,36,0.10)",
            borderRadius: 8,
            padding: "4px 8px",
            whiteSpace: "nowrap",
          }}
        >
          PREVIEW
        </span>
      </div>

      <p
        style={{
          color: "#8494B0",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginTop: 20,
        }}
      >
        Position record
      </p>

      {/* Amount */}
      <div className="mt-2 flex items-center gap-3">
        {meta && <CoinLogo asset={meta} size={34} />}
        <div>
          <p
            style={{
              color: "#F2F6FF",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {money(data.amount)}
          </p>
          {/* An equivalent at the day's price, not an amount anybody sent. */}
          {data.units !== undefined && meta && (
            <p style={{ color: "#8494B0", fontSize: 12, marginTop: 2 }}>
              {`≈ ${data.units.toFixed(6)} ${meta.symbol} at the price on this date`}
            </p>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(120,160,220,0.13)", margin: "18px 0 4px" }} />

      <Row label="Tier">{tier?.name ?? "Unassigned"}</Row>
      <Row label="Asset">{meta ? `${meta.symbol}` : data.assetId.toUpperCase()}</Row>
      <Row label="Network">{meta?.network ?? "-"}</Row>
      <Row label="Date">{fullDate(data.at)}</Row>
      <Row label="Reference">
        <span style={{ fontFamily: "ui-monospace, monospace" }}>{data.reference}</span>
      </Row>
      <Row label="Term">
        {CYCLE_DAYS} days at {(DAILY_RATE * 100).toFixed(2)}% daily,{" "}
        {(CYCLE_RETURN * 100).toFixed(0)}% at maturity
      </Row>
      <Row label="Status">Recorded. No funds moved.</Row>

      {/* The disclaimer, at a size and contrast that survives the export and
          a crop. It is bordered so it reads as part of the document rather
          than as small print that can be cut off without anyone noticing. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginTop: 16,
          padding: 12,
          border: "1px solid rgba(251,191,36,0.42)",
          background: "rgba(251,191,36,0.08)",
          borderRadius: 12,
        }}
      >
        <TriangleAlert size={16} style={{ color: "#FBBF24", flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: "#E6EDFA", fontSize: 12, lineHeight: 1.55 }}>
          <strong style={{ color: "#FBBF24", fontWeight: 700 }}>
            This is not a payment confirmation.
          </strong>{" "}
          It records a position in a preview build, held in one browser. No deposit was received, no
          custody or settlement network is connected, and no value has moved.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span style={{ color: "#8494B0", fontSize: 11, letterSpacing: "0.16em" }}>
          RIGEL.CAPITAL
        </span>
        <span style={{ color: "#8494B0", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
          #{data.reference}
        </span>
      </div>
    </div>
  );
});
