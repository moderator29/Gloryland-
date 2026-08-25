import { LifeBuoy } from "lucide-react";
import { AiWorkspace, type AiConfig } from "@/features/ai/AiWorkspace";

/**
 * Support: practical help with using the product. Deliberately separate from
 * the Copilot, with its own history, a different system prompt and a narrower
 * remit. It answers how-to questions and refuses anything advisory.
 */
const CONFIG: AiConfig = {
  surface: "support",
  name: "Support",
  eyebrow: "Help",
  icon: LifeBuoy,
  welcome: "How can we help?",
  blurb:
    "Questions about using the platform, where something lives, or what a term means. Answers come from the product documentation.",
  prompts: [
    "How do I open a vault?",
    "When can I withdraw?",
    "What does the settlement target mean?",
    "How do I claim my rewards?",
  ],
  disclaimer: "Support answers from platform documentation. It will say so when it does not know.",
};

export default function Support() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Support</h1>
      </div>
      <AiWorkspace config={CONFIG} />
    </div>
  );
}
