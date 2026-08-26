import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  Layers,
  RefreshCw,
  Save,
  ShieldCheck,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { APPROACHES, DISPLAY_MAX, validateDisplayName } from "@/domain/identity";
import { Progress } from "@/components/system/ui";
import { Value } from "@/components/system/Value";
import { fullDate, money } from "@/components/system/format";
import { SettingsBlock, SettingsGroup, SettingsNote } from "@/components/system/SettingsUI";
import { Cadence, TierBadge } from "@/features/engagement";
import {
  MemberAvatar,
  StatBand,
  memberSince,
  useMemberIdentity,
  type Stat,
} from "@/features/profile";

/**
 * Profile: who the member is, what they have put in, and how they say they
 * want to run it.
 *
 * Every figure on this page is derived from the member's own ledger by
 * `useLedger`, and the two things that are not figures, the name and the
 * approach, are theirs to set. Nothing is fetched, nothing is counted that the
 * browser cannot see, and the standing shown is the one the ladder computes
 * from lifetime contribution rather than anything awarded here.
 */

/** The approach records name their icon; the mapping to a mark lives in the UI. */
const APPROACH_ICON: Record<string, LucideIcon> = {
  steady: Timer,
  compound: RefreshCw,
  ladder: Layers,
  watching: Eye,
};

