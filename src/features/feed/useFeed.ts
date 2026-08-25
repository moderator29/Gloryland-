import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  isBookmarked,
  isLiked,
  likeCount,
  listBookmarks,
  loadPosts,
  seedIfEmpty,
  subscribe,
  toggleBookmark,
  toggleLike,
  type Post,
} from "@/domain/feed";

/**
 * React bindings over the Signal store.
 *
 * The store is synchronous and browser local, so these hooks are thin: they
 * hold a snapshot in state, re-read it whenever the store emits, and never
 * cache anything the store already owns. One subscription per hook instance,
 * cleaned up on unmount.
 */

/** Every published post, newest first, seeded on first mount. */
export function useFeedPosts(): { posts: Post[]; ready: boolean } {
  const [posts, setPosts] = useState<Post[]>(() => loadPosts());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Seeding writes through the store, which emits, so the read below is the
    // authoritative one either way.
    seedIfEmpty();
    setPosts(loadPosts());
    setReady(true);
    return subscribe(() => setPosts(loadPosts()));
  }, []);

  return { posts, ready };
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
