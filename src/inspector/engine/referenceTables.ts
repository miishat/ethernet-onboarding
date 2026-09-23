/**
 * Source inventory only. No protocol lookup tables are exported until the
 * selected published edition and independent vectors have been verified.
 */
export const REFERENCE_SOURCES = Object.freeze([
  Object.freeze({
    id: "itu-g7095-2024-cor1-rs544",
    edition: "ITU-T G.709.5 (2024) Corrigendum 1",
    sourceUrl: "https://www.itu.int/rec/dologin_pub.asp?id=T-REC-G.709.5-202505-I%21Cor1%21PDF-E&lang=e&type=items",
    retrievedOn: "2026-09-21",
    verificationScope: "Annex A, pages 36-38: standalone GF(2^10) and systematic RS(544,514) arithmetic only. It does not define Ethernet distribution, interleave, lanes, or PMA.",
  }),
  Object.freeze({
    id: "ieee-8023-2022",
    edition: "IEEE Std 802.3-2022",
    sourceUrl: "https://standards.ieee.org/ieee/802.3/10422/",
    retrievedOn: "2026-09-20",
    verificationScope: "Publication metadata only; normative clauses inaccessible.",
  }),
  Object.freeze({
    id: "ieee-8023-2022-line-check",
    edition: "IEEE Std 802.3-2022",
    sourceUrl: "https://ieeexplore.ieee.org/document/9844436",
    retrievedOn: "2026-09-21",
    verificationScope: "Blocked evidence-template record only. No final clause text, constants, table rows, or implementation convention was inspected or admitted.",
  }),
  Object.freeze({
    id: "400gbase-dr4-tx-reference-pma-v1",
    edition: "Project-owned experimental reference profile",
    sourceUrl: "docs/inspector-profile.md",
    retrievedOn: "2026-09-23",
    verificationScope: "Candidate-contract metadata only. This record does not add PCS, PMA, or PAM4 calculation code and does not establish IEEE verification or standards conformance.",
    availability: "experimental-reference",
    provenanceLabel: "Experimental reference using candidate contracts",
    standardsConformance: "not-claimed",
    candidateSourceIds: Object.freeze([
      "ieee-bs-d14-cl119-locator",
      "ieee-bs-dr4-geometry-context",
      "itu-g7095-2024-cor1-rs544",
      "ieee-df-172a-rs-candidate",
      "ieee-df-172a-input-candidate",
    ]),
    independentLocalFixturePolicy: "required-before-expected-output-admission",
    lineCheckUpgradePath: "Replace every candidate contract with reviewed IEEE Std 802.3-2022 line evidence and independently review a 400G fixture before enabling the IEEE-only profile.",
  }),
  Object.freeze({
    id: "ieee-bs-d14-cl119-locator",
    edition: "IEEE P802.3bs/D1.4, 7 April 2016, marked-up contribution",
    sourceUrl: "https://www.ieee802.org/3/bs/public/16_05/ofelt_3bs_03_0516.pdf",
    retrievedOn: "2026-09-20",
    verificationScope: "Clause 119 draft locators only; not the published target edition.",
  }),
  Object.freeze({
    id: "ieee-bs-dr4-geometry-context",
    edition: "IEEE P802.3bs September 2017 contribution discussing D3.3",
    sourceUrl: "https://www.ieee802.org/3/bs/public/17_09/tamura_3bs_01a_0917.pdf",
    retrievedOn: "2026-09-20",
    verificationScope: "Page 8 identifies DR4, 53.125 GBd and Clause 124; context only.",
  }),
  Object.freeze({
    id: "ieee-df-172a-rs-candidate",
    edition: "IEEE Std 802.3df-2024",
    sourceUrl: "https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-3_to_Table_172A-6.txt",
    retrievedOn: "2026-09-20",
    verificationScope: "Published 800G example source retrieved; 400G conventions unverified.",
  }),
]);

/** Each identifier resolves to a concrete outstanding rule in inspector-profile.md. */
export const UNRESOLVED_RULE_IDS = Object.freeze([
  "mac-frame-fcs",
  "rs-cdmii-placement",
  "encode66-control-tables",
  "transcode257-order",
  "bit-serialization",
  "scrambler-recurrence",
  "am-values-status-pad",
  "am-schedule-idle-compensation",
  "pre-fec-distribution",
  "rs-field-roots-parity",
  "codeword-interleave",
  "pma-16-to-4",
  "pam4-dibit-gray-precoding",
  "independent-vectors",
] as const);
