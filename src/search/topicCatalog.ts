import { DATA } from "../data/stack";
import { rawKids } from "../data/tree";
import type { Dir, StackNode } from "../types";

export interface TopicEntry {
  id: string;
  name: string;
  alias: string;
  summary: string;
  path: string[];
  breadcrumb: string;
  layer: string;
  layerName: string;
  written: boolean;
  directions: Dir[];
  nameText: string;
  searchText: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Index every learning location, including topics whose content is not written yet. */
export function buildTopicCatalog(data: Record<string, StackNode> = DATA): TopicEntry[] {
  const catalog: TopicEntry[] = [];

  function walk(node: StackNode, path: string[], names: string[], directions: Dir[], layer: string, layerName: string) {
    const nodeNames = [...names, node.name];
    const nodeDirections = [...directions, node.dir || "both"];
    catalog.push({
      id: node.id,
      name: node.name,
      alias: node.alias || "",
      summary: node.summary || "",
      path,
      breadcrumb: nodeNames.join(" / "),
      layer,
      layerName,
      written: node.written !== false,
      directions: nodeDirections,
      nameText: normalize(node.name),
      searchText: normalize([
        node.name, node.alias, node.summary, node.intro, node.body,
        ...Object.values(node.clause || {}),
        ...Object.entries(node.terms || {}).flat(),
      ].filter((value): value is string => typeof value === "string").join(" ")),
    });
    for (const child of rawKids(node)) {
      walk(child, [...path, child.id], nodeNames, nodeDirections, layer, layerName);
    }
  }

  for (const [layer, root] of Object.entries(data)) {
    walk(root, [layer], [], [], layer, root.name);
  }
  return catalog;
}

/** A topic is visible only when every ancestor permits the selected direction. */
export function visibleTopics(catalog: readonly TopicEntry[], dir: Dir): TopicEntry[] {
  return catalog.filter((entry) => entry.directions.every((constraint) => constraint === "both" || constraint === dir));
}

/** Require every query token, then prefer topic labels over incidental content mentions. */
export function searchTopics(catalog: readonly TopicEntry[], query: string, dir: Dir): TopicEntry[] {
  const text = normalize(query);
  const visible = visibleTopics(catalog, dir);
  if (!text) return visible;
  const tokens = text.split(" ");

  function rank(entry: TopicEntry): number {
    if (entry.nameText === text) return 0;
    if (entry.nameText.startsWith(text)) return 1;
    if (normalize(entry.alias).includes(text)) return 2;
    if (entry.nameText.includes(text)) return 3;
    return 4;
  }

  return visible
    .filter((entry) => tokens.every((token) => entry.searchText.includes(token)))
    .sort((a, b) => rank(a) - rank(b) || (a.breadcrumb < b.breadcrumb ? -1 : a.breadcrumb > b.breadcrumb ? 1 : 0));
}
