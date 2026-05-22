import { pageToBoardItem } from "../shared/tab-capture.js";
import { sendToBackground } from "../shared/messaging.js";
import { handleKeepSyncResult, showSavedToast } from "./keep-feedback.js";
import { showSaveButton, showToast } from "./ui.js";

function isSaveablePage(): boolean {
  const protocol = location.protocol;
  if (protocol !== "http:" && protocol !== "https:") return false;
  if (location.hostname.endsWith("keep.google.com")) return false;
  return true;
}

async function handleSave(): Promise<void> {
  const item = pageToBoardItem();

  try {
    const response = await sendToBackground({ action: "save", item });
    if (!response?.ok) {
      showToast({
        title: response?.error ?? "Could not save page.",
        variant: "error",
      });
      return;
    }

    showSavedToast(item.title, Boolean(response.duplicate), "Tab");
    await handleKeepSyncResult(response.keep);
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : "Could not save page.",
      variant: "error",
    });
  }
}

function init(): void {
  if (!isSaveablePage()) return;
  showSaveButton(() => {
    void handleSave();
  });
}

init();
