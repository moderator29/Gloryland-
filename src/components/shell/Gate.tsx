import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  CircleDashed,
  Layers3,
  Loader2,
  Repeat,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  X,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Wordmark } from "@/components/brand/Mark";
import { Ambience } from "./Ambience";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { playTap, playTierChord } from "@/lib/sound";
import { money } from "@/components/system/format";
import { CYCLE_DAYS, CYCLE_RETURN, tierForAmount } from "@/domain/tiers";
import {
  APPROACHES,
  DISPLAY_MAX,
  START_BANDS,
  USERNAME_MAX,
  checkUsername,
  normaliseUsername,
  validateDisplayName,
  validateUsername,
  type ApproachId,
  type UsernameCheck,
} from "@/domain/identity";

/**
 * Entry to the authenticated area.
 *
 * Four steps rather than one field, because the answers actually change what
 * the product does: the handle is the member's identity everywhere, the
 * display name is what surfaces address them by, the approach decides what
 * Home and Insight lead with, and the starting scale prefills the deposit form.
 *
 * Nothing here creates an account. There is no password, no server and no
 * recovery, and the closing line says exactly that rather than implying a
 * security guarantee the build cannot make.
 */

const STEPS = ["Identity", "Approach", "Scale", "Ready"] as const;
type Step = 0 | 1 | 2 | 3;

const APPROACH_ICON = {
  steady: Timer,
  compound: Repeat,
  ladder: Layers3,
  watching: CircleDashed,
} as const;

export function Gate({ children }: { children: ReactNode }) {
  const { member, setMember } = useUser();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>(0);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [check, setCheck] = useState<UsernameCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [approach, setApproach] = useState<ApproachId>("steady");
  const [band, setBand] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  const nameCheck = validateDisplayName(displayName);
  const liveHandle = validateUsername(handle);
  const handleOk = check?.ok === true && check.value === normaliseUsername(handle);

  // Debounced availability. The check is async on purpose: it is the one seam
  // that becomes a server call, so the interface is built against a real
  // pending state rather than one that only shows up in production.
  const seq = useRef(0);
  useEffect(() => {
    const value = normaliseUsername(handle);
    if (!validateUsername(value).ok) {
      setCheck(null);
      setChecking(false);
      return;
    }
    const id = ++seq.current;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void checkUsername(value).then((result) => {
        // A slower earlier request must never overwrite a newer answer.
        if (seq.current !== id) return;
        setCheck(result);
        setChecking(false);
      });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [handle]);

  // Typing a display name first offers a handle, which is what most people
  // want, but it stops suggesting the moment they edit the handle themselves.
  const handleTouched = useRef(false);
  useEffect(() => {
    if (handleTouched.current) return;
    setHandle(normaliseUsername(displayName.replace(/\s+/g, "")));
  }, [displayName]);

  const finish = useCallback(() => {
    if (!nameCheck.ok || !handleOk) return;
    playTierChord(tierForAmount(band ?? 0)?.id ?? "core");
    setMember({
      username: check!.value,
      displayName: nameCheck.value,
      approach,
      joinedAt: Date.now(),
    });
    if (band !== null) {
      try {
        sessionStorage.setItem("rgl_start_amount", String(band));
      } catch {
        /* the prefill is a convenience, never a requirement */
      }
    }
  }, [nameCheck, handleOk, check, approach, band, setMember]);

  if (member) return <>{children}</>;

  const canAdvance = step === 0 ? nameCheck.ok && handleOk && !checking : step === 1 ? true : true;

  const next = () => {
    if (step === 0) setTouched(true);
    if (!canAdvance) return;
    if (step < 3) playTap();
    if (step === 3) finish();
    else setStep((s) => (s + 1) as Step);
  };

  const slide = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink-000)] px-4 py-8 sm:px-5 sm:py-10">
      <Ambience />

      <motion.div
        className="glass relative z-10 w-full max-w-lg p-6 sm:p-8"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Wordmark size={28} stacked tagline />

        <StepRail step={step} reduce={reduce} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="mt-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide}>
              {step === 0 && (
                <Identity
                  displayName={displayName}
                  onDisplayName={setDisplayName}
                  handle={handle}
                  onHandle={(v) => {
                    handleTouched.current = true;
                    setHandle(v);
                  }}
                  nameCheck={nameCheck}
                  liveHandle={liveHandle}
                  check={check}
                  checking={checking}
                  touched={touched}
                />
              )}
              {step === 1 && <ApproachStep value={approach} onChange={setApproach} />}
              {step === 2 && <ScaleStep value={band} onChange={setBand} />}
              {step === 3 && (
                <ReadyStep
                  displayName={nameCheck.value}
                  handle={check?.value ?? ""}
                  approach={approach}
                  band={band}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex items-center gap-2.5">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="btn btn-ghost min-h-[44px] shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Back</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!canAdvance}
              className="btn btn-primary min-h-[48px] flex-1"
            >
              {step === 3 ? "Enter Rigel" : "Continue"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
          No account is created and no password is set. This build keeps your identity and your
          ledger in this browser only, so clearing site data clears both.
        </p>
      </motion.div>
    </div>
  );
}

