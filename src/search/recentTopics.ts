import type { TopicEntry } from "./topicCatalog";

export const RECENT_TOPICS_KEY = "ethernet-onboarding:recent-topics:v1";

/** Put a visited topic first, remove any older copy, and retain at most eight paths. */
export function recordRecentTopic(recent: string[][], path: string[]): string[][] {
  if (!path.length) return recent;
  const key = path.join("/");
  return [path, ...recent.filter((item) => item.join("/") !== key)].slice(0, 8);
}

/** Parse local storage defensively, retaining only current catalog paths and unique entries. */
export function parseRecentTopics(raw: string | null, catalog: TopicEntry[]): string[][] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(catalog.map((topic) => topic.path.join("/")));
    const paths = parsed.filter(
      (item): item is string[] =>
        Array.isArray(item) &&
        item.length > 0 &&
        item.every((value) => typeof value === "string") &&
        valid.has(item.join("/")),
    );
    const unique = paths.filter(
      (path, index) => paths.findIndex((item) => item.join("/") === path.join("/")) === index,
    );
    return unique.slice(0, 8);
  } catch {
    return [];
  }
}
