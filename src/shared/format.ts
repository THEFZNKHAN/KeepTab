import type { BoardItem } from "./types.js";

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function deriveTitle(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url.trim();
  }
}

export function deriveDomain(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatItemLine(item: BoardItem): string {
  if (item.url) {
    return `${item.title} | ${item.url}`;
  }

  return (item.body ?? item.title).trim();
}

export function formatItemsList(items: BoardItem[]): string {
  return items.map(formatItemLine).join("\n");
}

export function notePreview(item: BoardItem, maxLen = 80): string {
  const text = (item.body ?? item.title).trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function parseInputValue(value: string): Omit<
  BoardItem,
  "id" | "savedAt"
> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isValidUrl(trimmed)) {
    return {
      type: "link",
      title: deriveTitle(trimmed),
      url: trimmed,
    };
  }

  const title =
    trimmed.length > 48 ? `${trimmed.slice(0, 47).trim()}…` : trimmed;

  return {
    type: "note",
    title,
    body: trimmed,
  };
}
