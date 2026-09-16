import { expect, it } from "vitest";
import { buildTopicCatalog } from "../src/search/topicCatalog";
import { parseRecentTopics, recordRecentTopic } from "../src/search/recentTopics";

it("ignores corrupt or stale storage", () => {
  const catalog = buildTopicCatalog();
  expect(parseRecentTopics("broken-json", catalog)).toEqual([]);
  expect(parseRecentTopics(JSON.stringify([["pcs"], ["missing"], 42]), catalog)).toEqual([["pcs"]]);
});

it("moves a revisited topic to the front and caps history at 8", () => {
  const paths = Array.from({ length: 9 }, (_, index) => [`topic-${index}`]);
  const updated = recordRecentTopic(paths, ["topic-4"]);
  expect(updated[0]).toEqual(["topic-4"]);
  expect(updated.length).toBe(8);
  expect(updated.filter((path) => path[0] === "topic-4").length).toBe(1);
});

it("does not record the root", () => {
  expect(recordRecentTopic([["pcs"]], [])).toEqual([["pcs"]]);
});
