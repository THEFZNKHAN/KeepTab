import {
  deriveDomain,
  formatItemsList,
  notePreview,
  parseInputValue,
} from "../shared/format.js";
import type { KeepSettings } from "../shared/keep-settings.js";
import { isLikelyValidKeepNoteId, missingKeepConfigMessage } from "../shared/keep-settings.js";
import { migrateLegacyLeads } from "../shared/migrate.js";
import { sendToBackground } from "../shared/messaging.js";
import type { BoardItem } from "../shared/types.js";

let allItems: BoardItem[] = [];
let keepSettings: KeepSettings = { enabled: false };
let statusTimer: ReturnType<typeof setTimeout> | undefined;
let settingsStatusTimer: ReturnType<typeof setTimeout> | undefined;

const appView = document.getElementById("app-view")!;
const settingsView = document.getElementById("settings-view")!;
const listEl = document.getElementById("list")!;
const emptyEl = document.getElementById("empty")!;
const countEl = document.getElementById("count")!;
const statusEl = document.getElementById("status")!;
const statusTextEl = document.getElementById("status-text")!;
const saveInputEl = document.getElementById("save-input") as HTMLInputElement;
const keepEnabledEl = document.getElementById("keep-enabled") as HTMLInputElement;
const keepNoteUrlEl = document.getElementById("keep-note-url") as HTMLInputElement;
const keepNoteStatusEl = document.getElementById("keep-note-status")!;
const settingsStatusEl = document.getElementById("settings-status")!;
const settingsStatusTextEl = document.getElementById("settings-status-text")!;
const settingsStatusIconEl = document.getElementById("settings-status-icon")!;
const confirmDialogEl = document.getElementById("confirm-dialog")!;
const confirmTitleEl = document.getElementById("confirm-title")!;
const confirmMessageEl = document.getElementById("confirm-message")!;
const confirmOkEl = document.getElementById("confirm-ok") as HTMLButtonElement;
const confirmCancelEl = document.getElementById("confirm-cancel") as HTMLButtonElement;

let confirmResolve: ((value: boolean) => void) | undefined;

function itemSubtitle(item: BoardItem): string {
  if (item.type === "note") return notePreview(item);
  return deriveDomain(item.url) || item.url || "";
}

function showStatus(message: string, isError = false, durationMs = 2500): void {
  if (statusTimer) clearTimeout(statusTimer);
  statusTextEl.textContent = message;
  statusEl.hidden = false;
  statusEl.classList.toggle("error", isError);
  statusTimer = setTimeout(() => {
    statusEl.hidden = true;
  }, durationMs);
}

function closeConfirmDialog(result: boolean): void {
  confirmDialogEl.hidden = true;
  confirmResolve?.(result);
  confirmResolve = undefined;
}

function showConfirm(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (confirmResolve) {
    closeConfirmDialog(false);
  }

  confirmTitleEl.textContent = options.title;
  confirmMessageEl.textContent = options.message;
  confirmOkEl.textContent = options.confirmLabel ?? "Confirm";
  confirmCancelEl.textContent = options.cancelLabel ?? "Cancel";

  confirmDialogEl.hidden = false;
  confirmCancelEl.focus();

  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function showSettingsStatus(
  message: string,
  isError = false,
  durationMs = 3500
): void {
  if (settingsStatusTimer) clearTimeout(settingsStatusTimer);
  settingsStatusTextEl.textContent = message;
  settingsStatusIconEl.textContent = isError ? "error" : "check_circle";
  settingsStatusEl.hidden = false;
  settingsStatusEl.classList.toggle("error", isError);
  settingsStatusTimer = setTimeout(() => {
    settingsStatusEl.hidden = true;
  }, durationMs);
}

function openSettings(): void {
  settingsStatusEl.hidden = true;
  if (settingsStatusTimer) clearTimeout(settingsStatusTimer);
  appView.hidden = true;
  settingsView.hidden = false;
}

function closeSettings(): void {
  settingsView.hidden = true;
  appView.hidden = false;
}

function render(): void {
  const items = allItems;
  const total = allItems.length;
  countEl.textContent = `${total} saved`;
  listEl.replaceChildren();

  const showGlobalEmpty = total === 0;

  emptyEl.hidden = !showGlobalEmpty;
  listEl.hidden = items.length === 0;

  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.dataset.id = item.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.id = item.id;

    const body = document.createElement("div");
    body.className = "item-body";

    const title = document.createElement(item.url ? "a" : "p");
    title.className = item.url ? "item-title item-title-link" : "item-title";
    title.textContent = item.title;
    if (item.url && title instanceof HTMLAnchorElement) {
      title.href = item.url;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }

    body.append(title);

    const subtitleText = itemSubtitle(item);
    if (subtitleText && subtitleText !== item.title) {
      const subtitle = document.createElement("p");
      subtitle.className = "item-subtitle";
      subtitle.textContent = subtitleText;
      body.append(subtitle);
    }

    const hoverCard = document.createElement("div");
    hoverCard.className = "item-hover-card";

    const hoverTitle = document.createElement("p");
    hoverTitle.className = "item-hover-title";
    hoverTitle.textContent = item.title;
    hoverCard.append(hoverTitle);

    if (item.url) {
      const hoverUrl = document.createElement("p");
      hoverUrl.className = "item-hover-url";
      hoverUrl.textContent = item.url;
      hoverCard.append(hoverUrl);
    } else if (item.body) {
      hoverTitle.textContent = item.body;
    }

    li.append(checkbox, body, hoverCard);
    listEl.append(li);
  }
}

