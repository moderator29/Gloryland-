import { Sparkles } from "lucide-react";
import { AiWorkspace, type AiConfig } from "@/features/ai/AiWorkspace";

/**
 * Copilot: the analyst for a member's own position.
 *
 * A full route rather than a floating panel, so a conversation can be linked
 * to, left and come back to. It reads the figures derived from the member's
 * ledger, when they allow it in settings, and explains what those figures mean
 * and how they were arrived at. It does not advise, and the starter questions
 * are built from the member's actual state rather than listed here.
 */
const CONFIG: AiConfig = {
  surface: "copilot",
  name: "Copilot",
  eyebrow: "Analyst",
  icon: Sparkles,
  welcome: "What would you like to understand?",
  blurb:
    "Ask about your positions, how a figure was derived, the term structure or the tier ladder. Every number it quotes comes from your own ledger.",
  disclaimer:
    "Copilot can be wrong. It does not give investment advice, and capital placed in a vault is at risk. Verify anything that moves capital.",
};

export default function Copilot() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Intelligence</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Copilot</h1>
      </div>
      <AiWorkspace config={CONFIG} />
    </div>
  );
}
