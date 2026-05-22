import type { KeepSettings, KeepSyncResult } from "./keep-settings.js";

export type BoardItemType = "tab" | "link" | "note";

export interface BoardItem {
  id: string;
  type: BoardItemType;
  title: string;
  url?: string;
  body?: string;
  faviconUrl?: string;
  savedAt: number;
  sourceUrl?: string;
}

export type MessageAction =
  | { action: "save"; item: Omit<BoardItem, "id" | "savedAt"> }
  | { action: "saveTab" }
  | { action: "getAll" }
  | { action: "delete"; ids: string[] }
  | { action: "clear" }
  | { action: "getKeepSettings" }
  | { action: "setKeepSettings"; settings: Partial<KeepSettings> }
  | { action: "testKeepAppend" }
  | { action: "getLastKeepResult" };

export type MessageResponse =
  | { ok: true; duplicate?: boolean; item?: BoardItem; keep?: KeepSyncResult }
  | { ok: true; items: BoardItem[] }
  | { ok: true; settings: KeepSettings }
  | { ok: true; keep: KeepSyncResult }
  | {
      ok: true;
      lastKeepResult: { message: string; isError: boolean; at: number } | null;
    }
  | { ok: false; error: string };
