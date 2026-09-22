# IEEE Std 802.3-2022 line-check register

Status: **blocked** as of 2026-09-21.

This register is the only admission path for IEEE-derived rules used by
`400gbase-dr4-tx-v1`. It intentionally contains no transcribed normative
text, calculated values, table rows, or implementation constants. The final
standard's clause text was not inspected in this workspace.

## Access evidence

The public IEEE SA publication page identifies IEEE Std 802.3-2022. The
public IEEE Xplore document record for document 9844436 did not provide
normative text to an unauthenticated request. Its response was a CloudFront
WAF challenge, and the existing Reading Room entry identifies account sign-in
as the route to reading access. No sign-in, credential entry, purchase, or
paywall bypass was attempted.

## Required record shape

```ts
interface VerifiedRuleRecord {
  ruleId: string;
  edition: "IEEE Std 802.3-2022";
  clause: string;
  tableOrFigure: string | null;
  page: number;
  lines: string;
  retrievedOn: string;
  accessPath: "IEEE Reading Room" | "licensed copy";
  implementationConvention: string;
  reviewer: string;
  status: "verified" | "blocked";
}
```

The blocked template below uses `pending` rather than inventing a page,
line range, access path, implementation convention, or reviewer. A verified
record must replace every pending field with the required value above.

| Rule ID | Edition | Clause | Table or figure | Page | Lines | Retrieved | Access path | Implementation convention | Reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scrambler-recurrence` | IEEE Std 802.3-2022 | 49.2.6 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `encode66-control-tables` | IEEE Std 802.3-2022 | 82 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `rs-cdmii-placement` | IEEE Std 802.3-2022 | 117 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `pcs-transmit-flow` | IEEE Std 802.3-2022 | 119.2.4.1 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `transcode257-order` | IEEE Std 802.3-2022 | 119.2.4.2 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `scrambler-application` | IEEE Std 802.3-2022 | 119.2.4.3 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `am-values-status-pad` | IEEE Std 802.3-2022 | 119.2.4.4 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `pre-fec-distribution` | IEEE Std 802.3-2022 | 119.2.4.5 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `rs-codeword-orientation` | IEEE Std 802.3-2022 | 119.2.4.6 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `codeword-interleave` | IEEE Std 802.3-2022 | 119.2.4.7 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `pma-16-to-4` | IEEE Std 802.3-2022 | 120.5.2 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `dr4-scope` | IEEE Std 802.3-2022 | 124 | pending | pending | unread | pending | pending | No convention entered | pending | blocked |
| `annex-119a-fixture` | IEEE Std 802.3-2022 | Annex 119A | pending | pending | unread | pending | pending | No convention entered | pending | blocked |

## Admission requirements

An authorized reviewer must inspect a licensed IEEE Std 802.3-2022 copy or
the IEEE Reading Room after signing in themselves. For each record, they must
enter the exact clause, table or figure, page, line range, retrieval date,
access path, concise implementation convention, and reviewer identity. The
reviewer must then independently compare every entered rule and recompute the
source and interpreted-fixture hashes recorded in
`test/fixtures/inspector/ieee-8023-2022-source-manifest.json`.

Until that work is complete, `UNRESOLVED_RULE_IDS` remains nonempty and no
PCS calculation, profile enablement, source transcription, or fixture
admission is authorized.
