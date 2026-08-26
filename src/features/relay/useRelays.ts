import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { fireRelay } from "@/domain/ledger";
import { useLedger } from "@/hooks/useLedger";
import { money } from "@/components/system/format";
import { dailyReward } from "@/domain/tiers";
import { playTierChord } from "@/lib/sound";

/**
 * Runs due relays.
 *
 * Mounted once in the shell rather than on a route, because a relay must fire
 * wherever the member happens to land, not only if they visit the vault it
 * belongs to.
 *
 * The guard matters more than it looks. `useLedger` re-derives on a timer, and
 * firing writes to the ledger, which emits, which re-derives: without holding
 * the ids already handled, a single due relay would fire on every tick and
 * open a position per second. A fold does restart the day count, so the
 * derivation would settle on its own eventually, but not before writing a
 * batch per frame. The set is deliberately kept in a ref rather than state, so
 * recording a fire never itself triggers a render.
 */

const OFF_KEY = "rgl_relay_auto_off";

/** Members can turn automatic firing off and run them by hand instead. */
export function autoFireEnabled(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setAutoFire(on: boolean) {
  try {
    if (on) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, "1");
  } catch {
    /* the preference simply does not persist */
  }
}

export function useRelays() {
  const snap = useLedger();
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (snap.relaysDue.length === 0 || !autoFireEnabled()) return;

    for (const relay of snap.relaysDue) {
      if (handled.current.has(relay.positionId)) continue;
      const position = snap.positions.find((p) => p.id === relay.positionId);
      if (!position) continue;

      handled.current.add(relay.positionId);
      if (fireRelay(relay, position).length === 0) continue;

      playTierChord(position.tier.id);
      const compounded = relay.mode === "full";
      toast.success(
        compounded ? `${position.tier.name} vault compounded` : "Reward claimed to your balance",
        {
          description: compounded
            ? `${money(relay.carries, 2)} of principal now accruing ${money(dailyReward(relay.carries), 2)} a day.`
            : `${money(relay.carries, 2)} moved. The principal keeps accruing.`,
          duration: 7000,
        },
      );
    }
  }, [snap]);

  return snap;
}
