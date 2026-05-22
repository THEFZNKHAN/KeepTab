import { isValidUrl, deriveTitle } from "./format.js";
import { saveItem } from "./storage.js";
import { sendToBackground } from "./messaging.js";

const LEGACY_KEY = "myLeads";
const MIGRATED_KEY = "keeptab_legacy_migrated";
const LEGACY_MIGRATED_KEY = "tempboard_legacy_migrated";

function isLegacyMigrated(): boolean {
  return Boolean(
    localStorage.getItem(MIGRATED_KEY) || localStorage.getItem(LEGACY_MIGRATED_KEY)
  );
}

function markLegacyMigrated(): void {
  localStorage.setItem(MIGRATED_KEY, "1");
  localStorage.removeItem(LEGACY_MIGRATED_KEY);
}

export async function migrateLegacyLeads(): Promise<number> {
  if (isLegacyMigrated()) {
    return 0;
  }

  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    markLegacyMigrated();
    return 0;
  }

  let imported = 0;

  try {
    const strings = JSON.parse(raw) as unknown;
    if (Array.isArray(strings)) {
      for (const entry of strings) {
        if (typeof entry !== "string" || !entry.trim()) continue;
        const trimmed = entry.trim();
        const item = isValidUrl(trimmed)
          ? { type: "link" as const, title: deriveTitle(trimmed), url: trimmed }
          : {
              type: "note" as const,
              title: "Imported note",
              body: trimmed,
            };

        const response = await sendToBackground({ action: "save", item });
        if (response?.ok) imported += 1;
      }
    }
  } catch {
    /* ignore corrupt legacy data */
  }

  localStorage.removeItem(LEGACY_KEY);
  markLegacyMigrated();
  return imported;
}

/** For tests: direct storage migration without messaging. */
export async function migrateLegacyStrings(strings: string[]): Promise<number> {
  let imported = 0;
  for (const entry of strings) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    const trimmed = entry.trim();
    const item = isValidUrl(trimmed)
      ? { type: "link" as const, title: deriveTitle(trimmed), url: trimmed }
      : { type: "note" as const, title: "Imported note", body: trimmed };
    const { duplicate } = await saveItem(item);
    if (!duplicate) imported += 1;
  }
  return imported;
}
