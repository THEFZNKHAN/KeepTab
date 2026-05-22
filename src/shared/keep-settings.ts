export type KeepSyncStatus =
  | "disabled"
  | "missing_config"
  | "synced"
  | "duplicate"
  | "failed";

export interface KeepSyncResult {
  status: KeepSyncStatus;
  text?: string;
  noteUrl?: string;
  error?: string;
}

export interface KeepSettings {
  enabled: boolean;
  noteId?: string;
  noteUrl?: string;
}

const STORAGE_KEY = "keeptab_keep_settings";
const LEGACY_STORAGE_KEY = "tempboard_keep_settings";

let settingsMigrated = false;

async function migrateSettingsKey(): Promise<void> {
  if (settingsMigrated) return;
  settingsMigrated = true;

  const result = await chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  if (!result[STORAGE_KEY] && result[LEGACY_STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: result[LEGACY_STORAGE_KEY] });
    await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
  }
}

const DEFAULT_SETTINGS: KeepSettings = {
  enabled: false,
};

export function parseKeepNoteId(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const match =
    trimmed.match(/#(?:NOTE|LIST)\/([^/?#\s]+)/i) ??
    trimmed.match(/\/(?:NOTE|LIST)\/([^/?#\s]+)/i);
  return match?.[1];
}

export function normalizeKeepSettings(
  input: Partial<KeepSettings>
): KeepSettings {
  const noteUrl = input.noteUrl?.trim() || undefined;

  return {
    enabled: Boolean(input.enabled),
    noteUrl,
    noteId: noteUrl ? parseKeepNoteId(noteUrl) ?? input.noteId : undefined,
  };
}

export function isLikelyValidKeepNoteId(noteId: string | undefined): boolean {
  return Boolean(noteId && noteId.length >= 40);
}

export function getKeepNoteTarget(
  settings: KeepSettings
): { noteId: string; noteUrl: string } | null {
  if (!settings.noteId || !settings.noteUrl) return null;
  return { noteId: settings.noteId, noteUrl: settings.noteUrl };
}

export function missingKeepConfigMessage(): string {
  return "Link your Keep note in Settings.";
}

export async function getKeepSettings(): Promise<KeepSettings> {
  await migrateSettingsKey();
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as Partial<KeepSettings> | undefined;
  return normalizeKeepSettings({ ...DEFAULT_SETTINGS, ...raw });
}

export async function setKeepSettings(
  settings: Partial<KeepSettings>
): Promise<KeepSettings> {
  const current = await getKeepSettings();
  const next = normalizeKeepSettings({ ...current, ...settings });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}
