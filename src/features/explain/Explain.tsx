import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Info, TriangleAlert } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  explainValue,
  getDefinition,
  glossaryHref,
  type ExplainContext,
  type FigureId,
} from "./definitions";

/**
 * Explain: the small affordance that lets a member interrogate one figure.
 *
 * Deliberately not a modal and not a popup. A member asking where a number
 * comes from is reading, not deciding, so the answer opens in place underneath
 * the figure and pushes the page down rather than covering it. That keeps the
 * figure and its derivation on screen together, which is the entire point, and
 * it means the answer is reachable by keyboard and readable by a screen reader
 * without any focus trapping.
 *
 * Placement: put it directly beneath the figure it explains. `align` puts the
 * glyph under the left edge for a left aligned figure, or under the right edge
 * for a figure in a right aligned rail or table cell.
 */

export type ExplainProps = {
  id: FigureId;
  /** Real inputs, when the caller has them, so the worked example is the member's own. */
  ctx?: ExplainContext;
  className?: string;
  align?: "start" | "end";
};

export function Explain({ id, ctx, className = "", align = "start" }: ExplainProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelId = `explain-${id}-${useId()}`;
  const def = getDefinition(id);

  const body: ReactNode = (
    <div className="inset mt-2 p-3.5 text-left sm:p-4">
      <p className="text-[13px] leading-relaxed text-[var(--text)]">{def.short}</p>

      {def.formula && (
        <p className="tabular mt-3 break-words rounded-lg border border-[var(--line)] bg-[rgba(5,7,15,0.6)] px-3 py-2 text-[11px] leading-relaxed text-[var(--accent-soft)]">
          {def.formula}
        </p>
      )}

      <ol className="mt-3 space-y-2">
        {def.how.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="tabular mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--line-hi)] text-[9px] font-semibold text-[var(--accent-hi)]">
              {i + 1}
            </span>
            <span className="min-w-0 text-xs leading-relaxed text-[var(--text-mid)]">{step}</span>
          </li>
        ))}
      </ol>

      {/* The example is the whole promise of this component: real inputs when
          the caller passed them, a clearly hypothetical one when it did not. */}
      <div className="mt-3 border-t border-[var(--line)] pt-3">
        <p className="tag-micro">Worked</p>
        <p className="tabular mt-1.5 text-xs leading-relaxed text-[var(--text)]">
          {explainValue(id, ctx)}
        </p>
      </div>

      {def.caveats?.length ? (
        <ul className="mt-3 space-y-1.5">
          {def.caveats.map((c, i) => (
            <li key={i} className="flex gap-2">
              <TriangleAlert
                className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="min-w-0 text-[11px] leading-relaxed text-[var(--text-low)]">{c}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        to={glossaryHref(id)}
        className="mt-3 inline-flex min-h-[24px] items-center gap-1 text-[11px] font-semibold text-[var(--accent-hi)] hover:text-[var(--accent-soft)]"
      >
        Full definition <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );

  const region = (
    <div id={panelId} role="region" aria-label={`How ${def.label} is calculated`}>
      {body}
    </div>
  );

  // Reduced motion skips framer-motion outright rather than running it at zero
  // duration, so nothing measures a height it is not going to animate.
  const panel = reduce ? (
    open ? (
      region
    ) : null
  ) : (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="panel"
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {region}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`flex ${align === "end" ? "justify-end" : "justify-start"}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`How ${def.label} is calculated`}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
            open
              ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
              : "border-[var(--line)] text-[var(--text-low)] hover:border-[var(--line-hi)] hover:text-[var(--accent-hi)]"
          }`}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
      {panel}
    </div>
  );
}
