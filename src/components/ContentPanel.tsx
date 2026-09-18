import { useEffect, useState } from "react";
import type { Rate, Dir, StackNode } from "../types";
import { RATE_META } from "../data/stack";
import { pick, rawKids } from "../data/tree";
import { VISUALS } from "../data/visuals";
import Prose from "./Prose";
import Params from "./Params";
import Quiz from "./Quiz";
import Diagram from "./Diagram";
import Heading from "./Heading";

interface Props {
  node: StackNode | null;
  rate: Rate;
  dir: Dir;
  isTop: boolean;
  kids: StackNode[];
  visited: Set<string>;
  onPush: (id: string) => void;
}

function StartHere({ rate, dir }: { rate: Rate; dir: Dir }) {
  const meta = RATE_META[rate];
  return (
    <div>
      <h2 className="panel-title" style={{ fontSize: 24 }}>
        Start anywhere
      </h2>
      <div className="prose" style={{ marginTop: 12 }}>
        <p>
          {"You are looking at " +
            rate +
            " in the " +
            (dir === "tx" ? "transmit" : "receive") +
            " direction. Start with MAC and follow the frame toward the medium for TX, or start at the medium and follow recovery toward MAC for RX. Switching rates changes the interface counts and reference parameters; the selected PHY and lane generation also determine the coding and mapping rules."}
        </p>
        <p>
          The main column runs from MAC through the PHY to the medium. FEC is shown separately for teaching, although the relevant PCS definitions include its processing.
          The side blocks describe related functions: MACsec operates above MAC, and TimeSync relates timestamps to a reference plane.
          Clause 73 autonegotiation applies here to electrical backplane and copper links, not optical PMDs. Electrical link training is separate and can also apply to a module's host interface.
        </p>
        <p>Select a block for its overview, then open its lessons for the mechanism, examples and self-checks. The walkthrough follows one simplified data path; the reference pages explain where PHY-specific rules differ.</p>
      </div>
      <Heading>This rate</Heading>
      <table className="params">
        <tbody>
          {[
            ["Standard", meta.std],
            ["Typical lanes", meta.lanes],
            ["Status", meta.draft ? "P802.3dj draft; check revision" : "published reference; P802.3dj extensions remain draft"],
          ].map((r, i) => (
            <tr key={i}>
              <td className="k">{r[0]}</td>
              <td className="v">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Heading>Written so far</Heading>
      <p className="prose" style={{ color: "var(--dim)", maxWidth: "68ch", lineHeight: 1.65 }}>
        Every block is written and navigable, across all rates and both directions. PCS and RS-FEC go deepest - three levels,
        with diagrams and self-checks. A few sub-pages are still outlines: clock and data recovery, the copper and multimode
        PMDs, the three medium pages, co-packaged optics, and Clause 73 autonegotiation.
      </p>
    </div>
  );
}

export default function ContentPanel({ node, rate, dir, isTop, kids, visited, onPush }: Props) {
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    setShowQuiz(false);
  }, [node?.id]);

  if (!node) return <StartHere rate={rate} dir={dir} />;

  const cl = pick(node.clause, rate);
  const draft = cl ? /draft/i.test(cl) : false;

  if (showQuiz && node.quiz) {
    return (
      <div className="quiz-view">
        <div className="quiz-view__head">
          <h2 className="panel-title" style={{ fontSize: isTop ? 24 : 21 }}>Check yourself</h2>
          <button className="quiz-back" onClick={() => setShowQuiz(false)}>← Back to lesson</button>
        </div>
        <Quiz items={node.quiz} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="panel-title" style={{ fontSize: isTop ? 24 : 21 }}>
        {node.name}
      </h2>
      {node.alias ? <p className="panel-alias">{node.alias}</p> : null}
      {cl ? (
        <span className={"badge" + (draft ? " badge--draft" : "")}>
          <span className="badge__label">Reference</span>
          {cl}
        </span>
      ) : null}

      {node.written === false ? (
        <div className="outline-card" style={{ marginTop: 16 }}>
          <strong>Outline. </strong>
          {(node.summary || "") +
            (rawKids(node).length ? " The pages inside are titled and navigable but not written." : " Not written yet.")}
        </div>
      ) : null}

      {node.intro || node.body ? (
        <div style={{ marginTop: 16 }}>
          <Prose text={node.intro || node.body} terms={node.terms} />
        </div>
      ) : null}

      {VISUALS[node.id] ? (
        <div style={{ borderTop: "1px solid var(--rule-soft)", marginTop: 20, paddingTop: 4 }}>
          <Diagram spec={VISUALS[node.id]} rate={rate} />
        </div>
      ) : null}

      {pick(node.params, rate) ? (
        <>
          <Heading>{"At " + rate}</Heading>
          <Params node={node} rate={rate} />
        </>
      ) : null}

      {kids.length ? (
        <>
          <Heading>{isTop ? "Inside - " + (dir === "tx" ? "transmit" : "receive") : "Inside"}</Heading>
          <ul className="kid-list">
            {kids.map((s) => (
              <li key={s.id}>
                <button className="kid" onClick={() => onPush(s.id)}>
                  <span className={"kid__tick " + (visited.has(s.id) ? "kid__tick--read" : "kid__tick--unread")}>
                    {visited.has(s.id) ? "✓" : "·"}
                  </span>
                  <span className="kid__name">{s.name}</span>
                  <span className="kid__summary">{s.summary || ""}</span>
                  <span className="kid__chev" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {node.quiz ? (
        <button className="quiz-launch" onClick={() => setShowQuiz(true)}>
          Check Yourself
        </button>
      ) : null}
    </div>
  );
}
