import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  APPROACHES,
  approachById,
  claimUsername,
  initials as deriveInitials,
  memberRef,
  releaseUsername,
  type ApproachId,
  type Member,
} from "@/domain/identity";

/**
 * The signed in member.
 *
 * A member is a handle, a display name and a stated approach. The handle is the
 * identity and never changes; the display name and the approach are theirs to
 * edit at any time. Nothing here is an account: there is no password, no
 * server and no recovery, and the Gate says so rather than implying otherwise.
 *
 * `username` is kept on the context as the display name for backwards
 * compatibility with the surfaces written before members had two names. New
 * code should read `member` and use `member.displayName` or `member.username`
 * explicitly, because "username" now means the handle everywhere else.
 */

type Ctx = {
  member: Member | null;
  /** The display name, or null when signed out. Legacy alias. */
  username: string | null;
  /** Sign in, or replace the whole record. */
  setMember: (m: Member | null) => void;
  /** Change what the member is called on screen. The handle is untouched. */
  setDisplayName: (name: string) => void;
  setApproach: (id: ApproachId) => void;
  /** Legacy: sets the display name of the current member, or creates one. */
  setUsername: (name: string | null) => void;
  logout: () => void;
  /** Two letters for an avatar, never empty while signed in. */
  initials: string;
  /** Short quotable reference, derived from the handle. */
  ref: string;
};

const MEMBER_KEY = "rgl_member_v2";
/** The single field the first build stored. Read once, then upgraded. */
const LEGACY_KEY = "rgl_member_v1";

const UserContext = createContext<Ctx | null>(null);

function isMember(v: unknown): v is Member {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.username === "string" &&
    m.username.length > 0 &&
    typeof m.displayName === "string" &&
    m.displayName.length > 0 &&
    typeof m.joinedAt === "number" &&
    Number.isFinite(m.joinedAt)
  );
}

/**
 * Read the stored member, upgrading a first build record on the way through.
 *
 * Someone who signed in before handles existed has a bare name and nothing
 * else. Rather than sending them back to the Gate, their name becomes the
 * display name and a handle is derived from it.
 */
function load(): Member | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isMember(parsed)) {
        return { ...parsed, approach: approachById(parsed.approach).id };
      }
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && legacy.trim()) {
      const displayName = legacy.trim();
      const username =
        displayName
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 20) || "member";
      return { username, displayName, approach: "watching", joinedAt: Date.now() };
    }
  } catch {
    /* absent, blocked or corrupt storage all mean signed out */
  }
  return null;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [member, setMemberState] = useState<Member | null>(load);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (member) {
        localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
        localStorage.removeItem(LEGACY_KEY);
        claimUsername(member.username);
      } else {
        localStorage.removeItem(MEMBER_KEY);
      }
    } catch {
      /* a blocked store costs persistence, never the session */
    }
  }, [member]);

  const setDisplayName = useCallback((name: string) => {
    setMemberState((m) => (m ? { ...m, displayName: name } : m));
  }, []);

  const setApproach = useCallback((id: ApproachId) => {
    setMemberState((m) => (m ? { ...m, approach: id } : m));
  }, []);

  // The old single argument entry point. Signing in through it produces a
  // handle derived from the name, so nothing that still calls it breaks.
  const setUsername = useCallback((name: string | null) => {
    if (name === null) {
      setMemberState(null);
      return;
    }
    setMemberState((m) => {
      if (m) return { ...m, displayName: name };
      const username =
        name
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 20) || "member";
      return { username, displayName: name, approach: "watching", joinedAt: Date.now() };
    });
  }, []);

  const logout = useCallback(() => {
    setMemberState((m) => {
      // Release the handle so the same person can sign back in with it.
      if (m) releaseUsername(m.username);
      return null;
    });
    try {
      localStorage.removeItem("rgl_welcome_v1");
      sessionStorage.removeItem("rgl_orientation_dismissed");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        member,
        username: member?.displayName ?? null,
        setMember: setMemberState,
        setDisplayName,
        setApproach,
        setUsername,
        logout,
        initials: member ? deriveInitials(member.displayName, member.username) : "",
        ref: member ? memberRef(member.username) : "",
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}

/** The member's chosen approach, resolved to the full record. */
export function useApproach() {
  const { member } = useUser();
  return approachById(member?.approach);
}

export { APPROACHES };
