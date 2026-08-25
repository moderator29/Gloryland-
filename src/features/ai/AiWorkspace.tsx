import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Check,
  Copy,
  MessageSquarePlus,
  PanelRightOpen,
  Pin,
  RotateCcw,
  Search,
  Settings2,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  appendMessage,
  clearAll,
  createThread,
  deleteThread,
  isConfigured,
  load,
  loadPrefs,
  patchMessage,
  savePrefs,
  streamReply,
  subscribe,
  updateThread,
  type Prefs,
  type Style,
  type Surface,
  type Thread,
} from "./store";
import { useLedger } from "@/hooks/useLedger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { money, pct, relative } from "@/components/system/format";
import { Mark } from "@/components/brand/Mark";

export type AiConfig = {
  surface: Surface;
  name: string;
  eyebrow: string;
  icon: LucideIcon;
  welcome: string;
  blurb: string;
  prompts: string[];
  disclaimer: string;
};

const STYLE_OPTIONS: { id: Style; label: string }[] = [
  { id: "concise", label: "Concise" },
  { id: "balanced", label: "Balanced" },
  { id: "detailed", label: "Detailed" },
];

/** Segmented control used for style and other small choices. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="inset flex gap-1 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`relative flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.id ? "text-[#04101f]" : "text-[var(--text-mid)] hover:text-[var(--text-hi)]"
          }`}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${label}`}
              className="absolute inset-0 rounded-lg"
              style={{ background: "linear-gradient(180deg, var(--accent-hi), var(--accent))" }}
              transition={
                reduce ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 36 }
              }
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** iOS-style switch, used across AI settings. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--ink-300)]"
      }`}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ left: 3, transform: `translateX(${checked ? 20 : 0}px)` }}
      />
    </button>
  );
}

export function AiWorkspace({ config }: { config: AiConfig }) {
  const { surface, icon: Icon } = config;
  const reduce = useReducedMotion();
  const snap = useLedger();

  const [threads, setThreads] = useState<Thread[]>(() => load(surface));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [panel, setPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [ready, setReady] = useState<boolean | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handle = useRef<{ cancel: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const off = subscribe(() => setThreads(load(surface)));
    return () => {
      off();
    };
  }, [surface]);
  useEffect(() => {
    isConfigured().then(setReady);
  }, []);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [active?.messages.length, streaming, reduce]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...threads].sort(
      (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || b.updatedAt - a.updatedAt,
    );
    if (!q) return sorted;
    return sorted.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [threads, query]);

  /** A compact, factual summary of the member's own position. */
  const positionSummary = () =>
    prefs.sharePosition
      ? [
          `Portfolio value: ${money(snap.portfolioValue, 2)}`,
          `Contributed: ${money(snap.contributed)}`,
          `Deployed in vaults: ${money(snap.deployed)}`,
          `Unclaimed rewards: ${money(snap.rewardsPending, 2)}`,
          `Available balance: ${money(snap.available, 2)}`,
          `Return to date: ${pct(snap.returnPct)}`,
          `Tier: ${snap.tier?.name ?? "none yet"}`,
          snap.nextTier
            ? `Next tier: ${snap.nextTier.name}, ${money(snap.toNextTier)} away`
            : "At the top tier",
          `Open vaults: ${snap.activePositions.length}`,
        ].join("\n")
      : undefined;

  const send = (text: string) => {
    const body = text.trim();
    if (!body || streaming) return;

    let threadId = activeId;
    if (!threadId) {
      const t = createThread(surface, body);
      threadId = t.id;
      setActiveId(t.id);
    }

    appendMessage(surface, threadId, { role: "user", content: body });
    setInput("");

    const history = (load(surface).find((t) => t.id === threadId)?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = appendMessage(surface, threadId, { role: "assistant", content: "" });
    setStreaming(true);

    let acc = "";
    handle.current = streamReply({
      surface,
      messages: history,
      style: prefs.style,
      snapshot: positionSummary(),
      onDelta: (d) => {
        acc += d;
        patchMessage(surface, threadId!, reply.id, { content: acc });
      },
      onDone: () => {
        setStreaming(false);
        handle.current = null;
        if (!acc) patchMessage(surface, threadId!, reply.id, { error: "No reply was returned." });
      },
      onError: (msg) => {
        setStreaming(false);
        handle.current = null;
        patchMessage(surface, threadId!, reply.id, { error: msg });
      },
    });
  };

  const stop = () => {
    handle.current?.cancel();
    handle.current = null;
    setStreaming(false);
  };

  const regenerate = () => {
    if (!active || streaming) return;
    const msgs = active.messages;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const trimmed = msgs.slice(0, msgs.findIndex((m) => m.id === lastUser.id) + 1);
    updateThread(surface, active.id, { messages: trimmed });
    window.setTimeout(() => send(lastUser.content), 0);
    // send() re-appends the user turn, so drop the original copy first
    updateThread(surface, active.id, { messages: trimmed.slice(0, -1) });
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const setPref = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const ThreadList = (
    <div className="flex h-full flex-col">
      <button
        onClick={() => {
          setActiveId(null);
          setPanel(false);
          inputRef.current?.focus();
        }}
        className="btn btn-primary w-full"
      >
        <MessageSquarePlus className="h-4 w-4" /> New conversation
      </button>

      {threads.length > 3 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(5,7,15,0.5)] px-3 py-2 focus-within:border-[var(--accent)]">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-low)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--text-low)]"
          />
        </div>
      )}

      <div className="no-bar mt-3 flex-1 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs leading-relaxed text-[var(--text-low)]">
            {query ? "Nothing matches that search." : "Your conversations will gather here."}
          </p>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-xl px-2.5 py-2 transition-colors ${
                t.id === activeId
                  ? "border border-[rgba(46,139,255,0.35)] bg-[rgba(46,139,255,0.1)]"
                  : "hover:bg-[rgba(120,160,220,0.06)]"
              }`}
            >
              <button
                onClick={() => {
                  setActiveId(t.id);
                  setPanel(false);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-xs font-medium text-[var(--text-hi)]">
                  {t.pinned && <Pin className="mr-1 inline h-2.5 w-2.5 text-[var(--accent-hi)]" />}
                  {t.title}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--text-low)]">{relative(t.updatedAt)}</p>
              </button>
              <button
                onClick={() => updateThread(surface, t.id, { pinned: !t.pinned })}
                aria-label={t.pinned ? "Unpin conversation" : "Pin conversation"}
                className="rounded-md p-1 text-[var(--text-low)] opacity-0 transition-opacity hover:text-[var(--accent-hi)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Pin className="h-3 w-3" />
              </button>
              <button
                onClick={() => {
                  deleteThread(surface, t.id);
                  if (activeId === t.id) setActiveId(null);
                }}
                aria-label="Delete conversation"
                className="rounded-md p-1 text-[var(--text-low)] opacity-0 transition-opacity hover:text-[var(--loss)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {threads.length > 0 && (
        <button
          onClick={() => {
            clearAll(surface);
            setActiveId(null);
            toast.success("History cleared");
          }}
          className="btn btn-ghost mt-2 w-full !text-xs"
        >
          Clear all history
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] gap-4 lg:h-[calc(100vh-10rem)]">
      {/* Conversations, persistent on wide screens */}
      <aside className="panel hidden w-64 shrink-0 flex-col p-3 lg:flex">{ThreadList}</aside>

      {/* Mobile conversations sheet */}
      <AnimatePresence>
        {panel && (
          <motion.div
            className="fixed inset-0 z-[80] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/72 backdrop-blur-sm"
              onClick={() => setPanel(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Conversations"
              className="raised absolute inset-y-0 right-0 flex w-[84%] max-w-xs flex-col p-4"
              initial={reduce ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "100%" }}
              transition={
                reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-hi)]">Conversations</p>
                <button
                  onClick={() => setPanel(false)}
                  className="btn btn-ghost !px-2"
                  aria-label="Close conversations"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{ThreadList}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation */}
      <section className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
            <Icon className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-hi)]">
              {active?.title ?? config.name}
            </p>
            <p className="text-[11px] text-[var(--text-low)]">{config.eyebrow}</p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-expanded={showSettings}
            className="btn btn-ghost !px-2"
            aria-label="Assistant settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPanel(true)}
            className="btn btn-ghost !px-2 lg:hidden"
            aria-label="Conversations"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </header>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 overflow-hidden border-b border-[var(--line)]"
            >
              <div className="space-y-4 p-4">
                <div>
                  <p className="eyebrow mb-2">Response style</p>
                  <Segmented
                    value={prefs.style}
                    options={STYLE_OPTIONS}
                    onChange={(v) => setPref({ style: v })}
                    label="Response style"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-hi)]">Share my position</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                      Send your derived figures with each message so replies can reference them.
                      Nothing leaves your browser unless you ask a question.
                    </p>
                  </div>
                  <Switch
                    checked={prefs.sharePosition}
                    onChange={(v) => setPref({ sharePosition: v })}
                    label="Share my position"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="no-bar min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {!active || active.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-2 text-center">
              <Mark size={44} />
              <h1 className="display mt-4 text-xl">{config.welcome}</h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
                {config.blurb}
              </p>

              {ready === false && (
                <p className="chip chip-warn mt-4 max-w-sm !whitespace-normal !py-2 text-left leading-relaxed">
                  The assistant is not connected yet. Set ANTHROPIC_API_KEY in the server
                  environment to enable it.
                </p>
              )}

              <div className="mt-6 w-full max-w-md space-y-2">
                {config.prompts.map((p, i) => (
                  <motion.button
                    key={p}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduce ? 0 : 0.34, delay: reduce ? 0 : 0.06 * i }}
                    onClick={() => send(p)}
                    disabled={ready === false}
                    className="flex w-full items-center gap-2.5 rounded-full border border-[var(--line)] bg-[rgba(5,7,15,0.5)] px-4 py-2.5 text-left text-[13px] text-[var(--text)] transition-colors hover:border-[rgba(46,139,255,0.4)] hover:bg-[rgba(46,139,255,0.07)] disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]" />
                    {p}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {active.messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.28 }}
                  className={m.role === "user" ? "flex justify-end" : ""}
                >
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border border-[rgba(46,139,255,0.3)] bg-[rgba(46,139,255,0.12)] px-4 py-2.5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-hi)]">
                        {m.content}
                      </p>
                    </div>
                  ) : (
                    <div className="group flex gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
                        <Icon className="h-3.5 w-3.5 text-[var(--accent-hi)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {m.error ? (
                          <p className="chip chip-warn !whitespace-normal !py-2 leading-relaxed">
                            {m.error}
                          </p>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                            {m.content}
                            {streaming && !m.content && (
                              <span className="inline-flex gap-1 align-middle">
                                {[0, 1, 2].map((d) => (
                                  <motion.span
                                    key={d}
                                    className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-hi)]"
                                    animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
                                    transition={{
                                      duration: 1.1,
                                      repeat: Infinity,
                                      delay: d * 0.18,
                                    }}
                                  />
                                ))}
                              </span>
                            )}
                          </p>
                        )}
                        {m.content && !streaming && (
                          <div className="mt-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              onClick={() => copy(m.id, m.content)}
                              className="btn btn-ghost !px-2 !py-1 !text-[11px]"
                              aria-label="Copy reply"
                            >
                              {copiedId === m.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedId === m.id ? "Copied" : "Copy"}
                            </button>
                            <button
                              onClick={regenerate}
                              className="btn btn-ghost !px-2 !py-1 !text-[11px]"
                              aria-label="Regenerate reply"
                            >
                              <RotateCcw className="h-3 w-3" /> Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-[var(--line)] p-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] p-2 transition-colors focus-within:border-[var(--accent)]">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={ready === false ? "Assistant not connected" : `Ask ${config.name}`}
                aria-label={`Message ${config.name}`}
                disabled={ready === false}
                className="max-h-40 min-h-[38px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-low)] disabled:opacity-60"
              />
              {streaming ? (
                <button
                  onClick={stop}
                  className="btn btn-outline !px-3"
                  aria-label="Stop generating"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || ready === false}
                  className="btn btn-primary !px-3"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-[var(--text-low)]">
              {config.disclaimer}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