async function loadItems(): Promise<void> {
  try {
    const response = await sendToBackground({ action: "getAll" });
    if (response?.ok && "items" in response) {
      allItems = response.items;
    }
  } catch (err) {
    showStatus(
      err instanceof Error ? err.message : "Could not load saved items.",
      true
    );
  }
  render();
}

function renderKeepStatus(): void {
  keepEnabledEl.checked = keepSettings.enabled;
  keepNoteUrlEl.value = keepSettings.noteUrl ?? "";

  keepNoteStatusEl.textContent = isLikelyValidKeepNoteId(keepSettings.noteId)
    ? "Linked"
    : keepSettings.noteUrl
      ? "URL looks incomplete. Paste the full Keep link."
      : "Not linked";
  keepNoteStatusEl.classList.toggle(
    "linked",
    isLikelyValidKeepNoteId(keepSettings.noteId)
  );
}

async function loadKeepSettings(): Promise<void> {
  try {
    const response = await sendToBackground({ action: "getKeepSettings" });
    if (response?.ok && "settings" in response) {
      keepSettings = response.settings;
      renderKeepStatus();
    }

    const last = await sendToBackground({ action: "getLastKeepResult" });
    if (last?.ok && "lastKeepResult" in last && last.lastKeepResult) {
      const age = Date.now() - last.lastKeepResult.at;
      if (age < 5 * 60 * 1000) {
        showStatus(last.lastKeepResult.message, last.lastKeepResult.isError, 8000);
      }
    }
  } catch (err) {
    showStatus(
      err instanceof Error ? err.message : "Could not load Keep settings.",
      true
    );
  }
}

async function persistKeepSettings(): Promise<boolean> {
  try {
    const response = await sendToBackground({
      action: "setKeepSettings",
      settings: {
        enabled: keepEnabledEl.checked,
        noteUrl: keepNoteUrlEl.value,
      },
    });
    if (response?.ok && "settings" in response) {
      keepSettings = response.settings;
      renderKeepStatus();
      return true;
    }
    showSettingsStatus(response?.error ?? "Could not save Keep settings.", true);
    return false;
  } catch (err) {
    showSettingsStatus(
      err instanceof Error ? err.message : "Could not save Keep settings.",
      true
    );
    return false;
  }
}

async function saveKeepSettings(): Promise<void> {
  const saved = await persistKeepSettings();
  if (!saved) return;

  closeSettings();
  showStatus("Keep settings saved.");
}

async function testKeep(): Promise<void> {
  const saved = await persistKeepSettings();
  if (!saved) return;

  if (!isLikelyValidKeepNoteId(keepSettings.noteId)) {
    showSettingsStatus(
      "Paste the full Keep list URL from your browser (the long #LIST/… link).",
      true,
      8000
    );
    return;
  }

  showSettingsStatus("Adding test line to Keep…", false, 8000);
  try {
    const response = await sendToBackground({ action: "testKeepAppend" });
    if (!response?.ok || !("keep" in response)) {
      showSettingsStatus(response?.error ?? "Keep test failed.", true, 8000);
      return;
    }

    const keep = response.keep;
    if (keep.status === "missing_config") {
      showSettingsStatus(keep.error ?? missingKeepConfigMessage(), true, 8000);
      return;
    }
    if (keep.status === "synced") {
      showSettingsStatus("Test line added to Keep.", false, 8000);
      return;
    }
    if (keep.status === "duplicate") {
      showSettingsStatus("Test line already exists in Keep.", false, 8000);
      return;
    }
    showSettingsStatus(keep.error ?? "Keep test failed.", true, 8000);
  } catch (err) {
    showSettingsStatus(err instanceof Error ? err.message : "Keep test failed.", true, 8000);
  }
}

