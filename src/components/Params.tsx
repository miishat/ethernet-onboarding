import type { Rate, StackNode, Flag } from "../types";
import { pick } from "../data/tree";

export default function Params({ node, rate }: { node: StackNode; rate: Rate }) {
  const rows = pick(node.params, rate);
  if (!rows || !rows.length) return null;
  return (
    <table className="params">
      <tbody>
        {rows.map((r, i) => {
          const flag = (r[2] as Flag | undefined) || undefined;
          return (
            <tr key={i}>
              <td className="k">{r[0] as string}</td>
              <td className="v">
                {r[1] as string}
                {flag?.draft ? <span className="tag tag--draft">draft</span> : null}
                {flag?.industry ? (
                  <span className="tag" title="Industry or MSA source, not IEEE 802.3">
                    industry
                  </span>
                ) : null}
                {flag?.inferred ? (
                  <span className="tag" title="Inferred from related clause material, not read directly from clause text">
                    inferred
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
