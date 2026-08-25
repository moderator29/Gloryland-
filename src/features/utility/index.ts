/**
 * Utility: the small pieces that sit around the product rather than inside it.
 *
 * None of them own a surface. Wayfinder explains, InstallPrompt offers, the
 * rail measures and Arrange lets the member set their own order. Each is
 * mounted by the shell and each disappears when it has nothing to say.
 */

export { Wayfinder } from "./Wayfinder";
export type { WayfinderProps } from "./Wayfinder";
export { InstallPrompt, INSTALL_DISMISSED_KEY } from "./InstallPrompt";
export type { InstallPromptProps } from "./InstallPrompt";
export { ScrollRail } from "./ScrollRail";
export type { ScrollRailProps } from "./ScrollRail";
export { Arrange, ARRANGE_KEY } from "./Arrange";
export type { ArrangeProps, ArrangeItem } from "./Arrange";
