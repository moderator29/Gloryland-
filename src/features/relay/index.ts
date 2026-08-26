/**
 * Relay: a standing instruction that folds a position's reward into its
 * principal, or claims it out to the balance.
 *
 * The domain lives in `@/domain/ledger` alongside every other event, because a
 * relay is part of the same append only log rather than a store of its own.
 */
export { RelayPanel, RelayDue } from "./Relay";
export type { RelayPanelProps, RelayDueProps } from "./Relay";
export { useRelays, autoFireEnabled, setAutoFire } from "./useRelays";