export default function SettingsProfile() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const member = useMemberIdentity();

  const [name, setName] = useState(member.displayName);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number>(0);

  // The context is the owner of the name. When it changes anywhere else, the
  // field follows rather than holding a stale draft.
  useEffect(() => {
    setName(member.displayName);
  }, [member.displayName]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const check = validateDisplayName(name);
  const dirty = check.ok && check.value !== member.displayName;

  const since = useMemo(
    () => memberSince(member.joinedAt, snap.events),
    [member.joinedAt, snap.events],
  );

  const opened = snap.positions.length;
  // Closed rather than matured. Nothing matures, so the only way a position
  // stops is that the member closed it, and that is what this counts.
  const closed = snap.positions.filter((p) => p.closed).length;

  const stats: Stat[] = [
    {
      key: "opened",
      label: "Positions opened",
      value: opened.toString(),
      sub: opened === 0 ? "Nothing placed yet" : `${snap.activePositions.length} still open`,
    },
    {
      key: "closed",
      label: "Positions closed",
      value: closed.toString(),
      sub: closed === 0 ? "None closed yet" : "Principal returned to your balance",
      tone: closed > 0 ? "gain" : "default",
    },
    {
      key: "accrued",
      label: "Total accrued",
      value: <Value value={snap.rewardsAccrued} decimals={2} />,
      sub: `${money(snap.rewardsClaimed, 2)} claimed`,
      tone: "gain",
    },
    {
      key: "daily",
      label: "Daily accrual",
      value: <Value value={snap.dailyRate} decimals={2} />,
      sub: snap.dailyRate > 0 ? "Across open terms" : "No term accruing",
      tone: "accent",
    },
    {
      key: "cadence",
      label: "Consecutive days",
      value: <Cadence compact />,
      sub: "Visits to this browser",
      plain: true,
    },
  ];

  const save = () => {
    if (!dirty) return;
    member.setDisplayName(check.value);
    toast.success("Display name updated");
  };

  const copyReference = async () => {
    if (!member.reference) return;
    try {
      await navigator.clipboard.writeText(member.reference);
      setCopied(true);
      toast.success("Member reference copied");
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the reference and copy it manually.");
    }
  };

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.42, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      {/* ── Identity ────────────────────────────────────────────────────── */}
      <motion.section {...rise(0)} className="glass p-5 sm:p-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <MemberAvatar
            initials={member.initials}
            seed={member.handle || member.displayName}
            size="lg"
          />

          <div className="min-w-0 flex-1">
            <p className="eyebrow">Member</p>
            <h1 className="display mt-1 truncate text-2xl sm:text-3xl">{member.displayName}</h1>
            {member.handle && (
              <p className="machine mt-1 truncate text-[var(--text-mid)]">@{member.handle}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TierBadge tier={snap.tier} showEntry />
              <span className="chip">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {since.at === null
                  ? "No start date recorded"
                  : `${since.source === "member" ? "Member since" : "First activity"} ${fullDate(since.at)}`}
              </span>
            </div>
          </div>
        </div>

        <hr className="rule-glow my-5" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="tag-micro">Member reference</p>
            <p className="machine mt-1.5 text-base text-[var(--text-hi)]">
              {member.reference || "Not available"}
            </p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-[var(--text-low)]">
              Derived from your handle, so it is the same every time and never has to be stored.
              Quote it when you write to the desk.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyReference()}
            disabled={!member.reference}
            className="btn btn-outline min-h-[44px]"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy reference"}
          </button>
        </div>
      </motion.section>

      {/* ── Standing ────────────────────────────────────────────────────── */}
      <motion.section {...rise(1)} className="band">
        <div className="band-head">
          <h2 className="band-title">Standing</h2>
          <span className="hairline" aria-hidden="true" />
        </div>

        <div className="lede mt-4">
          <div className="min-w-0">
            <p className="tag-micro">Capital brought in</p>
            <span className="figure-lead mt-2">
              <Value value={snap.contributed} />
            </span>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-low)]">
              {snap.tier
                ? `Standing is measured on ${money(snap.standing)}, the greater of capital brought in and the most ever deployed at once. That places you at ${snap.tier.name}, rank ${snap.tier.rank} of 6.`
                : "Standing is the greater of capital brought in and the most ever deployed at once. The first rung opens once that figure reaches the entry for Core."}
            </p>
          </div>

          <div className="lede-rail">
            <div className="rail-stat">
              <span className="tag-micro">Standing</span>
              <span className="metric text-lg">{money(snap.standing)}</span>
            </div>
            <div className="rail-stat">
              <span className="tag-micro">Next rung</span>
              <span className="metric text-lg">{snap.nextTier ? snap.nextTier.name : "Top"}</span>
            </div>
            <div className="rail-stat">
              <span className="tag-micro">Still required</span>
              <span className="metric text-lg text-[var(--accent-hi)]">
                {snap.nextTier ? money(snap.toNextTier) : "None"}
              </span>
            </div>
            <div className="rail-stat">
              <span className="tag-micro">Portfolio value</span>
              <span className="metric text-lg">{money(snap.portfolioValue)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="tag-micro">
              {snap.nextTier ? `Progress to ${snap.nextTier.name}` : "Ladder complete"}
            </span>
            <span className="tabular text-xs text-[var(--text-mid)]">
              {Math.round(snap.tierProgress * 100)}%
            </span>
          </div>
          <Progress
            value={snap.tierProgress}
            label={
              snap.nextTier
                ? `Progress to ${snap.nextTier.name}, ${money(snap.toNextTier)} still required`
                : "Top of the ladder reached"
            }
          />
        </div>
      </motion.section>

      {/* ── Statistics ──────────────────────────────────────────────────── */}
      <motion.section {...rise(2)} className="band">
        <div className="band-head">
          <h2 className="band-title">Record</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <p className="mb-4 mt-2 text-xs text-[var(--text-low)]">
          Read from the events in this browser. Open a vault and every figure here moves.
        </p>
        <StatBand stats={stats} />
      </motion.section>

      {/* ── Name ────────────────────────────────────────────────────────── */}
      <motion.div {...rise(3)}>
        <SettingsGroup icon={UserRound} name="Display name" descriptor="Yours to change">
          <SettingsBlock>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label htmlFor="display-name" className="eyebrow">
                What we call you on screen
              </label>
              <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                <input
                  id="display-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={DISPLAY_MAX}
                  autoComplete="nickname"
                  aria-describedby="display-name-help"
                  aria-invalid={name.length > 0 && !check.ok}
                  disabled={!member.canEditName}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 text-sm text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!dirty || !member.canEditName}
                  className="btn btn-primary min-h-[44px] shrink-0"
                >
                  <Save className="h-4 w-4" aria-hidden="true" /> Save name
                </button>
              </div>
              <p
                id="display-name-help"
                className="mt-2 text-xs text-[var(--text-low)]"
                role="status"
              >
                {!check.ok && name.length > 0
                  ? check.reason
                  : dirty
                    ? `Save to change from "${member.displayName}" to "${check.value}".`
                    : `Up to ${DISPLAY_MAX} characters. Your handle @${member.handle || "handle"} does not change with it.`}
              </p>
            </form>
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>

      {/* ── Approach ────────────────────────────────────────────────────── */}
      <motion.div {...rise(4)}>
        <SettingsGroup
          icon={APPROACH_ICON[member.approach.id] ?? Eye}
          name="Approach"
          descriptor={member.approach.name}
        >
          <SettingsBlock>
            <p className="text-sm leading-relaxed text-[var(--text)]">
              How you have said you want to run this. It changes what the interface leads with. It
              never changes the rate, the term, or anything the ledger computes.
            </p>

            <fieldset className="mt-4" disabled={!member.canEditApproach}>
              <legend className="sr-only">Investing approach</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {APPROACHES.map((a) => {
                  const Icon = APPROACH_ICON[a.id] ?? Eye;
                  const active = a.id === member.approach.id;
                  return (
                    <label
                      key={a.id}
                      className={`sheen relative flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                        active
                          ? "border-[rgba(46,139,255,0.42)] bg-[rgba(46,139,255,0.1)]"
                          : "border-[var(--line)] bg-[rgba(5,7,15,0.4)] hover:border-[var(--line-hi)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="approach"
                        value={a.id}
                        checked={active}
                        onChange={() => member.setApproach(a.id)}
                        className="sr-only"
                      />
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                          active
                            ? "border-[rgba(46,139,255,0.4)] bg-[rgba(46,139,255,0.14)]"
                            : "border-[var(--line)]"
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          strokeWidth={1.8}
                          className={`h-4 w-4 ${active ? "text-[var(--accent-hi)]" : "text-[var(--text-mid)]"}`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold ${active ? "text-[var(--text-hi)]" : "text-[var(--text)]"}`}
                        >
                          {a.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                          {a.pitch}
                        </span>
                      </span>
                      {active && (
                        <Check
                          className="absolute right-3 top-3 h-3.5 w-3.5 text-[var(--accent-hi)]"
                          aria-hidden="true"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="inset mt-4 p-3.5" aria-live="polite">
              <p className="tag-micro">What {member.approach.name} changes</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-mid)]">
                {member.approach.effect}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-[var(--warn)]">
                The trade: {member.approach.tradeoff}
              </p>
            </div>

            {!member.canEditApproach && (
              <p className="mt-3 text-xs text-[var(--text-low)]">
                This build cannot change the approach from here yet. It is shown as stored.
              </p>
            )}
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>

      <SettingsNote>
        Your name, handle and approach are held in this browser. There is no account server behind
        them, no password and no recovery, so clearing site data removes them along with your
        ledger.{" "}
        <Link to="/app/security" className="underline underline-offset-2">
          Security
        </Link>{" "}
        lists exactly what is stored and where.
      </SettingsNote>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 text-xs text-[var(--text-low)]">
        <Link
          to="/app/circle"
          className="inline-flex items-center gap-1.5 hover:text-[var(--text)]"
        >
          Your invite code <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <Link
          to="/app/activity"
          className="inline-flex items-center gap-1.5 hover:text-[var(--text)]"
        >
          The full ledger <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
