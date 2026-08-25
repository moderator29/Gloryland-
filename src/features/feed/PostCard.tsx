import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Mark } from "@/components/brand/Mark";
import { relative } from "@/components/system/format";
import type { Post } from "@/domain/feed";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { kindMeta } from "./kinds";
import { PostActionBar } from "./PostActions";
import { VerifiedMark } from "./VerifiedMark";

/**
 * One post in the feed.
 *
 * The whole card is a link to the post page, built with a stretched anchor on
 * the title rather than by wrapping everything in an <a>. That keeps the
 * markup valid, gives the card exactly one tab stop before its actions, and
 * leaves the like, save and share buttons genuinely clickable on top.
 *
 * A card never renders the full body. The feed is for deciding what to read,
 * and the post page is where it is read.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Publisher identity. There is one publisher, and it is the platform. */
export function PublisherLine({ at, size = "md" }: { at: number; size?: "sm" | "md" }) {
  const iso = Number.isFinite(at) ? new Date(at).toISOString() : undefined;
  return (
    <span
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${
        size === "sm" ? "text-[13px]" : "text-sm"
      }`}
    >
      <span className="font-semibold text-[var(--text-hi)]">Rigel</span>
      <VerifiedMark size={size === "sm" ? 13 : 15} />
      <span aria-hidden="true" className="text-[var(--text-low)]">
        &middot;
      </span>
      <time dateTime={iso} className="text-[var(--text-low)]">
        {relative(at)}
      </time>
    </span>
  );
}

export function PostCard({
  post,
  index = 0,
  animate = true,
}: {
  post: Post;
  /** Position in the list, used to stagger the reveal. */
  index?: number;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const meta = kindMeta(post.kind);
  const Icon = meta.icon;
  const shouldAnimate = animate && !reduce;

  return (
    <motion.article
      initial={shouldAnimate ? { opacity: 0, y: 14 } : false}
      whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: shouldAnimate ? 0.45 : 0,
        delay: shouldAnimate ? Math.min(index, 6) * 0.05 : 0,
        ease: EASE,
      }}
      className="panel group relative overflow-hidden p-4 transition-colors hover:border-[var(--line-hi)] sm:p-5"
    >
      <header className="flex items-start gap-3">
        <Mark size={34} glow={false} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <PublisherLine at={post.publishedAt} />
          <p className="eyebrow mt-0.5">Official channel</p>
        </div>
        <span className={`chip ${meta.chip} shrink-0`}>
          <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          {/* The label is spelled out for assistive tech at every width, and
              shown once there is room for it. */}
          <span className="sr-only">{meta.label}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            {meta.label}
          </span>
        </span>
      </header>

      <h3 className="mt-3.5 text-[15px] font-semibold leading-snug text-[var(--text-hi)] sm:text-base">
        <Link
          to={`/app/signal/${encodeURIComponent(post.id)}`}
          className="rounded after:absolute after:inset-0 after:content-['']"
        >
          {post.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--text-mid)]">
        {post.body}
      </p>

      {post.tags && post.tags.length > 0 && (
        <ul className="no-bar mt-3 flex gap-1.5 overflow-x-auto">
          {post.tags.slice(0, 4).map((t) => (
            <li key={t} className="chip !px-2 !py-0.5 !text-[10px] lowercase">
              #{t}
            </li>
          ))}
        </ul>
      )}

      <footer className="relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <PostActionBar post={post} className="-ml-2" />
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--text-low)] transition-colors group-hover:text-[var(--accent-hi)]">
          Read
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </footer>
    </motion.article>
  );
}

/** Condensed card, used for related reading on a post page. */
export function PostCardCompact({ post }: { post: Post }) {
  const meta = kindMeta(post.kind);
  const Icon = meta.icon;
  return (
    <article className="inset relative p-3.5 transition-colors hover:border-[var(--line-hi)]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <Icon className="h-3.5 w-3.5 text-[var(--accent-hi)]" strokeWidth={1.9} />
        </span>
        <p className="eyebrow truncate">{meta.label}</p>
      </div>
      <h4 className="mt-2 text-sm font-semibold leading-snug text-[var(--text-hi)]">
        <Link
          to={`/app/signal/${encodeURIComponent(post.id)}`}
          className="rounded after:absolute after:inset-0 after:content-['']"
        >
          {post.title}
        </Link>
      </h4>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-low)]">
        {post.body}
      </p>
    </article>
  );
}
