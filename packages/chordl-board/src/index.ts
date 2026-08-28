export { ChordBoard, useChordBoard, newId } from "./ChordBoard.js";
export type { ChordBoardProps } from "./ChordBoard.js";
export type {
  BoardDisplayMode,
  BoardItem,
  BoardItemKind,
  BoardMeta,
  BoardState,
  StorageAdapter,
} from "./types.js";
export { BOARD_DISPLAY_MODES, BOARD_ICON_PREFIXES, BOARD_ITEM_KINDS, isTextCard } from "./types.js";
export { localStorageAdapter, memoryStorageAdapter } from "./storage.js";
export type { LocalStorageAdapterOptions } from "./storage.js";
export { exportBoardJson, importBoardJson, computeCacheKey } from "./io.js";
export type { BoardJsonV1, BoardItemJsonV1, BoardSchema } from "./io.js";
export { BOARD_SCHEMA, READABLE_BOARD_SCHEMAS } from "./io.js";
export {
  fileToCardImage,
  imageBytesUsed,
  ImageTooLargeError,
  IMAGE_BUDGET_CHARS,
  MAX_UPLOAD_BYTES,
} from "./image.js";
export type { DownscaleOptions, DecodedImage, ImageDecoder } from "./image.js";
// BOARD_ICON_PREFIXES is exported above from ./types, which owns the list.
export { BoardIcon, BOARD_ICONS, isBoardIconId } from "./icons.js";
export type { BoardIconId, BoardIconDef, BoardIconProps } from "./icons.js";
