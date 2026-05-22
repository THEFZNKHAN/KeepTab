import type { BoardItem } from "./types.js";

const STORAGE_KEY = "keeptab_items";
const LEGACY_STORAGE_KEY = "tempboard_items";

let storageMigrated = false;

async function migrateStorageKey(): Promise<void> {
  if (storageMigrated) return;
  storageMigrated = true;

  const result = await chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  if (!result[STORAGE_KEY] && result[LEGACY_STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: result[LEGACY_STORAGE_KEY] });
    await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
  }
}

export function dedupeKey(
  item: Pick<BoardItem, "type" | "url" | "body" | "title">
): string {
  if (item.type === "note") {
    const body = (item.body ?? item.title ?? "").trim().toLowerCase();
    return `note|${body}`;
  }

  const url = normalizeUrl(item.url ?? "");
  return `${item.type}|${url}`;
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function getAllItems(): Promise<BoardItem[]> {
  await migrateStorageKey();
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const items = result[STORAGE_KEY] as BoardItem[] | undefined;
  return Array.isArray(items) ? items : [];
}

export async function saveItem(
  partial: Omit<BoardItem, "id" | "savedAt">
): Promise<{ item: BoardItem; duplicate: boolean }> {
  const items = await getAllItems();
  const key = dedupeKey(partial);
  const existing = items.find((i) => dedupeKey(i) === key);
  if (existing) {
    return { item: existing, duplicate: true };
  }

  const item: BoardItem = {
    ...partial,
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  };
  items.unshift(item);
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  await updateBadge(items.length);
  return { item, duplicate: false };
}

export async function deleteItems(ids: string[]): Promise<BoardItem[]> {
  const idSet = new Set(ids);
  const items = (await getAllItems()).filter((i) => !idSet.has(i.id));
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  await updateBadge(items.length);
  return items;
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  await updateBadge(0);
}

async function updateBadge(count: number): Promise<void> {
  const text = count > 0 ? String(count) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
}

export async function initBadge(): Promise<void> {
  const items = await getAllItems();
  await updateBadge(items.length);
}
