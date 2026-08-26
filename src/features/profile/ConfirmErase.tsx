import { useId, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * A destructive action behind a typed phrase.
 *
 * Two taps are enough to stop a mis-tap, and not enough to stop a member who
 * has not read what they are about to lose. Typing the phrase makes the action
 * deliberate: it cannot be reached by muscle memory, and the phrase itself
 * names what goes.
 *
 * The state of the guard is announced, so the reason the button is unavailable
 * is audible rather than only visible.
 */

export type ConfirmEraseProps = {
  /** Exactly what has to be typed. Kept short and shown in the label. */
  phrase: string;
  /** What the button says once the phrase matches. */
  actionLabel: string;
  /** Plain account of what is destroyed. Rendered above the field. */
  children: ReactNode;
  onConfirm: () => void;
  /** Nothing to erase: the control explains itself and stays disabled. */
  disabled?: boolean;
  disabledNote?: string;
};

export function ConfirmErase({
  phrase,
  actionLabel,
  children,
  onConfirm,
  disabled = false,
  disabledNote,
}: ConfirmEraseProps) {
  const uid = useId();
  const fieldId = `erase-${uid}`;
  const helpId = `erase-help-${uid}`;
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toUpperCase() === phrase.toUpperCase();

  return (
    <div>
      <div className="text-sm leading-relaxed text-[var(--text)]">{children}</div>

      <label htmlFor={fieldId} className="eyebrow mt-4 block">
        Type {phrase} to continue
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input
          id={fieldId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={helpId}
          placeholder={phrase}
          className="machine min-w-0 flex-1 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 uppercase tracking-[0.12em] text-[var(--text-hi)] outline-none transition-colors placeholder:text-[var(--text-low)] placeholder:tracking-[0.12em] focus:border-[var(--loss)] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !matches}
          onClick={() => {
            onConfirm();
            setTyped("");
          }}
          className="btn btn-danger min-h-[44px] shrink-0"
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      </div>

      <p id={helpId} className="mt-2 text-xs leading-relaxed text-[var(--text-low)]" role="status">
        {disabled
          ? (disabledNote ?? "There is nothing here to erase.")
          : matches
            ? `The phrase matches. ${actionLabel} is now available and cannot be undone.`
            : `The button stays unavailable until the field reads ${phrase}.`}
      </p>
    </div>
  );
}
