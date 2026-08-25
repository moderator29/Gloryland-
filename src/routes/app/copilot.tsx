import { Sparkles } from "lucide-react";
import { AiWorkspace, type AiConfig } from "@/features/ai/AiWorkspace";

/**
 * The Copilot: an analyst for a member's own position. It can read the figures
 * derived from their ledger (when they allow it in settings) and explain what
 * those figures mean. It does not advise.
 */
const CONFIG: AiConfig = {
  surface: "copilot",
  name: "Copilot",
  eyebrow: "Analyst",
  icon: Sparkles,
  welcome: "What would you like to understand?",
  blurb:
    "Ask about your positions, the term structure, or how the tier ladder works. Figures come from your own ledger.",
  prompts: [
    "Explain how my rewards accrue",
    "What happens when a vault matures?",
    "How far am I from the next tier?",
    "Break down my portfolio value",
  ],
  disclaimer:
    "Copilot can be wrong. It does not give investment advice. Verify anything that moves capital.",
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
