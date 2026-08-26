/**
 * One normalised read of the signed in member, for the account surfaces.
 *
 * `UserContext` is being extended while these screens are being built, so this
 * hook reads it structurally rather than by exact shape: every field is looked
 * for, and where it is absent the value is derived from what is there. That
 * keeps Profile and Security compiling and correct whichever revision of the
 * context is on disk, and means no account surface has to guess a field name
 * twice.
 *
 * Nothing here writes storage. Editing goes through whichever setter the
 * context exposes, so the context stays the single owner of the record.
 */

import { useCallback, useMemo } from "react";
import { useUser } from "@/context/UserContext";
import {
  approachById,
  initials as deriveInitials,
  memberRef,
  normaliseUsername,
  type Approach,
  type ApproachId,
} from "@/domain/identity";

/**
 * Every field either revision of the context might carry. Optional throughout
 * on purpose: this is the shape we are willing to find, not the shape we
 * require.
 */
type LooseUser = Partial<{
  member: Partial<{
    username: string;
    displayName: string;
    approach: string;
    joinedAt: number;
  }> | null;
  username: string | null;
  displayName: string | null;
  handle: string | null;
  approach: string | null;
  initials: string;
  ref: string;
  setDisplayName: (name: string) => void;
  setUsername: (name: string | null) => void;
  setApproach: (id: string) => void;
  logout: () => void;
}>;

export type MemberIdentity = {
  /** True when the context holds a member record of any shape. */
  signedIn: boolean;
  /** What to print. Never empty. */
  displayName: string;
  /** The handle without its at sign, lowercase. Empty when unknown. */
  handle: string;
  /** Two letters for the avatar. Never empty. */
  initials: string;
  /** The quotable member reference, derived from the handle. */
  reference: string;
  /** The stated approach, always resolved to a full record. */
  approach: Approach;
  /** When the handle was claimed, or null when the record predates the field. */
  joinedAt: number | null;
  /** Whether this build can actually change the name and approach. */
  canEditName: boolean;
  canEditApproach: boolean;
  setDisplayName: (name: string) => void;
  setApproach: (id: ApproachId) => void;
  logout: () => void;
};

const NO_OP = () => {};

export function useMemberIdentity(): MemberIdentity {
  const ctx = useUser() as unknown as LooseUser;

  const member = ctx.member ?? null;

  // Display name: the record first, then the legacy single field the first
  // build stored under `username`. "Member" is a placeholder for the signed out
  // case, never a name anyone chose.
  const named = firstString(member?.displayName, ctx.displayName, ctx.username);
  const displayName = named ?? "Member";

  // Handle: the record's own, then anything the context calls a handle, then a
  // slug of the name they gave. `username` on the context is the display name
  // in the legacy shape, so it is normalised before it is shown with an at
  // sign. With no name at all the handle stays empty rather than inventing
  // @member for someone who has not claimed one.
  const handleSource = firstString(member?.username, ctx.handle) ?? named;
  const handle = handleSource ? normaliseUsername(handleSource) : "";

  const initials = firstString(ctx.initials) ?? deriveInitials(displayName, handle || displayName);

  const reference = firstString(ctx.ref) ?? (handle ? memberRef(handle) : "");

  const approach = approachById(firstString(member?.approach, ctx.approach));

  const joinedAt =
    typeof member?.joinedAt === "number" && Number.isFinite(member.joinedAt)
      ? member.joinedAt
      : null;

  const ctxSetDisplayName = ctx.setDisplayName;
  const ctxSetUsername = ctx.setUsername;
  const ctxSetApproach = ctx.setApproach;
  const ctxLogout = ctx.logout;

  const setDisplayName = useCallback(
    (name: string) => {
      if (ctxSetDisplayName) ctxSetDisplayName(name);
      else if (ctxSetUsername) ctxSetUsername(name);
    },
    [ctxSetDisplayName, ctxSetUsername],
  );

  const setApproach = useCallback(
    (id: ApproachId) => {
      ctxSetApproach?.(id);
    },
    [ctxSetApproach],
  );

  return useMemo(
    () => ({
      signedIn: Boolean(member) || named !== undefined,
      displayName,
      handle,
      initials,
      reference,
      approach,
      joinedAt,
      canEditName: Boolean(ctxSetDisplayName || ctxSetUsername),
      canEditApproach: Boolean(ctxSetApproach),
      setDisplayName,
      setApproach,
      logout: ctxLogout ?? NO_OP,
    }),
    [
      member,
      named,
      displayName,
      handle,
      initials,
      reference,
      approach,
      joinedAt,
      ctxSetDisplayName,
      ctxSetUsername,
      ctxSetApproach,
      setDisplayName,
      setApproach,
      ctxLogout,
    ],
  );
}

/** The first argument that is a non-empty string, or undefined. */
function firstString(...values: (string | null | undefined)[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}
