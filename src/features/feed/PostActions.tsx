import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Post } from "@/domain/feed";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePostActions } from "./useFeed";

/**
 * Like, save and share, shared by the feed card and the post page.
 *
 * Every button carries its own label and pressed state, so the row is
 * readable by a screen reader without the surrounding card for context. The
 * pop on press is the only motion here and it is gated, because a control
 * that moves is harder to hit twice in a row.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

function ActionButton({
  label,
  pressed,
  onPress,
  active,
  children,
}: {
  label: string;
  /** Omitted for controls that are not a toggle, such as share. */
  pressed?: boolean;
  onPress: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "text-[var(--accent-hi)]"
          : "text-[var(--text-low)] hover:bg-[rgba(120,160,220,0.08)] hover:text-[var(--text-hi)]"
      }`}
    >
      <motion.span
        className="grid place-items-center"
        animate={reduce ? undefined : { scale: active ? [1, 1.28, 1] : 1 }}
        transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
      >
        {children}
      </motion.span>
    </button>
  );
}

export function PostActionBar({ post, className = "" }: { post: Post; className?: string }) {
  const { liked, saved, likes, like, save, share } = usePostActions(post);
  const reduce = useReducedMotion();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <ActionButton
        label={liked ? `Unlike ${post.title}` : `Like ${post.title}`}
        pressed={liked}
        active={liked}
        onPress={like}
      >
        <span className="inline-flex items-center gap-1.5">
          <Heart
            className={`h-[15px] w-[15px] ${liked ? "text-[var(--loss)]" : ""}`}
            strokeWidth={1.9}
            fill={liked ? "currentColor" : "none"}
          />
          {/* The count is this browser only, so it appears at one and is
              otherwise absent rather than showing a zero. */}
          <AnimatePresence initial={false}>
            {likes > 0 && (
              <motion.span
                key="count"
                className="tabular text-[11px] text-[var(--loss)]"
                initial={reduce ? false : { opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={reduce ? undefined : { opacity: 0, width: 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              >
                {likes}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </ActionButton>

      <ActionButton
        label={saved ? `Remove ${post.title} from saved` : `Save ${post.title}`}
        pressed={saved}
        active={saved}
        onPress={save}
      >
        <Bookmark
          className={`h-[15px] w-[15px] ${saved ? "text-[var(--accent-hi)]" : ""}`}
          strokeWidth={1.9}
          fill={saved ? "currentColor" : "none"}
        />
      </ActionButton>

      <ActionButton label={`Share ${post.title}`} onPress={share}>
        <Share2 className="h-[15px] w-[15px]" strokeWidth={1.9} />
      </ActionButton>
    </div>
  );
}
