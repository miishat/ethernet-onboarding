import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TopicExplorer from "../src/components/TopicExplorer";
import { buildTopicCatalog } from "../src/search/topicCatalog";

describe("TopicExplorer", () => {
  it("exposes a labelled native search dialog that is initially closed", () => {
    const html = renderToStaticMarkup(createElement(TopicExplorer, {
      catalog: buildTopicCatalog(), dir: "tx", recent: [], onSelect: () => {},
    }));
    expect(html).toContain("Search Topics");
    expect(html).toContain('aria-label="Search topics"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="topic-explorer"');
    expect(html).toMatch(/<dialog[^>]*id="topic-explorer"[^>]*aria-labelledby="topic-explorer-heading"/);
    expect(html).not.toMatch(/<dialog[^>]*\sopen(?:=|\s|>)/);
  });
});
