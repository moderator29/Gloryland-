/**
 * A switch with a thumb-sized hit area.
 *
 * The visual track is 46 by 26, which is the right size on screen and the wrong
 * size for a finger. The control here keeps that track and hangs it inside a
 * 44 by 44 target, so the tappable area meets the minimum without the switch
 * growing into a slab. It reports itself as a switch, so assistive technology
 * announces on and off rather than a press.
 */

export type SwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Read out by assistive technology. Required, because a switch has no text. */
  label: string;
  /** Points a visible label at this control. */
  id?: string;
  disabled?: boolean;
};

export function Switch({ checked, onChange, label, id, disabled = false }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        aria-hidden="true"
        className={`relative block h-[26px] w-[46px] rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--ink-300)]"
        }`}
        style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.45)" }}
      >
        <span
          className="absolute top-[3px] block h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ left: 3, transform: `translateX(${checked ? 20 : 0}px)` }}
        />
      </span>
    </button>
  );
}
