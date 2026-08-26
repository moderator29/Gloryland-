/**
 * Atlas: one index over the whole product, reachable two ways.
 *
 * `Palette` is the launcher, summoned with Cmd/Ctrl+K or "/" from anywhere and
 * dismissed the moment it has answered. The route at /app/atlas is the same
 * index as a place, for browsing rather than jumping. Both render `AtlasResults`
 * over `searchCatalog`, so what ranks first in one ranks first in the other.
 */

export { Palette } from "./Palette";
export type { PaletteProps } from "./Palette";
export { AtlasResults, AtlasIcon } from "./Results";
export type { AtlasResultsProps } from "./Results";
export { useAtlas, atlasOptionId } from "./useAtlas";
export type { AtlasController, AtlasOptions } from "./useAtlas";
export {
  ATLAS_LIMIT,
  KIND_CHIP,
  KIND_LABEL,
  buildCatalog,
  flattenGroups,
  fold,
  foldRange,
  queryTokens,
  searchCatalog,
  surfaceDirectory,
} from "./catalog";
export type { AtlasArea, AtlasEntry, AtlasGroup, AtlasKind } from "./catalog";
