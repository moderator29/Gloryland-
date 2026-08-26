import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import {
  PASSCODE_LENGTH,
  PASSWORD_MIN,
  checkPasscode,
  checkPassword,
  passwordStrength,
} from "@/domain/credentials";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Sign up step two: a password, its confirmation, and a six digit passcode.
 *
 * The passcode is not a second password. It is the short one for coming back
 * to a session on the same device, which is why it is six digits in boxes
 * rather than another masked field: the shape of the input tells you what it
 * is for before the label does.
 *
 * The note at the bottom is deliberate and should not be softened. This locks
 * the portal on this device. It is not an account, there is no server holding
 * it, and there is no recovery: saying otherwise would be claiming a control
 * the build does not have.
 */

export type SecureValue = { password: string; confirm: string; passcode: string };

const STRENGTH_LABEL = ["", "Fair", "Good", "Strong"] as const;
const STRENGTH_TINT = ["", "var(--warn)", "var(--accent-hi)", "var(--gain)"] as const;

export function SecureStep({
  value,
  onChange,
  handle,
  touched,
}: {
  value: SecureValue;
  onChange: (next: SecureValue) => void;
  handle: string;
  touched: boolean;
}) {
  const reduce = useReducedMotion();
  const [reveal, setReveal] = useState(false);

  const pw = checkPassword(value.password, handle);
  const strength = passwordStrength(value.password);
  const confirmMismatch = value.confirm.length > 0 && value.confirm !== value.password;
  const code = checkPasscode(value.passcode);

  const set = (patch: Partial<SecureValue>) => onChange({ ...value, ...patch });

  return (
    <div>
      <h1 className="display text-xl sm:text-2xl">Lock the portal</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
        A password to set it, and a six digit passcode for getting back in quickly.
      </p>

      <div className="mt-6 space-y-5">
        <Wrap
          id="pw"
          label="Password"
          hint={`At least ${PASSWORD_MIN} characters. Length beats symbols.`}
          icon={Lock}
          error={touched && value.password.length > 0 && !pw.ok ? pw.message : undefined}
          ok={pw.ok}
          trailing={
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-low)] transition-colors hover:text-[var(--text-hi)]"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          <input
            id="pw"
            type={reveal ? "text" : "password"}
            value={value.password}
            onChange={(e) => set({ password: e.target.value })}
            autoComplete="new-password"
            autoFocus
            className="w-full bg-transparent text-sm text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
          />
        </Wrap>

        {/* Three segments, filled to the reading. A meter, not a rule: nothing
            below Strong is refused. */}
        {value.password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="h-1 flex-1 rounded-full"
                  initial={false}
                  animate={{
                    background:
                      strength >= i ? (STRENGTH_TINT[strength] as string) : "var(--line-hi)",
                  }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                />
              ))}
            </div>
            <span
              className="w-14 shrink-0 text-right text-[11px] font-semibold"
              style={{ color: (STRENGTH_TINT[strength] as string) || "var(--text-low)" }}
            >
              {STRENGTH_LABEL[strength]}
            </span>
          </div>
        )}

        <Wrap
          id="pw2"
          label="Confirm password"
          icon={Lock}
          error={confirmMismatch ? "These do not match." : undefined}
          ok={value.confirm.length > 0 && !confirmMismatch && pw.ok}
        >
          <input
            id="pw2"
            type={reveal ? "text" : "password"}
            value={value.confirm}
            onChange={(e) => set({ confirm: e.target.value })}
            autoComplete="new-password"
            className="w-full bg-transparent text-sm text-[var(--text-hi)] outline-none"
          />
        </Wrap>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="code-0" className="eyebrow flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" /> Passcode
            </label>
            <span className="text-[11px] text-[var(--text-low)]">{PASSCODE_LENGTH} digits</span>
          </div>
          <PasscodeBoxes
            value={value.passcode}
            onChange={(passcode) => set({ passcode })}
            invalid={touched && value.passcode.length === PASSCODE_LENGTH && !code.ok}
          />
          {code.message && value.passcode.length > 0 && (
            <p className="mt-2 text-xs text-[var(--loss)]">{code.message}</p>
          )}
        </div>
      </div>

      <p className="inset mt-6 p-3.5 text-xs leading-relaxed text-[var(--text-low)]">
        This locks the portal on this device. It is not an account: nothing is sent anywhere, and
        there is no way to recover it. Write the password down somewhere you trust.
      </p>
    </div>
  );
}

/**
 * Six boxes that behave like one field.
 *
 * The whole value lives in the parent, and each box is a view onto one
 * character of it, so a paste into any box fills the row and the browser's own
 * one time code autofill works. Backspace on an empty box steps back, which is
 * the behaviour everyone expects and almost nobody implements.
 */
function PasscodeBoxes({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState(-1);

  useEffect(() => {
    // Keep the caret with the first empty box while the row is being filled.
    if (focused === -1) return;
    const target = Math.min(value.length, PASSCODE_LENGTH - 1);
    if (focused !== target && value.length < PASSCODE_LENGTH) refs.current[target]?.focus();
  }, [value, focused]);

  const write = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length))
      .replace(/\D/g, "")
      .slice(0, PASSCODE_LENGTH);
    onChange(next);
    refs.current[Math.min(next.length, PASSCODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="mt-2 flex gap-2">
      {Array.from({ length: PASSCODE_LENGTH }, (_, i) => {
        const filled = value.length > i;
        return (
          <motion.input
            key={i}
            id={`code-${i}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={PASSCODE_LENGTH}
            value={value[i] ?? ""}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(-1)}
            onChange={(e) => write(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                const cut = value.length > i ? i : Math.max(0, value.length - 1);
                onChange(value.slice(0, cut));
                refs.current[Math.max(0, cut - 1)]?.focus();
              }
              if (e.key === "ArrowLeft") refs.current[Math.max(0, i - 1)]?.focus();
              if (e.key === "ArrowRight")
                refs.current[Math.min(PASSCODE_LENGTH - 1, i + 1)]?.focus();
            }}
            aria-label={`Passcode digit ${i + 1}`}
            animate={reduce ? undefined : { scale: filled ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.18 }}
            className={`tabular min-h-[52px] w-full rounded-xl border bg-[rgba(5,7,15,0.6)] text-center text-lg font-semibold text-[var(--text-hi)] outline-none transition-colors ${
              invalid
                ? "border-[var(--loss)]"
                : filled
                  ? "border-[var(--accent)]"
                  : "border-[var(--line-hi)] focus:border-[var(--accent)]"
            }`}
          />
        );
      })}
    </div>
  );
}

function Wrap({
  id,
  label,
  hint,
  icon: Icon,
  error,
  ok,
  trailing,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Lock;
  error?: string;
  ok?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
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
        className={`mt-1.5 flex items-center gap-2.5 rounded-xl border bg-[rgba(5,7,15,0.6)] px-3.5 py-3 transition-colors ${border}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--text-low)]" strokeWidth={1.9} />
        {children}
        {trailing}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--loss)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--text-low)]">{hint}</p>
      ) : null}
    </div>
  );
}
