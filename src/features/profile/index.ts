/**
 * The account centre: the pieces Profile, Security and the Settings screens
 * share.
 *
 * Nothing in here holds a figure of its own. The avatar and the reference are
 * derived from the member's handle, the statistics band renders what the caller
 * computed from the ledger snapshot, and the file module can only write events
 * the ledger itself could have produced. What the directory exists for is to
 * stop four surfaces each growing their own version of the same row.
 */

export { MemberAvatar, type MemberAvatarProps } from "./MemberAvatar";
export { SectionRow, type SectionRowProps } from "./SectionRow";
export { StatBand, type Stat } from "./StatBand";
export { ConfirmErase, type ConfirmEraseProps } from "./ConfirmErase";
export { Switch, type SwitchProps } from "./Switch";
export { avatarPaint, memberSince, type AvatarPaint, type MemberSince } from "./identity";
export { formatBytes, measureStorage, type StorageReading, type StoredKey } from "./storage";
export { useMemberIdentity, type MemberIdentity } from "./useMemberIdentity";
export {
  DISPLAY_DEFAULTS,
  applyDisplayPrefs,
  applyStoredDisplayPrefs,
  readDisplayPrefs,
  useDisplayPrefs,
  type Density,
  type DisplayPrefs,
  type Transparency,
} from "./display";
export {
  NOTIFY_CATEGORIES,
  NOTIFY_DEFAULTS,
  NOTIFY_KEY,
  notifyOnCount,
  readNotifyPrefs,
  writeNotifyPrefs,
  type NotifyCategoryId,
  type NotifyChannel,
  type NotifyDigest,
  type NotifyPrefs,
} from "./notify";
export {
  LEDGER_FILE_VERSION,
  applyLedgerFile,
  buildLedgerFile,
  downloadFile,
  fileStamp,
  inspectLedgerFile,
  toCsv,
  type ImportMode,
  type InspectResult,
  type LedgerFile,
} from "./ledgerFile";
