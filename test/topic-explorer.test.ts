import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TopicExplorer from "../src/components/TopicExplorer";
import { buildTopicCatalog } from "../src/search/topicCatalog";

describe("TopicExplorer", () => {
  it("exposes an accessible, initially collapsed search disclosure", () => {
    const html = renderToStaticMarkup(createElement(TopicExplorer, {
      catalog: buildTopicCatalog(), dir: "tx", recent: [], onSelect: () => {},
    }));
    expect(html).toContain("Search topics");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="topic-explorer"');
    expect(html).not.toContain('role="dialog"');
  });
});