/* ── step rail ──────────────────────────────────────────────────────────── */

function StepRail({ step, reduce }: { step: Step; reduce: boolean }) {
  return (
    <ol className="mt-7 flex items-center gap-1.5" aria-label="Sign up progress">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="min-w-0 flex-1">
            <div className="relative h-1 overflow-hidden rounded-full bg-[rgba(120,160,220,0.14)]">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
                initial={false}
                animate={{ width: state === "todo" ? "0%" : "100%" }}
                transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            {/* Four labels do not fit across a 360px screen without truncating
                to nonsense, so the narrow layout names only where you are. */}
            <p
              className={`eyebrow mt-2 truncate ${
                state === "todo" ? "text-[var(--text-low)]" : "text-[var(--accent-hi)]"
              } ${state === "current" ? "" : "hidden sm:block"}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/* ── step 1: identity ───────────────────────────────────────────────────── */

function Identity({
  displayName,
  onDisplayName,
  handle,
  onHandle,
  nameCheck,
  liveHandle,
  check,
  checking,
  touched,
}: {
  displayName: string;
  onDisplayName: (v: string) => void;
  handle: string;
  onHandle: (v: string) => void;
  nameCheck: { ok: boolean; reason?: string };
  liveHandle: UsernameCheck;
  check: UsernameCheck | null;
  checking: boolean;
  touched: boolean;
}) {
  const showNameError = touched && !nameCheck.ok;
  // Format problems surface as soon as there is something to judge. The taken
  // check only speaks once it has actually run.
  const handleError =
    handle.length > 0 && !liveHandle.ok
      ? liveHandle.reason
      : check && !check.ok
        ? check.reason
        : undefined;
  const handleOk = check?.ok === true && !checking && check.value === normaliseUsername(handle);

  return (
    <div>
      <h1 className="display text-xl sm:text-2xl">Set up your identity</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
        Two names. One is what we call you on screen, the other is your handle and does not change.
      </p>

      <div className="mt-6 space-y-5">
        <Field
          id="display-name"
          label="Your name"
          hint="Shown on your surfaces. You can change it later."
          icon={User}
          error={showNameError ? nameCheck.reason : undefined}
        >
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => onDisplayName(e.target.value.slice(0, DISPLAY_MAX))}
            placeholder="Marcus Adeyemi"
            autoComplete="name"
            autoFocus
            className="w-full bg-transparent text-sm text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
          />
        </Field>

        <Field
          id="handle"
          label="Handle"
          hint={`Letters, numbers and underscores. Up to ${USERNAME_MAX}.`}
          icon={AtSign}
          error={handleError}
          ok={handleOk}
          busy={checking}
        >
          <input
            id="handle"
            value={handle}
            onChange={(e) => onHandle(normaliseUsername(e.target.value))}
            placeholder="marcus"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-state"
            className="machine w-full bg-transparent text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
          />
        </Field>

        <p id="handle-state" className="sr-only" role="status">
          {checking
            ? "Checking availability"
            : handleOk
              ? `${check?.value} is available`
              : (handleError ?? "")}
        </p>

        {check?.suggestions && check.suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--text-low)]">Try</span>
            {check.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onHandle(s)}
                className="chip chip-accent min-h-[32px] hover:opacity-80"
              >
                @{s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  icon: Icon,
  error,
  ok,
  busy,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: typeof User;
  error?: string;
  ok?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const border = error
    ? "border-[var(--loss)]"
    : ok
      ? "border-[var(--gain)]"
      : "border-[var(--line-hi)] focus-within:border-[var(--accent)]";
  return (
    <div>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <div
        className={`mt-1.5 flex items-center gap-2.5 rounded-xl border bg-[rgba(5,7,15,0.62)] px-3.5 py-3 transition-colors ${border}`}
      >
        <Icon
          className="h-4 w-4 shrink-0 text-[var(--text-low)]"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        {children}
        {busy && (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-[var(--text-low)]"
            aria-hidden="true"
          />
        )}
        {!busy && ok && (
          <Check
            className="h-4 w-4 shrink-0 text-[var(--gain)]"
            strokeWidth={2.4}
            aria-hidden="true"
          />
        )}
        {!busy && error && (
          <X className="h-4 w-4 shrink-0 text-[var(--loss)]" strokeWidth={2.4} aria-hidden="true" />
        )}
      </div>
      <p className={`mt-1.5 text-xs ${error ? "text-[var(--loss)]" : "text-[var(--text-low)]"}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

/* ── step 2: approach ───────────────────────────────────────────────────── */

function ApproachStep({
  value,
  onChange,
}: {
  value: ApproachId;
  onChange: (v: ApproachId) => void;
}) {
  return (
    <div>
      <h1 className="display text-xl sm:text-2xl">How do you want to run it?</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
        This changes what your surfaces lead with. It never changes the rate. Every rung earns the
        same {(CYCLE_RETURN * 100).toFixed(0)}% across {CYCLE_DAYS} days whatever you pick, and you
        can change your answer at any time.
      </p>

      <div
        role="radiogroup"
        aria-label="Investing approach"
        className="mt-5 grid gap-2.5 sm:grid-cols-2"
      >
        {APPROACHES.map((a) => {
          const Icon = APPROACH_ICON[a.icon];
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(a.id)}
              className={`sheen flex min-h-[44px] flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[rgba(46,139,255,0.1)]"
                  : "border-[var(--line)] bg-[rgba(5,7,15,0.45)] hover:border-[var(--line-hi)]"
              }`}
            >
              <span className="flex w-full items-center gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[var(--accent-hi)]" : "text-[var(--text-low)]"}`}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-[var(--text-hi)]">{a.name}</span>
                {active && (
                  <Check
                    className="ml-auto h-4 w-4 text-[var(--accent-hi)]"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-1.5 text-xs leading-relaxed text-[var(--text-low)]">
                {a.pitch}
              </span>
            </button>
          );
        })}
      </div>

      {/* The trade is stated in place rather than buried, because a member
          choosing between four options should see the cost of each one. */}
      <div className="inset mt-4 p-3.5">
        <p className="eyebrow">What that means</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text)]">
          {APPROACHES.find((a) => a.id === value)?.effect}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--warn)]">
          {APPROACHES.find((a) => a.id === value)?.tradeoff}
        </p>
      </div>
    </div>
  );
}

/* ── step 3: scale ──────────────────────────────────────────────────────── */

function ScaleStep({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <h1 className="display text-xl sm:text-2xl">Where would you start?</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
        Only to prefill the form when you are ready. Nothing is placed now and you can pick any
        amount later.
      </p>

      <div
        role="radiogroup"
        aria-label="Starting amount"
        className="mt-5 max-h-[15.5rem] space-y-2 overflow-y-auto pr-1"
      >
        {START_BANDS.map((b) => {
          const active = value === b.amount;
          return (
            <button
              key={b.tierId}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? null : b.amount)}
              className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[rgba(46,139,255,0.1)]"
                  : "border-[var(--line)] bg-[rgba(5,7,15,0.45)] hover:border-[var(--line-hi)]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-hi)]">
                  {money(b.amount)}{" "}
                  <span className="font-normal text-[var(--text-low)]">{b.label}</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-low)]">
                  Settles inside {b.settlementHours} hours
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="metric tabular text-sm text-[var(--gain)]">
                  {money(Math.round(b.daily))}
                </p>
                <p className="tag-micro mt-0.5">per day</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(null)}
        className="btn btn-ghost mt-3 min-h-[44px] w-full !text-xs"
      >
        Skip, I am still deciding
      </button>
    </div>
  );
}

/* ── step 4: ready ──────────────────────────────────────────────────────── */

function ReadyStep({
  displayName,
  handle,
  approach,
  band,
}: {
  displayName: string;
  handle: string;
  approach: ApproachId;
  band: number | null;
}) {
  const a = APPROACHES.find((x) => x.id === approach);
  const rows: [string, string][] = [
    ["Name", displayName],
    ["Handle", `@${handle}`],
    ["Approach", a?.name ?? ""],
    ["Starting at", band === null ? "Not decided yet" : money(band)],
  ];

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.12)]">
          <Sparkles
            className="h-4 w-4 text-[var(--accent-hi)]"
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </span>
        <h1 className="display text-xl sm:text-2xl">Ready, {displayName.split(" ")[0]}</h1>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
        Nothing below is fixed. All of it is editable from your profile.
      </p>

      <dl className="ledger mt-5">
        {rows.map(([k, v]) => (
          <div key={k} className="rail-row">
            <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">{k}</dt>
            <dd
              className={`shrink-0 text-sm font-semibold text-[var(--text-hi)] ${k === "Handle" ? "machine" : ""}`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="inset mt-4 flex items-start gap-2.5 p-3.5">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-low)]"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-[var(--text-low)]">
          Capital placed into a vault is at risk, including the risk of total loss. A published rate
          is a stated structure, not a promise, and nothing in this product is investment advice.
        </p>
      </div>
    </div>
  );
}
