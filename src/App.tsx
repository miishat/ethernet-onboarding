import { useEffect, useMemo, useState } from "react";
import type { Rate, Dir } from "./types";
import { DATA } from "./data/stack";
import { nodeAt, kidsOf, descendantIds, TRACKABLE } from "./data/tree";
import Header from "./components/Header";
import Breadcrumbs, { type Crumb } from "./components/Breadcrumbs";
import StackCanvas from "./components/StackCanvas";
import DrillCanvas from "./components/DrillCanvas";
import ContentPanel from "./components/ContentPanel";
import Stepper from "./components/Stepper";

export default function App() {
  const [rate, setRate] = useState<Rate>("400G");
  const [dir, setDir] = useState<Dir>("tx");
  const [path, setPath] = useState<string[]>([]);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [stepping, setStepping] = useState(false);

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
    setPath([id]);
    setStepping(false);
  };
  const push = (id: string) => {
    markRead(id);
    setPath((p) => p.concat(id));
  };
  const upTo = (i: number) => setPath((p) => p.slice(0, i));

  /* a node selected in one direction may not exist in the other */
  const changeDir = (d: Dir) => {
    setDir(d);
    let p = path.slice();
    while (p.length > 1) {
      const n = nodeAt(p);
      if (n && n.dir && n.dir !== "both" && n.dir !== d) p = p.slice(0, -1);
      else break;
    }
    if (p.length !== path.length) setPath(p);
  };

  /* Escape climbs one level (or leaves the stepper). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stepping) {
        setStepping(false);
      } else if (path.length) {
        setPath((p) => p.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepping, path.length]);

  /* ---------------------------------------------------------- breadcrumbs */
  const crumbs: Crumb[] = [{ label: "the stack", go: path.length ? () => setPath([]) : null }];
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
        setRate={setRate}
        dir={dir}
        setDir={changeDir}
        stepping={stepping}
        toggleStep={() => setStepping((s) => !s)}
        read={visited.size}
        total={TRACKABLE}
      />

      {stepping ? (
        <main className="main main--step">
          <section className="col-step panel-anim">
            <StepperSidePanel />
            <Stepper rate={rate} onExit={() => setStepping(false)} />
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
                    setPath(path.slice(0, atLeaf ? -1 : path.length).concat(id));
                  }}
                  zone={zone}
                  litId={litId}
                />
              ) : (
                <StackCanvas rate={rate} dir={dir} onOpen={openTop} complete={complete} />
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

      <footer className="footer">
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
      </div>
    </div>
  );
}
