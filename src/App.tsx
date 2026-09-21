import { useEffect, useMemo, useState } from "react";
import type { Dir } from "./types";
import { DATA } from "./data/stack";
import { nodeAt, kidsOf, pathTo, descendantIds, TRACKABLE } from "./data/tree";
import { useUrlNavigation } from "./navigation/useUrlNavigation";
import { documentTitle } from "./navigation/documentTitle";
import { closeInspector } from "./inspector/stageMap";
import { buildTopicCatalog } from "./search/topicCatalog";
import { parseRecentTopics, recordRecentTopic, RECENT_TOPICS_KEY } from "./search/recentTopics";
import Header from "./components/Header";
import Breadcrumbs, { type Crumb } from "./components/Breadcrumbs";
import StackCanvas from "./components/StackCanvas";
import DrillCanvas from "./components/DrillCanvas";
import ContentPanel from "./components/ContentPanel";
import Stepper from "./components/Stepper";

export default function App() {
  const [navigation, navigate] = useUrlNavigation();
  const { rate, dir, gen, path, stepIndex } = navigation;
  const isFrame = navigation.view === "frame";
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const catalog = useMemo(() => buildTopicCatalog(), []);
  const [recent, setRecent] = useState<string[][]>(() => {
    try {
      return parseRecentTopics(localStorage.getItem(RECENT_TOPICS_KEY), catalog);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isFrame || navigation.view === "inspector" || !path.length || !catalog.some((entry) => entry.path.join("/") === path.join("/"))) return;
    setRecent((previous) => previous[0]?.join("/") === path.join("/") ? previous : recordRecentTopic(previous, path));
  }, [catalog, path, isFrame, navigation.view]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(recent));
    } catch {
      // Recents are a local convenience; discovery also works without storage.
    }
  }, [recent]);

  useEffect(() => {
    document.title = documentTitle(navigation);
  }, [navigation]);

  const node = useMemo(() => nodeAt(path), [path]);
  const kids = useMemo(() => (node ? kidsOf(node, dir) : []), [node, dir]);
  const zone = path.length ? DATA[path[0]].zone || "coding" : "coding";

  /* The canvas is a map, never a content surface. At a leaf it keeps showing
     the sibling chain with the current page lit, so you never lose your place. */
  const atLeaf = !!node && kids.length === 0 && path.length > 1;
  const canvasNode = atLeaf ? nodeAt(path.slice(0, -1)) : node;
  const canvasKids = canvasNode ? kidsOf(canvasNode, dir) : [];
  const litId = atLeaf && node ? node.id : null;

  const complete = (id: string) => {
    const ids = descendantIds(DATA[id]);
    return ids.length > 0 && ids.every((x) => visited.has(x));
  };

  const markRead = (id: string) =>
    setVisited((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });

  const openTop = (id: string) => {
    navigate({ path: [id], view: "stack" }, "push");
  };
  const selectTopic = (nextPath: string[]) => {
    if (nextPath.length) markRead(nextPath[nextPath.length - 1]);
    navigate({ path: nextPath, view: "stack" }, "push");
  };
  const push = (id: string) => {
    markRead(id);
    navigate({ path: pathTo(id) || path.concat(id), view: "stack" }, "push");
  };
  const upTo = (i: number) => navigate({ path: path.slice(0, i), view: "stack" }, "push");

  /* a node selected in one direction may not exist in the other */
  const changeDir = (d: Dir) => {
    if (d === "both") return;
    navigate({ dir: d }, "replace");
  };

  /* Escape climbs one level (or leaves the stepper). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (navigation.view === "inspector") {
        navigate(closeInspector(navigation), "push");
      } else if (isFrame) {
        navigate({ view: "stack" }, "push");
      } else if (path.length) {
        navigate((current) => ({ path: current.path.slice(0, -1), view: "stack" }), "push");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation, isFrame, path.length, navigate]);

  /* ---------------------------------------------------------- breadcrumbs */
  const crumbs: Crumb[] = [{ label: "the stack", go: path.length ? () => upTo(0) : null }];
  path.forEach((id, i) => {
    const n = nodeAt(path.slice(0, i + 1));
    const last = i === path.length - 1;
    crumbs.push({ label: n ? n.name : id, go: last ? null : () => upTo(i + 1) });
  });

  const isTop = path.length === 1;
  const panelKey = isFrame ? "step" : path.join("/") || "root";

  const walkthrough = (
    <main className="main main--step">
      <section className="col-step panel-anim">
        <StepperSidePanel />
        <Stepper
          rate={rate}
          dir={dir}
          gen={gen}
          index={stepIndex}
          onIndexChange={(index) => navigate({ stepIndex: index }, "replace")}
          onExit={() => navigate({ view: "stack" }, "push")}
          onNavigate={(p) => {
            if (p.length) markRead(p[p.length - 1]);
            navigate({ path: p, view: "stack" }, "push");
          }}
        />
      </section>
    </main>
  );

  const stack = (
    <main className="main">
      <section className="col-map">
        <div className="map-sticky">
          <Breadcrumbs crumbs={crumbs} />
          {node && canvasNode ? (
            <DrillCanvas
              node={canvasNode}
              kids={canvasKids}
              rate={rate}
              dir={dir}
              visited={visited}
              onPick={(id) => {
                markRead(id);
                navigate({
                  path: pathTo(id) || path.slice(0, atLeaf ? -1 : path.length).concat(id),
                  view: "stack",
                }, "push");
              }}
              zone={zone}
              litId={litId}
            />
          ) : (
            <StackCanvas rate={rate} dir={dir} gen={gen} onOpen={openTop} complete={complete} />
          )}
        </div>
      </section>

      <section className="col-panel">
        <div className="panel-anim" key={panelKey}>
          <ContentPanel node={node} rate={rate} dir={dir} isTop={isTop} kids={kids} visited={visited} onPush={push} />
        </div>
      </section>
    </main>
  );

  return (
    <div className="app">
      <Header
        rate={rate}
        setRate={(r) => navigate({ rate: r }, "replace")}
        dir={dir}
        setDir={changeDir}
        gen={gen}
        setGen={(g) => navigate({ gen: g }, "replace")}
        stepping={isFrame}
        toggleStep={() => navigate({ view: isFrame ? "stack" : "frame" }, "push")}
        read={visited.size}
        total={TRACKABLE}
        catalog={catalog}
        recent={recent}
        onSelectTopic={selectTopic}
      />

      {navigation.view === "inspector" ? (
        <main><h1>Frame inspector</h1>
          <button onClick={() => navigate(closeInspector(navigation), "push")}>
            Return to learning
          </button>
        </main>
      ) : isFrame ? walkthrough : stack}

      <footer className={"footer" + (isFrame ? " footer--step" : "")}>
        <div className="footer__inner">
          400G follows IEEE 802.3 Clause 119 and its PMD clauses; 800G follows 802.3df; 1.6T follows 802.3dj, still in draft at the
          time of writing, so anything marked draft may have moved.
        </div>
      </footer>
    </div>
  );
}

/* A short companion note shown beside the frame stepper. */
function StepperSidePanel() {
  return (
    <div>
      <h2 className="panel-title" style={{ fontSize: 22 }}>
        Follow a frame
      </h2>
      <div className="prose" style={{ marginTop: 12 }}>
        <p>
          Follow how Ethernet frame data and interface control are encoded, protected by FEC, and mapped onto serial lanes.
          The drawings illustrate transformations rather than simulate a complete PHY.
        </p>
        <p>
          Each step explains the representation and gives a scoped example or reference parameter. Use the
          <strong> Next</strong> and <strong>Back</strong> controls, the progress ticks, or the <strong>← →</strong> arrow keys.
          Switch rate and lane generation to compare electrical interface counts. Optical signaling and inner FEC depend on the selected PMD, which this simplified walkthrough does not select.
        </p>
        <p>
          Switch <strong>direction</strong> to <strong>RX</strong> to follow recovery, outer FEC decoding and frame validation.
          Applicable optical inner decoding occurs earlier in that path. Each code has a finite correction capacity; detected failures must be propagated for rejection.
        </p>
      </div>
    </div>
  );
}
