# Inspector source documents still needed

Updated 2026-09-24 for the isolated `codex/interactive-frame-inspector` branch.
This list tracks documents needed to verify the named IEEE Std 802.3-2022
400GBASE-DR4 transmit profile. The experimental reference can continue while
these gates remain closed.

| Priority | Requested final source | Needed to verify | Current state |
| --- | --- | --- | --- |
| 1 | IEEE Std 802.3-2022 Clause 49, especially 49.2.6 | The exact self-synchronous scrambler recurrence, bit direction, and predecessor state convention. | No final Clause 49 extract in `knowledge_base_ieee`. |
| 1 | IEEE Std 802.3-2022 Clause 82, including 64B/66B control tables and control-character rules | Start, Terminate, Idle, mixed control/data block encoding and which control inputs may lawfully be removed for alignment-marker rate matching. | No final Clause 82 extract in `knowledge_base_ieee`. |
| 1 | IEEE Std 802.3-2022 Annex 119A, including its 400G transmit example tables | An independent published example for the complete PCS/FEC stream, initial state, input/output orientation, and expected values. | No final Annex 119A extract in `knowledge_base_ieee`. |

The local collection does contain Clause 81 and final Clauses 117, 119, 120,
and 124. Clause 81 is available for a further line check; it is not a missing
document. The admitted scope and remaining rule gates are tracked in
[inspector-ieee-line-check.md](inspector-ieee-line-check.md).

For each newly supplied extract, preserve its edition, clause or annex,
printed page numbers, and original PDF bytes. We will record its SHA-256 and
review the relevant lines before enabling the IEEE-only profile. Project-owned
PMA ordering and rate-match choices are implementation decisions, so another
IEEE document will not provide a universal sequence for them.
