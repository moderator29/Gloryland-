/**
 * Provenance: the answer to "where does this number come from?".
 *
 * Two affordances over one registry. `Explain` is the inline glyph that sits
 * beside a metric and opens the derivation underneath it. `Provenance` is the
 * full block for a detail page. Both read from `definitions`, which states the
 * arithmetic in `@/domain/tiers` and `@/domain/ledger` in plain words and runs
 * its worked examples back through `derive`, so nothing here can quietly
 * disagree with the figure on screen.
 */

export { Explain, type ExplainProps } from "./Explain";
export { Provenance, type ProvenanceProps } from "./Provenance";
export {
  getDefinition,
  allDefinitions,
  searchDefinitions,
  explainValue,
  previewPosition,
  dayCount,
  glossaryHref,
  GLOSSARY_PATH,
  FIGURE_GROUPS,
  type FigureId,
  type Definition,
  type ExplainContext,
} from "./definitions";
