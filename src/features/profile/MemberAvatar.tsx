import { avatarPaint } from "./identity";

/**
 * The member's mark: their initials on a gradient derived from their handle.
 *
 * There is no photo upload in this build, and nothing here stands a stock
 * portrait in for one. Initials on a deterministic colour are honest about
 * that, and they have the useful property of being the same on every device
 * without a byte being stored or fetched.
 */

export type MemberAvatarProps = {
  /** Up to two letters. Anything longer is trimmed rather than wrapped. */
  initials: string;
  /** What the colour is derived from. The handle, wherever there is one. */
  seed: string;
  size?: "sm" | "md" | "lg";
  /**
   * Announce the avatar with this label. Left off, the mark is decorative,
   * which is right when the member's name is printed next to it.
   */
  label?: string;
  className?: string;
};

const SIZE: Record<NonNullable<MemberAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-xl text-xs",
  md: "h-12 w-12 rounded-2xl text-sm",
  lg: "h-16 w-16 rounded-[1.15rem] text-lg sm:h-20 sm:w-20 sm:text-xl",
};

export function MemberAvatar({
  initials,
  seed,
  size = "md",
  label,
  className = "",
}: MemberAvatarProps) {
  const paint = avatarPaint(seed);
  const letters = initials.slice(0, 2).toUpperCase() || "RG";

  return (
    <span
      className={`grid shrink-0 place-items-center font-bold tracking-[0.02em] ${SIZE[size]} ${className}`}
      style={{
        ...paint,
        // The same inner top highlight the surfaces carry, so the mark reads as
        // part of the material rather than a sticker on top of it.
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 26px -14px rgba(0,0,0,0.9)",
      }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {letters}
    </span>
  );
}
