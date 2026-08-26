import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, TriangleAlert, X } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { fullDate } from "@/components/system/format";
import {
  FIGURE_GROUPS,
  explainValue,
  getDefinition,
  glossaryHref,
  searchDefinitions,
  type ExplainContext,
  type FigureId,
} from "@/features/explain";

/**
 * The full reference behind every figure in the product.
 *
 * It exists so that `Explain` and `Provenance` always have somewhere to send a
 * member who wants the whole definition rather than the summary beside the
 * metric. Anchors match the FigureId exactly, which is what makes those deep
 * links work, so renaming one means renaming the id.
 *
 * The worked examples run on the member's own open vault when there is one.
 * That is the argument the page is making: these figures are derived from your
 * ledger, so the reference can show you your own arithmetic.
 */

export default function Glossary() {
  const snap = useLedger();
  const { hash } = useLocation();
  const [query, setQuery] = useState("");

  // The newest open vault. Settled positions are skipped because reproducing
  // one faithfully needs its close time, and a half specified example would be
  // worse than a clearly hypothetical one.
  const sample = useMemo(
    () => [...snap.activePositions].sort((a, b) => b.openedAt - a.openedAt)[0],
    [snap.activePositions],
  );

  const ctx: ExplainContext = useMemo(
    () => (sample ? { principal: sample.principal, openedAt: sample.openedAt } : {}),
    [sample],
  );

  const matches = useMemo(() => searchDefinitions(query), [query]);
  const matchedIds = useMemo(() => new Set(matches.map((d) => d.id)), [matches]);

  const groups = useMemo(
    () =>
      FIGURE_GROUPS.map((g) => ({
        heading: g.heading,
        ids: g.ids.filter((id) => matchedIds.has(id)),
      })).filter((g) => g.ids.length > 0),
    [matchedIds],
  );

  // This route is lazy loaded, so the browser has usually abandoned the hash by
  // the time these sections exist. Perform the jump once they do.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <div className="space-y-8">
      {/* ── Opening: what the reference is for ── */}
      <section className="lede">
        <div className="min-w-0">
          <p className="eyebrow">Reference</p>
          <h1 className="display mt-1.5 text-2xl sm:text-3xl">Provenance</h1>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--text-low)]">
            Every figure in this product is derived from your own ledger. Nothing on screen is
            sampled from other members, averaged across accounts or estimated: each number is
            recomputed from your recorded events plus the clock, every time it is read. This page
            states the arithmetic behind each one, so any figure can be checked rather than taken on
            trust.
          </p>
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-[var(--text-low)]">
            {sample ? (
              <>
                Worked examples below use your {sample.tier.name} vault, opened{" "}
                {fullDate(sample.openedAt)}.
              </>
            ) : (
              <>
                Worked examples below are hypothetical until you open a vault, at which point they
                switch to your own numbers.
              </>
            )}
          </p>
        </div>

        <div className="lede-rail">
          <label htmlFor="glossary-filter" className="tag-micro">
            Filter
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden="true" />
            <input
              id="glossary-filter"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Accrual, settlement, standing"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[var(--text-low)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear the filter"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[var(--text-low)] hover:text-[var(--text-hi)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-low)]" aria-live="polite">
            {matches.length} of {FIGURE_GROUPS.reduce((n, g) => n + g.ids.length, 0)} figures
          </p>
        </div>
      </section>

      {/* ── One column on phones, sticky index beside the entries at lg ── */}
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Figures" className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-bar pb-6">
            {groups.map((g) => (
              <div key={g.heading} className="mb-5">
                <p className="tag-micro">{g.heading}</p>
                <ul className="mt-2 space-y-px">
                  {g.ids.map((id) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="block truncate rounded-md px-2 py-1.5 text-[13px] text-[var(--text-mid)] transition-colors hover:bg-[rgba(46,139,255,0.06)] hover:text-[var(--text-hi)]"
                      >
                        {getDefinition(id).label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {groups.length === 0 ? (
            <p className="inset p-5 text-sm text-[var(--text-low)]">
              Nothing matches {`"${query}"`}. Try a term from a figure on screen, such as accrual,
              maturity or standing.
            </p>
          ) : (
            groups.map((g, gi) => (
              <div key={g.heading}>
                <p className={`eyebrow ${gi === 0 ? "" : "mt-10"}`}>{g.heading}</p>
                {g.ids.map((id) => (
                  <Entry key={id} id={id} ctx={ctx} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** One anchored definition. `id` is the FigureId, which is what Explain links to. */
function Entry({ id, ctx }: { id: FigureId; ctx: ExplainContext }) {
  const def = getDefinition(id);

  return (
    // scroll-mt clears the sticky app header, so a deep link does not land
    // underneath it.
    <section id={id} className="band mt-5 scroll-mt-24 pt-5">
      <div className="band-head">
        <h2 className="band-title">{def.label}</h2>
        <span className="hairline" aria-hidden="true" />
      </div>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text)]">{def.short}</p>

      {def.formula && (
        <p className="tabular mt-4 break-words rounded-lg border border-[var(--line)] bg-[rgba(5,7,15,0.6)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--accent-soft)] sm:text-xs">
          {def.formula}
        </p>
      )}

      <ol className="mt-4 max-w-prose space-y-2.5">
        {def.how.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="tabular mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--line-hi)] text-[10px] font-semibold text-[var(--accent-hi)]">
              {i + 1}
            </span>
            <span className="min-w-0 text-[13px] leading-relaxed text-[var(--text-mid)]">
              {step}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 max-w-prose border-t border-[var(--line)] pt-3">
        <p className="tag-micro">Worked</p>
        <p className="tabular mt-1.5 text-[13px] leading-relaxed text-[var(--text)]">
          {explainValue(id, ctx)}
        </p>
      </div>

      {def.caveats?.length ? (
        <ul className="mt-4 max-w-prose space-y-2">
          {def.caveats.map((c, i) => (
            <li key={i} className="flex gap-2">
              <TriangleAlert
                className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="min-w-0 text-xs leading-relaxed text-[var(--text-low)]">{c}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {def.related?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="tag-micro">See also</span>
          {def.related.map((r) => (
            <Link key={r} to={glossaryHref(r)} className="chip hover:text-[var(--text-hi)]">
              {getDefinition(r).label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
