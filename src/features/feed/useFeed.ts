import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  isBookmarked,
  isLiked,
  likeCount,
  listBookmarks,
  loadPosts,
  mergePosts,
  seedIfEmpty,
  subscribe,
  toggleBookmark,
  toggleLike,
  type Post,
} from "@/domain/feed";
import { nextRelease, rollingFeed } from "@/domain/schedule";

/**
 * React bindings over the Signal store.
 *
 * The store is synchronous and browser local, so these hooks are thin: they
 * hold a snapshot in state, re-read it whenever the store emits, and never
 * cache anything the store already owns. One subscription per hook instance,
 * cleaned up on unmount.
 */

/** How often the feed checks whether the next scheduled post is due. */
const RELEASE_TICK_MS = 30_000;

/**
 * Bring the store up to date with the publishing schedule.
 *
 * `rollingFeed` returns only the posts whose publish time has actually
 * arrived, so calling this repeatedly reveals the day one post at a time
 * rather than dumping tomorrow's copy on screen. `mergePosts` is keyed by id,
 * so a post that is already stored is not duplicated and a member's bookmark
 * on it survives.
 */
function syncSchedule(): void {
  seedIfEmpty();
  mergePosts(rollingFeed());
}

/**
 * Every published post, newest first.
 *
 * The evergreen starter set is seeded once, and the daily schedule is layered
 * on top of it. A timer re-checks for a due post rather than the page needing
 * a refresh, and the tab firing `visibilitychange` catches up a browser that
 * was in the background while several posts came due.
 */
export function useFeedPosts(): { posts: Post[]; ready: boolean; next: Post | null } {
  const [posts, setPosts] = useState<Post[]>(() => loadPosts());
  const [next, setNext] = useState<Post | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => {
      // Syncing writes through the store, which emits, so the subscription
      // below is what actually moves state. `next` has no store to emit from.
      syncSchedule();
      setNext(nextRelease());
    };

    tick();
    setPosts(loadPosts());
    setReady(true);

    const unsubscribe = subscribe(() => setPosts(loadPosts()));
    const timer = window.setInterval(tick, RELEASE_TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { posts, ready, next };
}

/** Saved posts only, kept in sync with the same store. */
export function useBookmarks(): Post[] {
  const [saved, setSaved] = useState<Post[]>(() => listBookmarks());
  useEffect(() => {
    setSaved(listBookmarks());
    return subscribe(() => setSaved(listBookmarks()));
  }, []);
  return saved;
}

export type PostActions = {
  liked: boolean;
  saved: boolean;
  /** This browser's own likes, which is 0 or 1. See domain/feed.ts. */
  likes: number;
  like: () => void;
  save: () => void;
  share: () => void;
};

/**
 * Interaction state for one post.
 *
 * Both toggles paint first and persist second. Writing to localStorage can be
 * refused (private mode, a full quota, a blocked origin), and when that
 * happens the store emits with the old value and this state corrects itself
 * on the next tick. The member sees the press land immediately either way.
 */
export function usePostActions(post: Post): PostActions {
  const [liked, setLiked] = useState(() => isLiked(post.id));
  const [saved, setSaved] = useState(() => isBookmarked(post.id));
  const [likes, setLikes] = useState(() => likeCount(post.id));

  const sync = useCallback(() => {
    setLiked(isLiked(post.id));
    setSaved(isBookmarked(post.id));
    setLikes(likeCount(post.id));
  }, [post.id]);

  useEffect(() => {
    sync();
    return subscribe(sync);
  }, [sync]);

  const like = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikes(next ? 1 : 0);
    toggleLike(post.id);
  }, [liked, post.id]);

  const save = useCallback(() => {
    const next = !saved;
    setSaved(next);
    toggleBookmark(post.id);
    if (next) toast.success("Saved to your list", { description: "Find it under Saved." });
    else toast.message("Removed from saved");
  }, [saved, post.id]);

  const share = useCallback(() => {
    void sharePost(post);
  }, [post]);

  return { liked, saved, likes, like, save, share };
}

/** Absolute URL for a post, safe to call before the router has mounted. */
export function postUrl(post: Post): string {
  const path = `/app/signal/${encodeURIComponent(post.id)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/**
 * Share a post through the platform share sheet where one exists, and fall
 * back to the clipboard everywhere else. A share the member cancels is not an
 * error, so it passes silently.
 */
export async function sharePost(post: Post): Promise<void> {
  const url = postUrl(post);
  const nav = typeof navigator === "undefined" ? undefined : navigator;

  if (nav?.share) {
    try {
      await nav.share({ title: `Rigel Signal: ${post.title}`, text: post.title, url });
      return;
    } catch (err) {
      // AbortError means the member closed the sheet. Anything else falls
      // through to the clipboard rather than surfacing a failure.
      if ((err as Error)?.name === "AbortError") return;
    }
  }

  try {
    await nav?.clipboard?.writeText(url);
    toast.success("Link copied", { description: "Paste it anywhere to share this post." });
  } catch {
    toast.error("Could not share", { description: "Copy the address from your browser bar." });
  }
}
