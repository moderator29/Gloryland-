import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, SearchX } from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { fullDate } from "@/components/system/format";
import { Skeleton } from "@/components/system/ui";
import { relatedPosts, type Post } from "@/domain/feed";
import {
  PostActionBar,
  PostCardCompact,
  PublisherLine,
  kindMeta,
  useFeedPosts,
} from "@/features/feed";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A post, in full, on its own page.
 *
 * Deliberately a route and not a modal: a post has a shareable address, a
 * back button that means something, and a body long enough that trapping it
 * in an overlay would be the wrong shape. Landing here directly works, since
 * the feed store seeds itself on mount wherever it is first read.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SignalPost() {
  const { postId = "" } = useParams();
  const { posts, ready } = useFeedPosts();
  const reduce = useReducedMotion();

  const post = useMemo(() => posts.find((p) => p.id === postId) ?? null, [posts, postId]);
  const related = useMemo(() => (post ? relatedPosts(post, 3) : []), [post]);

  useEffect(() => {
    if (!post) return;
    const previous = document.title;
    document.title = `${post.title} | Rigel Signal`;
    return () => {
      document.title = previous;
    };
  }, [post]);

  if (!ready && !post) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!post) return <NotFound />;

  const meta = kindMeta(post.kind);
  const Icon = meta.icon;
  const paragraphs = post.body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-6">
      <BackLink />

      <motion.article
        className="panel-hi edge-light p-5 sm:p-7"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
      >
        <header className="flex flex-wrap items-start gap-3">
          <Mark size={40} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <PublisherLine at={post.publishedAt} />
            <p className="eyebrow mt-0.5">Official channel</p>
          </div>
          <span className={`chip ${meta.chip} shrink-0`}>
            <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            {meta.label}
          </span>
        </header>

        <h1 className="display mt-5 text-xl leading-tight sm:text-2xl">{post.title}</h1>
        <p className="mt-1.5 text-xs text-[var(--text-low)]">
          {meta.description} &middot; published {fullDate(post.publishedAt)}
        </p>

        <div className="mt-5 space-y-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-[var(--text)]">
              {para}
            </p>
          ))}
        </div>

        {post.tags && post.tags.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <li key={t} className="chip !text-[10px] lowercase">
                #{t}
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <PostActionBar post={post} className="-ml-2" />
          <p className="text-[11px] text-[var(--text-low)]">
            Likes and saves are kept on this device.
          </p>
        </footer>
      </motion.article>

      {related.length > 0 && <Related posts={related} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/signal"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Signal
    </Link>
  );
}

function Related({ posts }: { posts: Post[] }) {
  return (
    <section aria-labelledby="signal-related">
      <h2 id="signal-related" className="eyebrow mb-3">
        Related reading
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCardCompact key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

/** An id that matches nothing: say so plainly and offer the way back. */
function NotFound() {
  return (
    <div className="space-y-6">
      <BackLink />
      <div className="panel flex flex-col items-center px-6 py-14 text-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.1)]">
          <SearchX className="h-5 w-5 text-[var(--warn)]" strokeWidth={1.7} />
        </span>
        <p className="font-semibold text-[var(--text-hi)]">This post is not here</p>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
          The link may be old, or the post may not have reached this device. Posts are stored per
          browser in this build, so a link shared from another device can arrive before the post
          does.
        </p>
        <Link to="/app/signal" className="btn btn-secondary mt-5">
          Go to Signal
        </Link>
      </div>
    </div>
  );
}
