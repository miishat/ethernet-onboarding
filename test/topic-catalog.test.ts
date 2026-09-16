import { describe, expect, it } from "vitest";
import type { StackNode } from "../src/types";
import { buildTopicCatalog, searchTopics, visibleTopics } from "../src/search/topicCatalog";

const fixture: Record<string, StackNode> = {
  phy: {
    id: "phy", name: "Physical Layer", summary: "The Ethernet stack",
    subs: [
      {
        id: "tx", name: "Transmit", dir: "tx",
        sections: [
          {
            id: "outline", name: "Future encoder", written: false,
            alias: "FE", summary: "Outlined encoding topic",
          },
          { id: "conflict", name: "Receive inside transmit", dir: "rx" },
        ],
      },
      { id: "rx", name: "Receive", dir: "rx" },
      {
        id: "pcs", name: "PCS", alias: "Physical Coding Sublayer",
        intro: "Introduction to synchronization", body: "Recover the clock",
        clause: { "400G": "Clause 119", "800G": "Clause 172", all: "Clause 82" },
        terms: { deskew: "Restore lane alignment" },
      },
      { id: "clock-body", name: "Zebra", body: "Clock" },
      { id: "clock-inclusion", name: "Recover clock" },
      { id: "clock-alias", name: "Timing", alias: "Clock recovery" },
      { id: "clock-prefix", name: "Clock recovery" },
      { id: "clock-exact", name: "Clock" },
      { id: "clock-tie", name: "Clock acquisition" },
    ],
  },
  mac: { id: "mac", name: "MAC" },
};

describe("topic catalog", () => {
  it("flattens every root and raw descendant including outline paths", () => {
    const catalog = buildTopicCatalog(fixture);

    expect(catalog.map((entry) => entry.id)).toEqual([
      "phy", "tx", "outline", "conflict", "rx", "pcs", "clock-body",
      "clock-inclusion", "clock-alias", "clock-prefix", "clock-exact", "clock-tie", "mac",
    ]);
    expect(catalog.find((entry) => entry.id === "outline")).toMatchObject({
      id: "outline", name: "Future encoder", alias: "FE", summary: "Outlined encoding topic",
      path: ["phy", "tx", "outline"],
      breadcrumb: "Physical Layer / Transmit / Future encoder",
      layer: "phy", layerName: "Physical Layer", written: false,
      directions: ["both", "tx", "both"], nameText: "future encoder",
    });
    expect(catalog.find((entry) => entry.id === "pcs")?.written).toBe(true);
  });

  it("filters every direction constraint in the ancestry", () => {
    const catalog = buildTopicCatalog(fixture);

    expect(visibleTopics(catalog, "rx").map((entry) => entry.id)).toEqual([
      "phy", "rx", "pcs", "clock-body", "clock-inclusion", "clock-alias",
      "clock-prefix", "clock-exact", "clock-tie", "mac",
    ]);
    expect(visibleTopics(catalog, "tx").map((entry) => entry.id)).toEqual([
      "phy", "tx", "outline", "pcs", "clock-body", "clock-inclusion", "clock-alias",
      "clock-prefix", "clock-exact", "clock-tie", "mac",
    ]);
    expect(searchTopics(catalog, "Future", "rx")).toEqual([]);
    expect(searchTopics(catalog, "Future", "tx")[0]?.path).toEqual(["phy", "tx", "outline"]);
  });

  it("ranks exact names, prefixes, aliases, inclusions, and body-only matches with breadcrumb ties", () => {
    expect(searchTopics(buildTopicCatalog(fixture), "clock", "tx").map((entry) => entry.id))
      .toEqual(["clock-exact", "clock-tie", "clock-prefix", "clock-alias", "clock-inclusion", "pcs", "clock-body"]);
  });

  it.each([
    ["physical coding", ["pcs"]],
    ["clause 119", ["pcs"]],
    ["clause 172", ["pcs"]],
    ["clause 82", ["pcs"]],
    ["deskew", ["pcs"]],
    ["lane alignment", ["pcs"]],
    ["synchronization", ["pcs"]],
    ["stack", ["phy"]],
    ["  PhYsIcAl\tCoDiNg\n", ["pcs"]],
    ["deskew nonexistent", []],
    ["nonsense", []],
  ])("indexes all topic content and requires every token for %j", (query, ids) => {
    expect(searchTopics(buildTopicCatalog(fixture), query, "tx").map((entry) => entry.id)).toEqual(ids);
  });

  it("returns visible topics in catalog order for whitespace-only queries", () => {
    const catalog = buildTopicCatalog(fixture);
    expect(searchTopics(catalog, " \t\n ", "rx")).toEqual(visibleTopics(catalog, "rx"));
  });

  it("builds the real learning catalog by default", () => {
    const pcs = buildTopicCatalog().find((entry) => entry.id === "pcs");
    expect(pcs?.path).toEqual(["pcs"]);
    expect(pcs?.searchText).toContain("clause 119");
  });
});
