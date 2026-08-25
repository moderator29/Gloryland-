import { forwardRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { assetById, type AssetId } from "@/features/market/assets";
import { CoinLogo } from "@/features/market/CoinLogo";
import { money, fullDate } from "@/components/system/format";
import { tierById } from "@/domain/tiers";

export type ReceiptData = {
  reference: string;
  amount: number;
  assetId: AssetId;
  tierId: string;
  at: number;
  units?: number;
};

/**
 * Deposit receipt.
 *
 * Rendered at a fixed 380px column so the saved image is identical on a phone
 * and a desktop: exporting a fluid layout produces a receipt whose proportions
 * depend on the window that happened to be open. Colours are literal rather
 * than CSS variables because the export rasterises this node outside the app's
 * cascade.
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
          color: "#5B6A86",
          fontSize: 11,
          letterSpacing: "0.14em",
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
      {/* Brand */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Mark size={26} glow={false} />
          <div>
            <p style={{ color: "#F2F6FF", fontSize: 15, fontWeight: 600, letterSpacing: "0.18em" }}>
              RIGEL
            </p>
            <p style={{ color: "#7DD3FC", fontSize: 8, letterSpacing: "0.3em", marginTop: 2 }}>
              CAPITAL
            </p>
          </div>
        </div>
        <CheckCircle2 size={22} style={{ color: "#34D399" }} />
      </div>

      <p
        style={{
          color: "#5B6A86",
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          marginTop: 20,
        }}
      >
        Deposit receipt
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
          {data.units !== undefined && meta && (
            <p style={{ color: "#8494B0", fontSize: 11, marginTop: 2 }}>
              ≈ {data.units.toFixed(6)} {meta.symbol}
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
      <Row label="Term">30 days at 1% daily</Row>
      <Row label="Status">
        <span style={{ color: "#34D399" }}>Recorded</span>
      </Row>

      <div className="mt-4 flex items-center justify-between">
        <span style={{ color: "#5B6A86", fontSize: 9, letterSpacing: "0.18em" }}>
          RIGEL.CAPITAL
        </span>
        <span style={{ color: "#5B6A86", fontSize: 9, fontFamily: "ui-monospace, monospace" }}>
          #{data.reference}
        </span>
      </div>

      <p style={{ color: "#5B6A86", fontSize: 9, lineHeight: 1.5, marginTop: 12 }}>
        Preview build. This records a position in your browser. No custody or settlement network is
        connected yet.
      </p>
    </div>
  );
});