function getSelectedIds(): string[] {
  return Array.from(
    listEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
  ).map((el) => el.dataset.id!);
}

async function copyToClipboard(items: BoardItem[]): Promise<void> {
  if (items.length === 0) {
    showStatus("Nothing to copy.", true);
    return;
  }
  await navigator.clipboard.writeText(formatItemsList(items));
  showStatus(`Copied ${items.length} item${items.length === 1 ? "" : "s"}.`);
}

async function saveFromInput(): Promise<void> {
  const item = parseInputValue(saveInputEl.value);
  if (!item) {
    showStatus("Enter a link or note first.", true);
    return;
  }

  try {
    const response = await sendToBackground({ action: "save", item });
    if (!response?.ok) {
      showStatus(response?.error ?? "Save failed.", true);
      return;
    }

    saveInputEl.value = "";
    await loadItems();

    if (response.duplicate) {
      showStatus("Already on your board.");
      return;
    }

    showStatus("Saved.");
  } catch (err) {
    showStatus(err instanceof Error ? err.message : "Save failed.", true);
  }
}

async function saveCurrentTab(): Promise<void> {
  try {
    const response = await sendToBackground({ action: "saveTab" });
    if (!response?.ok) {
      showStatus(response?.error ?? "Could not save tab.", true);
      return;
    }

    await loadItems();

    if (response.duplicate) {
      showStatus("Tab already on your board.");
      return;
    }

    showStatus("Tab saved.");
  } catch (err) {
    showStatus(err instanceof Error ? err.message : "Could not save tab.", true);
  }
}

document.getElementById("save-input-btn")!.addEventListener("click", () => {
  void saveFromInput();
});

saveInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void saveFromInput();
  }
});

document.getElementById("save-tab-btn")!.addEventListener("click", () => {
  void saveCurrentTab();
});

document.getElementById("copy-all")!.addEventListener("click", () => {
  void copyToClipboard(allItems);
});

document.getElementById("copy-selected")!.addEventListener("click", () => {
  const ids = new Set(getSelectedIds());
  const selected = allItems.filter((i) => ids.has(i.id));
  void copyToClipboard(selected);
});

document.getElementById("delete-selected")!.addEventListener("click", async () => {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    showStatus("Select items to delete.", true);
    return;
  }
  try {
    const response = await sendToBackground({ action: "delete", ids });
    if (response?.ok && "items" in response) {
      allItems = response.items;
      render();
      showStatus(`Deleted ${ids.length} item${ids.length === 1 ? "" : "s"}.`);
    }
  } catch (err) {
    showStatus(err instanceof Error ? err.message : "Delete failed.", true);
  }
});

document.getElementById("clear-all")!.addEventListener("click", async () => {
  const confirmed = await showConfirm({
    title: "Clear all saved items?",
    message:
      "This removes every item from KeepTab. Your Google Keep note is not affected.",
    confirmLabel: "Clear all",
    cancelLabel: "Cancel",
  });
  if (!confirmed) return;

  try {
    const response = await sendToBackground({ action: "clear" });
    if (response?.ok) {
      allItems = [];
      render();
      showStatus("Cleared all items.");
    }
  } catch (err) {
    showStatus(err instanceof Error ? err.message : "Clear failed.", true);
  }
});

confirmOkEl.addEventListener("click", () => closeConfirmDialog(true));
confirmCancelEl.addEventListener("click", () => closeConfirmDialog(false));
confirmDialogEl.querySelectorAll("[data-confirm-dismiss]").forEach((el) => {
  el.addEventListener("click", () => closeConfirmDialog(false));
});

document.addEventListener("keydown", (event) => {
  if (confirmDialogEl.hidden) return;
  if (event.key === "Escape") {
    closeConfirmDialog(false);
  }
});

document.getElementById("open-settings")!.addEventListener("click", openSettings);
document.getElementById("close-settings")!.addEventListener("click", closeSettings);

document.getElementById("status-close")!.addEventListener("click", () => {
  statusEl.hidden = true;
  if (statusTimer) clearTimeout(statusTimer);
});

document.getElementById("keep-save-settings")!.addEventListener("click", () => {
  void saveKeepSettings();
});

document.getElementById("keep-test")!.addEventListener("click", () => {
  void testKeep();
});

async function init(): Promise<void> {
  try {
    const imported = await migrateLegacyLeads();
    if (imported > 0) {
      showStatus(`Imported ${imported} item${imported === 1 ? "" : "s"} from a previous version.`, false, 4000);
    }
  } catch {
    /* migration is best-effort */
  }

  await loadItems();
  await loadKeepSettings();
}

void init();
