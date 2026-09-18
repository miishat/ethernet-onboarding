// Schematic lesson diagrams. Captions identify example scope and simplifications.
/* eslint-disable */
import type { DiagramSpec } from "../types";

export const VISUALS: Record<string, DiagramSpec> = {
  /* ---------------------------------------------------------------- PCS --- */
  pcs: {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, mapping: true,
    title: "Round-robin distribution",
    caption: "Numbered units leave the coder in order and land on lanes in turn. Lane 0 takes unit 0, then unit n, then unit 2n.",
    captionByRate: {
      "1.6T": "Drawn as the eight physical lanes of a 1.6TBASE-DR8. The 1.6T PCS lane count is not confirmed by the sources behind this page, so it is not shown.",
    },
  },

  "pcs-6466": {
    type: "bitfield", ruler: true,
    title: "One 66-bit block",
    fields: [
      { label: "sync", w: 2, accent: true, note: "01 or 10" },
      { label: "payload", w: 64, note: "eight octets" },
    ],
    caption: "The sync header distinguishes data from control. A control block also carries a block-type field that defines how its payload is interpreted.",
  },

  "pcs-6466-struct": {
    type: "bitfield", ruler: true,
    title: "A data block, octet by octet",
    fields: [
      { label: "01", w: 2, accent: true },
      { label: "0", w: 8 }, { label: "1", w: 8 }, { label: "2", w: 8 }, { label: "3", w: 8 },
      { label: "4", w: 8 }, { label: "5", w: 8 }, { label: "6", w: 8 }, { label: "7", w: 8 },
    ],
    caption: "In a data block, header 01 precedes eight data octets. Sync-header legality provides a boundary check, not a checksum for the payload.",
  },

  "pcs-6466-control": {
    type: "bitfield", ruler: true,
    title: "A control block",
    fields: [
      { label: "10", w: 2, accent: true },
      { label: "block type", w: 8, alt: true, note: "selects the layout below" },
      { label: "seven octets, read according to block type", w: 56 },
    ],
    caption: "Idle, error, start, terminate and the ordered sets all live here, distinguished by the type field.",
  },

  "pcs-6466-lock": {
    type: "states", loop: [2, 0],
    title: "The block lock hunt",
    nodes: ["assume a boundary", "test sync headers", "00 or 11 seen", "block lock"],
    loopLabel: "shift one bit, try again",
    caption: "The illegal headers are the feedback signal. Enough clean blocks instead of violations and the receiver declares lock.",
  },

  "pcs-257": {
    type: "compare", labels: ["four blocks: eight header bits, 264 total", "one block: one leading bit, 257 total"],
    a: {
      type: "bitfield", compact: true,
      fields: [
        { label: "sy", w: 2, accent: true }, { label: "64 bits", w: 64 },
        { label: "sy", w: 2, accent: true }, { label: "64 bits", w: 64 },
        { label: "sy", w: 2, accent: true }, { label: "64 bits", w: 64 },
        { label: "sy", w: 2, accent: true }, { label: "64 bits", w: 64 },
      ],
    },
    b: {
      type: "bitfield", compact: true,
      fields: [{ label: "indicator", w: 1, accent: true }, { label: "256-bit representation", w: 256 }],
    },
    caption: "Four blocks shrink from 264 to 257 bits without losing their data and control information. Coding overhead falls from 3.125 to about 0.39 percent before FEC parity is added.",
  },

  "pcs-257-lead": {
    type: "bitfield", ruler: false,
    title: "The all-data case",
    fields: [
      { label: "indicator", w: 1, accent: true, note: "identifies the all-data case" },
      { label: "four 64-bit payloads, end to end", w: 256 },
    ],
    caption: "An all-data group contains four 64-bit data payloads and one indicator bit.",
  },

  "pcs-257-control": {
    type: "transcode",
    title: "With control blocks present",
    items: [
      { label: "indicator", bits: "1 bit", note: "distinguishes the data and control representations" },
      { label: "control positions", bits: "encoded", note: "identifies the source control blocks" },
      { label: "control types", bits: "encoded", note: "preserves their defined meanings" },
      { label: "source data", bits: "retained", note: "reconstructed by reverse transcoding" },
    ],
    caption: "Type information moves into the space the sync headers vacated, so all four blocks can be rebuilt exactly.",
  },

  "pcs-scramble": {
    type: "compare", labels: ["example repetitive input", "example scrambled output"],
    a: { type: "wave", pattern: "runs" },
    b: { type: "wave", pattern: "random" },
    caption: "Scrambling reduces repetitive patterns and improves transition and balance statistics. These traces illustrate the effect, not a guaranteed run-length or DC-balance bound.",
  },

  "pcs-scramble-257": {
    type: "bitfield", ruler: true,
    title: "The entire transcoded block is scrambled",
    fields: [
      { label: "indicator", w: 1, accent: true, note: "can repeat in all-data groups" },
      { label: "256-bit representation", w: 256 },
    ],
    caption: "Left unscrambled, that one bit would put a predictable periodic line into the transmitted spectrum.",
  },

  "pcs-scramble-mult": {
    type: "compare", labels: ["one residual error at descrambler input", "several affected output bits, schematic"],
    a: { type: "symbols", n: 20, damaged: [8], unit: "bits" },
    b: { type: "symbols", n: 20, damaged: [8, 9, 10], unit: "bits" },
    caption: "A residual input error can affect multiple descrambled output bits. Outer FEC decoding precedes this stage; PCS error-marking rules account for propagation. Drawn positions are not exact polynomial offsets.",
  },

  "pcs-am-parts": {
    type: "bitfield", ruler: true,
    title: "Marker structure",
    fields: [
      { label: "common part", w: 60, accent: true, note: "same on every lane" },
      { label: "unique part", w: 60, alt: true, note: "identifies this lane" },
    ],
    caption: "The common pattern helps locate markers. The unique pattern identifies the logical lane. This diagram shows the two parts, not the complete on-wire marker layout.",
  },

  "pcs-dist": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, mapping: true,
    title: "Distribution at this rate",
    caption: "At 400G: a 10-bit round robin into two messages, then one 10-bit symbol per lane, ascending.",
    captionByRate: {
      "800G": "800G runs two flows and four codewords, with 32:8 restricted bit-level multiplexing below the PCS.",
      "1.6T": "Drawn as the eight physical lanes of a 1.6TBASE-DR8. Below the PCS, 200G-per-lane interfaces use the Clause 176 symbol-multiplexing PMA.",
    },
  },

  "pcs-dist-div": {
    type: "fold", logical: { "400G": 16, "800G": 32, "1.6T": 16 }, physical: { "400G": 4, "800G": 8, "1.6T": 8 },
    title: "Logical lanes folded onto physical lanes",
    caption: "Specified PMA mappings adapt logical PCS lanes to physical interfaces. The drawn counts are reference examples, not a list of every standardized mapping.",
    captionByRate: { "1.6T": "This 16:8 example represents sixteen electrical AUI lanes mapped toward eight optical lanes. Sixteen is not a confirmed 1.6T PCS lane count." },
  },

  "pcs-lock": {
    type: "skew",
    title: "Lock, identify, deskew",
    caption: "Each lane locks independently, announces its identity, and is then delayed into alignment with the others.",
  },

  "pcs-lock-debug": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, fail: [3],
    title: "One lane failing",
    caption: "A lane-specific failure prioritizes checks of its signal path and mapping. Lane-specific configuration can also cause this symptom; it does not prove a hardware fault.",
    captionByRate: { "1.6T": "Eight rows illustrate a lane-specific failure, not a confirmed logical PCS count. Check the affected paths and mappings; the symptom does not prove a hardware fault." },
  },

  "pcs-lock-buffer": {
    type: "skew", showBuffer: true,
    title: "What the buffer has to hold",
    caption: "Depth follows the worst case the standard permits, accumulated across fibre, traces, retimers and DSP.",
  },

  "pcs-reorder": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, shuffled: true,
    title: "Arrival order against logical order",
    caption: "Physical lane order need not be preserved by the cable, because identity travelled inside the markers.",
    captionByRate: { "1.6T": "Eight rows illustrate marker-based reordering only. The 1.6T logical PCS count remains unconfirmed in this source base." },
  },

  /* ---------------------------------------------------------------- FEC --- */
  "fec-cw": {
    type: "symbols", n: 34, parityFrom: 30, scale: 16,
    title: "RS(544,514)",
    caption: "A real codeword contains 514 message symbols and 30 parity symbols, each ten bits. Cells group symbols schematically; the drawn message/parity boundary is not to scale.",
  },

  "fec-cw-gf": {
    type: "bitfield", ruler: true,
    title: "One symbol",
    fields: [
      { label: "b0", w: 1 }, { label: "b1", w: 1 }, { label: "b2", w: 1 }, { label: "b3", w: 1 }, { label: "b4", w: 1 },
      { label: "b5", w: 1 }, { label: "b6", w: 1 }, { label: "b7", w: 1 }, { label: "b8", w: 1 }, { label: "b9", w: 1 },
    ],
    caption: "Ten bits from a field of 1,024 elements. One wrong bit and the whole symbol counts as damaged.",
  },

  "fec-cw-budget": {
    type: "compare", labels: ["40 bits of damage inside four symbols", "the same 40 bits spread across twenty symbols"],
    a: { type: "symbols", n: 24, damaged: [9, 10, 11, 12], budget: true },
    b: { type: "symbols", n: 24, damaged: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], budget: true },
    caption: "Four erroneous symbols fit within the guaranteed correction capacity; twenty exceed it. Beyond fifteen, successful correction is not guaranteed. Equal bit-error counts can impose different symbol-error loads.",
  },

  "fec-interleave": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, mapping: true,
    title: "Codeword symbols across lanes",
    caption: "The 400G example interleaves two codewords in ten-bit units. Mapping can spread a short event among codewords or keep erroneous bits within fewer symbols. A persistent lane failure is not thereby correctable.",
    captionByRate: { "1.6T": "These eight rows are a schematic distribution example, not a confirmed 1.6T PCS lane or codeword arrangement. Use the applicable mapping to determine how errors reach outer codewords." },
  },

  "fec-il-sym": {
    type: "compare", labels: ["bit multiplexed: damage touches many symbols", "symbol multiplexed: damage stays in a few"],
    a: { type: "symbols", n: 24, damaged: [3, 5, 7, 9, 11, 13, 15, 17], budget: true },
    b: { type: "symbols", n: 24, damaged: [10, 11, 12], budget: true },
    caption: "Illustrative mappings of a burst, not measured error counts. Symbol multiplexing can reduce the number of affected RS symbols; performance depends on the channel and receiver error model.",
  },

  "fec-dec-cliff": {
    type: "curve",
    title: "Post-FEC against pre-FEC error rate",
    caption: "Frame loss can rise sharply as correction capacity is exceeded. This schematic is not a measured performance curve. Zero observed loss alone does not establish spare margin.",
  },

  "fec-cc-inner": {
    type: "spans", mode: "concatenated",
    title: "Where each code sits",
    caption: "In this concatenated optical architecture, the inner code protects the optical segment while the outer code protects the broader path.",
  },

  /* ---- MAC, RS ---- */
  "mac-frame": {
    type: "bitfield", ruler: false,
    title: "An untagged Ethernet packet at minimum frame size",
    fields: [
      { label: "preamble", w: 7 }, { label: "SFD", w: 1, alt: true },
      { label: "destination", w: 6 }, { label: "source", w: 6 },
      { label: "Length/Type", w: 2, alt: true }, { label: "data + pad, 46 minimum", w: 46 },
      { label: "FCS", w: 4, accent: true },
    ],
    caption: "Widths in octets. The frame is 64 octets from destination address through FCS; preamble and SFD are outside it. FCS calculation covers destination address through data/pad, excluding the FCS itself.",
  },

  "mac-rate": {
    type: "bitfield", ruler: false,
    title: "Minimum-frame occupancy",
    fields: [
      { label: "preamble + SFD", w: 8, alt: true },
      { label: "header", w: 14 }, { label: "data + pad", w: 46, accent: true },
      { label: "FCS", w: 4 }, { label: "gap", w: 12, alt: true },
    ],
    caption: "A minimum untagged frame occupies 84 octet times including preamble/SFD and a 12-octet-time average gap. It carries 46 octets of data/pad, not necessarily useful client data. The corresponding fixed occupancy overhead is 38 octet times.",
  },

  "rs-adapt": {
    type: "states",
    title: "Aligning the next Start",
    nodes: ["frame ends", "next Start needs alignment", "adjust idles within the rules", "Start at a permitted position"],
    caption: "The deficit idle count records what was borrowed, bounded so it must be repaid and the average gap holds.",
  },

  /* ---- PMA ---- */
  "pma-pam4": {
    type: "eye",
    title: "PAM4: four levels, three eyes",
    caption: "With equally spaced levels over the same amplitude range, adjacent PAM4 levels are one-third as far apart as NRZ levels. The idealized 9.5 dB noise-margin comparison is not a complete practical link budget.",
  },

  "pma-eq": {
    type: "symbols", n: 20, damaged: [8, 9, 10, 11], unit: "PAM4 symbols",
    title: "DFE error propagation",
    caption: "A wrong DFE decision can promote subsequent errors. In a simplified one-tap PAM4 model with coefficient 1, continuation probability can approach 3/4. This is not a universal burst probability.",
  },

  "pma-skew": {
    type: "skew",
    title: "Lane skew, as budgeted",
    caption: "Each lane's offset counts against a cumulative allowance at defined points along the link. At 400G the total reaches 160 ns by the receive PMA input.",
  },

  "pma-skew-read": {
    type: "skew", showBuffer: true,
    title: "What the receiver must absorb",
    caption: "The dashed spans are the delay each lane is held by. Budget values are cumulative, so any stage's own allowance is the gap between adjacent skew points.",
  },

  "aui-c2m": {
    type: "bitfield", ruler: false,
    title: "A chip-to-module channel, split at the connector",
    fields: [
      { label: "host channel", w: 40 },
      { label: "connector", w: 8, accent: true },
      { label: "module channel", w: 28, alt: true },
    ],
    caption: "Defined host and module compliance points make each side's requirements measurable. This supports interoperability assessment; it does not remove the need for appropriate testing.",
  },

  /* ---- PMD ---- */
  "pmd-naming": {
    type: "bitfield", ruler: false,
    title: "1.6TBASE-DR8-2, taken apart",
    fields: [
      { label: "1.6T", w: 4, accent: true }, { label: "BASE", w: 4 },
      { label: "DR", w: 3, alt: true }, { label: "8", w: 2, alt: true }, { label: "-2", w: 3, accent: true },
    ],
    caption: "Rate, baseband, media class, lane count, reach suffix. Parallel single-mode, eight lanes, two kilometres.",
  },

  "pmd-tdecq": {
    type: "eye", windows: true,
    title: "Where TDECQ is measured",
    caption: "Sample distributions are evaluated at positions separated by 0.1 UI after specified reference processing. Nominal timing and permitted optimization depend on the PMD and revision. TDECQ reports a power penalty, not measured operational BER.",
  },

  /* ---- flow control, faults, modules ---- */
  "mac-flow": {
    type: "bitfield", ruler: false,
    title: "A PAUSE frame",
    fields: [
      { label: "destination", w: 6 }, { label: "source", w: 6 },
      { label: "0x8808", w: 2, alt: true }, { label: "opcode", w: 2, alt: true },
      { label: "pause time", w: 2, accent: true }, { label: "pad", w: 42 }, { label: "FCS", w: 4 },
    ],
    caption: "Octets. The whole mechanism rests on one two-octet field, counted in units of 512 bit times.",
  },

  "mac-flow-pfc": {
    type: "bitfield", ruler: false,
    title: "A PFC frame",
    fields: [
      { label: "header", w: 14 }, { label: "opcode", w: 2, alt: true },
      { label: "class enable", w: 2, accent: true },
      { label: "eight per-class durations", w: 16, accent: true },
      { label: "pad", w: 26 }, { label: "FCS", w: 4 },
    ],
    caption: "Same 64-octet frame, but one bit and one duration per priority - so one class can be stopped while the others keep running.",
  },

  "rs-fault": {
    type: "states",
    title: "How a one-way failure gets reported",
    nodes: ["receive path breaks", "PCS sends local fault", "RS transmits remote fault", "far end sends idles only"],
    caption: "A local receive fault causes the endpoint to send Remote Fault toward its peer. The indication reports an observed receive problem, not proof that the peer's transmitter is the failed component.",
  },

  "form-lanes": {
    type: "fold", logical: { "400G": 8, "800G": 8, "1.6T": 16 }, physical: { "400G": 4, "800G": 8, "1.6T": 8 },
    title: "Electrical lanes into optical lanes",
    caption: "Example electrical-to-optical mappings. Host, module and form factor must support the chosen electrical interface; the PMD defines the optical arrangement. Counts need not match.",
    captionByRate: {
      "1.6T": "1.6TAUI-16 into a DR8: sixteen electrical lanes at 100G, eight optical lanes at 200G. The OSFP-XD cage exists to carry the sixteen.",
    },
  },

  /* ---- MACsec ---- */
  "macsec-frame": {
    type: "bitfield", ruler: false,
    title: "A MACsec-protected frame",
    fields: [
      { label: "destination", w: 6 }, { label: "source", w: 6 },
      { label: "MACsec EtherType + SecTAG", w: 16, accent: true },
      { label: "secure data", w: 46 },
      { label: "ICV", w: 16, accent: true }, { label: "FCS", w: 4 },
    ],
    caption: "This example uses a two-octet MACsec EtherType, a fourteen-octet SecTAG including SCI, and a sixteen-octet ICV. Those fields add 32 octets. Secure-data width is illustrative; padding and encapsulation affect actual frame size.",
  },

  "fec-cc-seg": {
    type: "compare", labels: ["concatenated: outer code spans the whole link", "segmented: corrected and re-encoded per hop"],
    a: { type: "spans", mode: "concatenated" },
    b: { type: "spans", mode: "segmented" },
    caption: "Segmented decoding separates correction spans. Residual wrong data can be re-encoded into a valid next-segment codeword, so detected failures need defined propagation. Concatenation retains the broader outer-code span.",
  },
};
