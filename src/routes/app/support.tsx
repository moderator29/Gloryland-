import { LifeBuoy } from "lucide-react";
import { AiWorkspace, type AiConfig } from "@/features/ai/AiWorkspace";

/**
 * Support: practical help with using the product.
 *
 * A full route, and deliberately separate from Copilot: its own history, its
 * own system prompt and a narrower remit. It answers how to do something,
 * where a surface is and what a word means, and hands anything advisory back.
 * Starter questions come from the member's state, not from a list here.
 */
const CONFIG: AiConfig = {
  surface: "support",
  name: "Support",
  eyebrow: "Help",
  icon: LifeBuoy,
  welcome: "How can we help?",
  blurb:
    "Questions about using the platform: how to do something, where a surface lives, what a term means. Answers come from the product reference.",
  disclaimer:
    "Support answers from the product reference. It will say plainly when a question falls outside what it can answer.",
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
