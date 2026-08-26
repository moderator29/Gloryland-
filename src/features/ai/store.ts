/**
 * Conversation state for both AI surfaces.
 *
 * Threads persist per surface so the Copilot and Support keep separate
 * histories. Storage is browser-local, which matches the rest of this build:
 * `load`/`save` are the only storage-aware functions, so moving to a server
 * means replacing those two.
 */

export type Surface = "copilot" | "support";
export type Role = "user" | "assistant";

export type Message = {
  id: string;
  role: Role;
  content: string;
  at: number;
  /** Set when the reply failed, so the UI can offer a retry. */
  error?: string;
  /**
   * Where an assistant message came from.
   *
   * Absent means the model produced it. "reference" means the assistant was
   * not connected and the answer was read out of the product knowledge module
   * instead. The two are never allowed to look alike on screen: a fabricated
   * model reply would be worse than no reply at all.
   */
  source?: "reference";
};

export type Thread = {
  id: string;
  surface: Surface;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
};

export type Style = "concise" | "balanced" | "detailed";

export type Prefs = {
  style: Style;
  /** Send the member's derived position with each message so replies can use it. */
  sharePosition: boolean;
};

const key = (s: Surface) => `rgl_ai_${s}_v1`;
const PREFS_KEY = "rgl_ai_prefs_v1";

const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((f) => f());

const uid = () => Math.random().toString(36).slice(2, 10);

export function load(surface: Surface): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(surface));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Thread[]) : [];
  } catch {
    return [];
  }
}

function save(surface: Surface, threads: Thread[]) {
  try {
    localStorage.setItem(key(surface), JSON.stringify(threads.slice(0, 100)));
  } catch {
    /* storage full or blocked */
  }
  emit();
}

export function loadPrefs(): Prefs {
  const fallback: Prefs = { style: "balanced", sharePosition: true };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return fallback;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  emit();
}

/** First few words of the opening question, used as a thread name. */
function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 42 ? clean : clean.slice(0, 42).replace(/\s\S*$/, "") + "…";
}

export function createThread(surface: Surface, firstMessage?: string): Thread {
  const now = Date.now();
  const thread: Thread = {
    id: uid(),
    surface,
    title: firstMessage ? titleFrom(firstMessage) : "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  save(surface, [thread, ...load(surface)]);
  return thread;
}

export function updateThread(surface: Surface, id: string, patch: Partial<Thread>) {
  const next = load(surface).map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
  );
  save(surface, next);
}

export function deleteThread(surface: Surface, id: string) {
  save(
    surface,
    load(surface).filter((t) => t.id !== id),
  );
}

export function clearAll(surface: Surface) {
  save(surface, []);
}

export function appendMessage(surface: Surface, threadId: string, msg: Omit<Message, "id" | "at">) {
  const full: Message = { ...msg, id: uid(), at: Date.now() };
  const threads = load(surface);
  const next = threads.map((t) => {
    if (t.id !== threadId) return t;
    const messages = [...t.messages, full];
    const title =
      t.title === "New conversation" && msg.role === "user" ? titleFrom(msg.content) : t.title;
    return { ...t, messages, title, updatedAt: Date.now() };
  });
  save(surface, next);
  return full;
}

/** Replace the text of a message in place, used while a reply streams in. */
export function patchMessage(
  surface: Surface,
  threadId: string,
  msgId: string,
  patch: Partial<Message>,
) {
  const next = load(surface).map((t) =>
    t.id !== threadId
      ? t
      : {
          ...t,
          messages: t.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
          updatedAt: Date.now(),
        },
  );
  save(surface, next);
}

export type StreamHandle = { cancel: () => void };

/**
 * Stream a reply from the server endpoint. The client never holds a key: it
 * posts the conversation and reads plain text deltas back.
 */
export function streamReply(opts: {
  surface: Surface;
  messages: { role: Role; content: string }[];
  style: Style;
  snapshot?: string;
  onDelta: (text: string) => void;
  /** `stopped` is true when the caller aborted, so a half reply is not an error. */
  onDone: (stopped: boolean) => void;
  /**
   * `code` is the machine readable reason from the endpoint, when it sent one.
   * The caller needs it to tell an unconfigured server apart from a broken
   * one, because only the first has a useful answer to fall back to.
   */
  onError: (message: string, code?: string) => void;
}): StreamHandle {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: opts.surface,
          messages: opts.messages,
          style: opts.style,
          snapshot: opts.snapshot,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = "The assistant could not be reached.";
        let code: string | undefined;
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
          if (typeof body?.error === "string") code = body.error;
        } catch {
          /* non-json error body */
        }
        opts.onError(message, code);
        return;
      }
      if (!res.body) {
        opts.onError("The assistant returned an empty response.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        opts.onDelta(decoder.decode(value, { stream: true }));
      }
      opts.onDone(false);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        opts.onDone(true);
        return;
      }
      opts.onError("The assistant is unavailable right now.");
    }
  })();

  return { cancel: () => controller.abort() };
}

export type AssistantStatus = {
  /** A key exists in the server environment. */
  configured: boolean;
  /** The key was accepted and the model answered a probe. */
  reachable: boolean;
  /** Why it is not reachable, in the API's own words. Empty when it is. */
  detail: string;
};

/**
 * Whether the assistant will actually answer.
 *
 * `configured` and `reachable` are different questions, and conflating them
 * is what made a rejected key and an unknown model both look like a working
 * assistant that simply never replied. The detail line carries the API's own
 * error type so a misconfiguration can be fixed rather than guessed at.
 */
let status: AssistantStatus | null = null;

export async function assistantStatus(): Promise<AssistantStatus> {
  if (status !== null) return status;
  try {
    const res = await fetch("/api/ai/status");
    if (!res.ok) {
      status = {
        configured: false,
        reachable: false,
        detail: `Status check failed (${res.status}).`,
      };
      return status;
    }
    const body = await res.json();
    status = {
      configured: Boolean(body?.configured),
      reachable: Boolean(body?.reachable),
      detail: typeof body?.detail === "string" ? body.detail : "",
    };
  } catch {
    status = {
      configured: false,
      reachable: false,
      detail: "The status endpoint could not be reached.",
    };
  }
  return status;
}

/** Legacy shape: true only when the assistant will actually answer. */
export async function isConfigured(): Promise<boolean> {
  const s = await assistantStatus();
  return s.configured && s.reachable;
}
