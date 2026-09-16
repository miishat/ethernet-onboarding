import { useEffect, useMemo, useState } from "react";
import type { Dir } from "./types";
import { DATA } from "./data/stack";
import { nodeAt, kidsOf, pathTo, descendantIds, TRACKABLE } from "./data/tree";
import { useUrlNavigation } from "./navigation/useUrlNavigation";
import { documentTitle } from "./navigation/documentTitle";
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
  const { rate, dir, gen, path, stepping, stepIndex } = navigation;
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
    if (stepping || !path.length || !catalog.some((entry) => entry.path.join("/") === path.join("/"))) return;
    setRecent((previous) => previous[0]?.join("/") === path.join("/") ? previous : recordRecentTopic(previous, path));
  }, [catalog, path, stepping]);

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
    navigate({ path: [id], stepping: false }, "push");
  };
  const selectTopic = (nextPath: string[]) => {
    if (nextPath.length) markRead(nextPath[nextPath.length - 1]);
    navigate({ path: nextPath, stepping: false }, "push");
  };
  const push = (id: string) => {
    markRead(id);
    navigate({ path: pathTo(id) || path.concat(id), stepping: false }, "push");
  };
  const upTo = (i: number) => navigate({ path: path.slice(0, i), stepping: false }, "push");

  /* a node selected in one direction may not exist in the other */
  const changeDir = (d: Dir) => {
    if (d === "both") return;
    navigate({ dir: d }, "replace");
  };

  /* Escape climbs one level (or leaves the stepper). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stepping) {
        navigate({ stepping: false }, "push");
      } else if (path.length) {
        navigate((current) => ({ path: current.path.slice(0, -1), stepping: false }), "push");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepping, path.length, navigate]);

  /* ---------------------------------------------------------- breadcrumbs */
  const crumbs: Crumb[] = [{ label: "the stack", go: path.length ? () => upTo(0) : null }];
  path.forEach((id, i) => {
    const n = nodeAt(path.slice(0, i + 1));
    const last = i === path.length - 1;
    crumbs.push({ label: n ? n.name : id, go: last ? null : () => upTo(i + 1) });
  });

  const isTop = path.length === 1;
  const panelKey = stepping ? "step" : path.join("/") || "root";

  return (
    <div className="app">
      <Header
        rate={rate}
        setRate={(r) => navigate({ rate: r }, "replace")}
        dir={dir}
        setDir={changeDir}
        gen={gen}
        setGen={(g) => navigate({ gen: g }, "replace")}
        stepping={stepping}
        toggleStep={() => navigate({ stepping: !stepping }, "push")}
        read={visited.size}
        total={TRACKABLE}
        catalog={catalog}
        recent={recent}
        onSelectTopic={selectTopic}
      />

      {stepping ? (
        <main className="main main--step">
          <section className="col-step panel-anim">
            <StepperSidePanel />
            <Stepper
              rate={rate}
              dir={dir}
              gen={gen}
              index={stepIndex}
              onIndexChange={(index) => navigate({ stepIndex: index }, "replace")}
              onExit={() => navigate({ stepping: false }, "push")}
              onNavigate={(p) => {
                if (p.length) markRead(p[p.length - 1]);
                navigate({ path: p, stepping: false }, "push");
              }}
            />
          </section>
        </main>
      ) : (
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
                      stepping: false,
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
      )}

      <footer className={"footer" + (stepping ? " footer--step" : "")}>
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
          Watch one frame's payload transform as it descends the stack - from MAC octets, through encoding and forward error
          correction, out onto physical lanes and finally into PAM4 symbols on the wire.
        </p>
        <p>
          Each step shows the payload in the shape it takes at that sublayer, with the arithmetic for the current rate. Use the
          <strong> Next</strong> and <strong>Back</strong> controls, the progress ticks, or the <strong>← →</strong> arrow keys.
          Switch the rate in the header to see the lane counts and baud change under the same block structure.
        </p>
        <p>
          Switch <strong>direction</strong> to <strong>RX</strong> to run it the other way - the receiver undoing each stage and, at
          the FEC step, repairing the errors the channel introduced. That correction is the reason the parity was added on the way down.
        </p>
      </div>
    </div>
  );
}
