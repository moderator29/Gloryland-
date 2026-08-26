/**
 * Relay: a standing instruction that carries a matured term into the next one.
 *
 * The domain lives in `@/domain/ledger` alongside every other event, because a
 * relay is part of the same append only log rather than a store of its own.
 */
export { RelayPanel, RelayDue } from "./Relay";
export type { RelayPanelProps, RelayDueProps } from "./Relay";
export { useRelays, autoFireEnabled, setAutoFire } from "./useRelays";
