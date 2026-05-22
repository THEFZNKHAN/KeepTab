export interface CapturedTab {
  title: string;
  url: string;
  faviconUrl?: string;
}

export async function captureActiveTab(): Promise<CapturedTab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    throw new Error("No active tab found.");
  }

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    throw new Error("Cannot save this page. Open a regular website first.");
  }

  return {
    title: tab.title?.trim() || "Untitled tab",
    url: tab.url,
    faviconUrl: tab.favIconUrl,
  };
}

export function tabToBoardItem(
  tab: CapturedTab
): Omit<import("./types.js").BoardItem, "id" | "savedAt"> {
  return {
    type: "tab",
    title: tab.title,
    url: tab.url,
    faviconUrl: tab.faviconUrl,
    sourceUrl: tab.url,
  };
}

export function pageToBoardItem(): Omit<
  import("./types.js").BoardItem,
  "id" | "savedAt"
> {
  return {
    type: "tab",
    title: document.title.trim() || "Untitled page",
    url: location.href,
    sourceUrl: location.href,
  };
}
