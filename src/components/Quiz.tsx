import { useState } from "react";
import type { QuizItem } from "../types";

export default function Quiz({ items }: { items: QuizItem[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <div>
      {items.map((q, qi) => {
        const chosen = picked[qi];
        return (
          <div className="quiz-item" key={qi}>
            <p>{qi + 1 + ". " + q.q}</p>
            {q.opts.map((o, oi) => {
              let state: string | undefined;
              if (chosen !== undefined) {
                if (oi === q.a) state = "correct";
                else if (oi === chosen) state = "wrong";
              }
              return (
                <button
                  key={oi}
                  className="quiz-opt"
                  data-state={state}
                  disabled={chosen !== undefined}
                  onClick={() => chosen === undefined && setPicked({ ...picked, [qi]: oi })}
                >
                  {o}
                </button>
              );
            })}
            {chosen !== undefined ? (
              <p className="quiz-why">
                <b className={chosen === q.a ? "correct" : "wrong"}>
                  {chosen === q.a ? "Correct. " : "Not this one. "}
                </b>
                {q.why}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
