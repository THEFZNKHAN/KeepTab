import type { KeepSyncResult } from "../shared/keep-settings.js";
import { missingKeepConfigMessage } from "../shared/keep-settings.js";
import { showToast } from "./ui.js";

export async function handleKeepSyncResult(
  keep: KeepSyncResult | undefined
): Promise<void> {
  if (!keep || keep.status === "disabled" || keep.status === "duplicate") {
    return;
  }

  if (keep.status === "missing_config") {
    showToast({
      title: keep.error ?? missingKeepConfigMessage(),
      variant: "info",
    });
    return;
  }

  if (keep.status === "synced") {
    showToast({
      title: "Added to Keep",
      subtitle: "Synced to Google Keep",
      variant: "success",
    });
    return;
  }

  if (keep.status === "failed" && keep.text) {
    try {
      await navigator.clipboard.writeText(keep.text);
      showToast({
        title: keep.error ? `Keep: ${keep.error}` : "Could not add to Keep.",
        subtitle: "Line copied. Paste it manually.",
        variant: "info",
        durationMs: 6000,
      });
    } catch {
      showToast({
        title: keep.error ?? "Could not add to Keep.",
        variant: "error",
      });
    }

    if (keep.noteUrl) {
      window.open(keep.noteUrl, "_blank", "noopener");
    }
  }
}

export function showSavedToast(
  title: string,
  duplicate: boolean,
  typeLabel: string
): void {
  if (duplicate) {
    showToast({
      title: `Already saved: ${title}`,
      subtitle: typeLabel,
      variant: "info",
    });
    return;
  }

  showToast({
    title: `Saved: ${title}`,
    subtitle: typeLabel,
    variant: "success",
  });
}
