import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Clock, Inbox, Rss } from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { Skeleton } from "@/components/system/ui";
import { POST_KINDS, type PostKind } from "@/domain/feed";
import { POSTS_PER_DAY } from "@/domain/schedule";
import { FeedFilters, PostCard, VerifiedMark, useBookmarks, useFeedPosts } from "@/features/feed";
import type { FeedFilter } from "@/features/feed";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Signal, the platform's channel.
 *
 * Two views over one store: everything published, and the posts this member
 * has saved. The filter row only offers kinds that actually have posts, so
 * the only empty states that can be reached are the two real ones, a browser
 * with no posts yet and a member who has saved nothing.
 */

const LIST_ID = "signal-feed";

export default function Signal() {
  const { posts, ready, next } = useFeedPosts();
  const saved = useBookmarks();
  const reduce = useReducedMotion();
  const [view, setView] = useState<"feed" | "saved">("feed");
  const [filter, setFilter] = useState<FeedFilter>("all");

  const counts = useMemo(() => {
    const out: Partial<Record<PostKind, number>> = {};
    for (const k of POST_KINDS) out[k] = 0;
    for (const p of posts) out[p.kind] = (out[p.kind] ?? 0) + 1;
    return out;
  }, [posts]);

  // A filter can go empty if the only post of that kind is removed. Falling
  // back to All is better than showing a row with a selected dead end.
  useEffect(() => {
    if (filter !== "all" && (counts[filter as PostKind] ?? 0) === 0) setFilter("all");
  }, [counts, filter]);

  const visible = useMemo(() => {
    if (view === "saved") return saved;
    return filter === "all" ? posts : posts.filter((p) => p.kind === filter);
  }, [view, saved, posts, filter]);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Channel</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Signal</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Mechanics, product notes and the reasoning behind them, published by the desk. Nothing
          here is a recommendation to invest.
        </p>
      </header>

      {/* Publisher card: who writes this, stated once at the top. */}
      <section className="panel edge-light flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Mark size={44} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-base font-semibold text-[var(--text-hi)]">
              Rigel
              <VerifiedMark size={16} />
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
              The only account that publishes here. Members read, save and share.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <div className="inset flex-1 px-3 py-2 text-center sm:flex-none">
            <p className="eyebrow">Posts</p>
            <p className="metric tabular mt-0.5 text-base">{posts.length}</p>
          </div>
          <div className="inset flex-1 px-3 py-2 text-center sm:flex-none">
            <p className="eyebrow">Per day</p>
            <p className="metric tabular mt-0.5 text-base">{POSTS_PER_DAY}</p>
          </div>
        </div>
      </section>

      {/* The channel publishes through the day rather than all at once, so the
          member gets to see that there is more coming instead of assuming the
          feed has gone quiet. Hidden once the day's run is exhausted. */}
      {next && <NextUp at={next.publishedAt} />}

      {/* View switch. Two states, so a pair of pressed buttons is clearer
          than a tablist with one panel. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inset flex gap-1 p-1">
          {(
            [
              { id: "feed", label: "Feed", icon: Rss, count: posts.length },
              { id: "saved", label: "Saved", icon: Bookmark, count: saved.length },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                aria-pressed={active}
                className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
                    : "text-[var(--text-low)] hover:text-[var(--text-hi)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                {tab.label}
                <span className="tabular opacity-70">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {view === "feed" && (
          <FeedFilters
            value={filter}
            onChange={setFilter}
            counts={counts}
            controls={LIST_ID}
            className="min-w-0 flex-1"
          />
        )}
      </div>

      {!ready && posts.length === 0 ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <motion.div
          id={LIST_ID}
          role="feed"
          aria-label={view === "saved" ? "Saved posts" : "Published posts"}
          aria-busy={!ready}
          className="space-y-3"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          {visible.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/**
 * A quiet line telling the member when the next post is due.
 *
 * The time is formatted in the member's own locale rather than a countdown,
 * because a ticking clock on a reading surface pulls attention away from what
 * is already published.
 */
function NextUp({ at }: { at: number }) {
  const time = new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <p className="inset flex items-center gap-2 px-3.5 py-2.5 text-xs text-[var(--text-low)]">
      <Clock
        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <span>
        Next post due around <span className="tabular text-[var(--text-hi)]">{time}</span>. The desk
        publishes through the day.
      </span>
    </p>
  );
}

function EmptyState({ view }: { view: "feed" | "saved" }) {
  const saved = view === "saved";
  const Icon = saved ? Bookmark : Inbox;
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
        <Icon className="h-5 w-5 text-[var(--accent-hi)]" strokeWidth={1.7} />
      </span>
      <p className="font-semibold text-[var(--text-hi)]">
        {saved ? "Nothing saved yet" : "No posts yet"}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
        {saved
          ? "Save a post with the bookmark button and it will wait for you here. Saved posts stay on this device."
          : "The desk has not published to this browser yet. New posts appear here as they go out."}
      </p>
    </div>
  );
}
