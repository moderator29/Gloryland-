/**
 * Starter questions, derived from the member's own position.
 *
 * A fixed list of four questions is the same on a member's first day as it is
 * on their thirtieth, which means it is wrong on both. These are built from
 * the snapshot instead: a matured position, idle cash, a rung within reach and
 * an empty ledger each produce the question that is actually worth asking, in
 * that order of urgency.
 *
 * Every figure interpolated here comes off the snapshot or the tier constants,
 * so a suggested question can never quote a number the product cannot produce.
 * The two surfaces ask different things about the same state: Copilot asks
 * what a position means, Support asks how to do something about it.
 */

import type { Snapshot } from "@/domain/ledger";
import { CYCLE_DAYS, TIERS } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { CLAIM_FLOOR, IDLE_FLOOR, memberState } from "./grounding";
import type { Surface } from "./store";

/** Four fits the empty state without the list becoming a menu. */
const LIMIT = 4;

const ENTRY = TIERS[0];

/**
 * Questions in priority order for one surface. Later entries fill whatever
 * room the earlier ones left, so the most urgent state always leads.
 */
function candidates(surface: Surface, snap: Snapshot): string[] {
  const state = memberState(snap);
  const out: string[] = [];
  const copilot = surface === "copilot";

  if (state.empty) {
    out.push(
      copilot
        ? `What would ${money(ENTRY.entry)} return across a ${CYCLE_DAYS} day term?`
        : "How do I open my first vault?",
      copilot ? "How is my tier standing worked out?" : `What is the minimum placement?`,
      copilot
        ? "What happens to a position when its term ends?"
        : "Which assets can I fund a vault with?",
      copilot
        ? "What are the risks of placing capital here?"
        : "Where is my ledger stored right now?",
    );
    return out;
  }

  if (state.relaysDue.length > 0) {
    out.push(
      copilot
        ? `A relay is due to run. What will it carry into the next term?`
        : "When does a relay actually fire?",
    );
  }

  if (state.matured.length > 0) {
    const held = state.matured.reduce((s, p) => s + p.principal, 0);
    out.push(
      copilot
        ? `${money(held)} has matured and stopped accruing. What are my options?`
        : "How do I settle a matured vault?",
      copilot
        ? "What is the difference between settling and rolling into a new term?"
        : "How do I roll a matured term into a new one?",
    );
  }

  if (state.relaysArmed.length > 0) {
    out.push(
      copilot
        ? "What is the difference between a relay carrying full and carrying principal?"
        : "How do I change or turn off a relay?",
    );
  } else if (state.hasOpen) {
    out.push(
      copilot
        ? "What would a relay change about how my terms run?"
        : "How do I set a term to roll into the next one automatically?",
    );
  }

  if (state.claimable >= CLAIM_FLOOR) {
    out.push(
      copilot
        ? `Where does my ${money(state.claimable, 2)} in unclaimed rewards actually sit?`
        : "How do I claim my rewards?",
    );
  }

  if (state.idleCash >= IDLE_FLOOR) {
    out.push(
      copilot
        ? `What would redeploying my ${money(state.idleCash)} return across a term?`
        : "How do I withdraw my available balance?",
    );
  }

  if (state.nearNextTier && snap.nextTier) {
    out.push(
      copilot
        ? `I am ${money(snap.toNextTier)} from ${snap.nextTier.name}. What changes when I get there?`
        : `What does ${snap.nextTier.name} unlock?`,
    );
  }

  if (state.standingFromPeak) {
    out.push(
      copilot
        ? `Why is my standing ${money(snap.standing)} when I contributed ${money(snap.contributed)}?`
        : "How is tier standing measured?",
    );
  }

  if (state.nextMaturity) {
    const p = state.nextMaturity;
    out.push(
      copilot
        ? `How much has my ${p.tier.name} position accrued so far?`
        : "Where do I see when my positions mature?",
    );
  }

  // Always available, so the list is never short on a quiet account.
  out.push(
    copilot
      ? `How is my portfolio value of ${money(snap.portfolioValue)} made up?`
      : "What does the settlement target actually mean?",
    copilot ? "How do rewards accrue through a term?" : "How do I export my ledger?",
    copilot
      ? "What would change if I placed capital in two terms instead of one?"
      : "Where do I change my display name?",
  );

  return out;
}

/** Up to four starter questions, most urgent first, with duplicates dropped. */
export function suggestedQuestions(surface: Surface, snap: Snapshot): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of candidates(surface, snap)) {
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q);
    if (out.length === LIMIT) break;
  }
  return out;
}
