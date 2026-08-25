import {
  BookOpen,
  Compass,
  Layers,
  Lightbulb,
  Megaphone,
  MessageCircleQuestionMark,
  Radio,
  Vault,
  type LucideIcon,
} from "lucide-react";
import type { PostKind } from "@/domain/feed";

/**
 * How each kind of post presents itself.
 *
 * Colour follows the product's existing meaning rather than inventing a new
 * scale: blue is on brand and interactive, amber asks for attention, green is
 * gain, and everything else is neutral ink. Only the two kinds that genuinely
 * ask something of the reader take a coloured chip, so a scroll through the
 * feed does not read as eight competing alerts.
 */
export type KindMeta = {
  label: string;
  /** Longer form, used on the post detail page. */
  description: string;
  icon: LucideIcon;
  /** One of the chip variants in the design system. */
  chip: "" | "chip-accent" | "chip-gain" | "chip-warn";
};

export const KIND_META: Record<PostKind, KindMeta> = {
  announcement: {
    label: "Announcement",
    description: "A change to the platform",
    icon: Megaphone,
    chip: "chip-accent",
  },
  education: {
    label: "Education",
    description: "How a mechanic works",
    icon: BookOpen,
    chip: "",
  },
  product: {
    label: "Product",
    description: "What a surface does",
    icon: Layers,
    chip: "",
  },
  tier: {
    label: "Tier",
    description: "A rung of the ladder",
    icon: Radio,
    chip: "",
  },
  vault: {
    label: "Vault",
    description: "Terms, accrual and settlement",
    icon: Vault,
    chip: "",
  },
  insight: {
    label: "Insight",
    description: "An observation worth keeping",
    icon: Lightbulb,
    chip: "",
  },
  principle: {
    label: "Principle",
    description: "How we have decided to operate",
    icon: Compass,
    chip: "chip-warn",
  },
  question: {
    label: "Question",
    description: "An open question to members",
    icon: MessageCircleQuestionMark,
    chip: "chip-gain",
  },
};

export function kindMeta(kind: PostKind): KindMeta {
  return KIND_META[kind] ?? KIND_META.product;
}
