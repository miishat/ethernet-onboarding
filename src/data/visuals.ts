// Auto-extracted verbatim from the original EthernetStack.jsx (VISUALS diagram specs).
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
    caption: "Two bits decide how the other sixty-four are read. Nothing else in the block is self-describing.",
  },

  "pcs-6466-struct": {
    type: "bitfield", ruler: true,
    title: "A data block, octet by octet",
    fields: [
      { label: "01", w: 2, accent: true },
      { label: "0", w: 8 }, { label: "1", w: 8 }, { label: "2", w: 8 }, { label: "3", w: 8 },
      { label: "4", w: 8 }, { label: "5", w: 8 }, { label: "6", w: 8 }, { label: "7", w: 8 },
    ],
    caption: "Header 01 means every octet is data, passed through untouched. The header itself carries no protection.",
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
      fields: [{ label: "1", w: 1, accent: true }, { label: "256 bits of payload", w: 256 }],
    },
    caption: "Seven bits saved per four blocks. Overhead falls from 3.125 to 0.39 percent, and the difference is what pays for parity.",
  },

  "pcs-257-lead": {
    type: "bitfield", ruler: true,
    title: "The all-data case",
    fields: [
      { label: "1", w: 1, accent: true, note: "all four were data" },
      { label: "four 64-bit payloads, end to end", w: 256 },
    ],
    caption: "The common case costs exactly one bit, which is why the encoding is shaped this way round.",
  },

  "pcs-257-control": {
    type: "bitfield", ruler: true,
    title: "With control blocks present",
    fields: [
      { label: "0", w: 1, accent: true, note: "flag clear" },
      { label: "positions", w: 4, alt: true, note: "which were control" },
      { label: "relocated type fields", w: 8, alt: true },
      { label: "remaining payload", w: 244 },
    ],
    caption: "Type information moves into the space the sync headers vacated, so all four blocks can be rebuilt exactly.",
  },

  "pcs-scramble": {
    type: "compare", labels: ["unscrambled: long runs, sparse transitions", "scrambled: dense transitions, balanced"],
    a: { type: "wave", pattern: "runs" },
    b: { type: "wave", pattern: "random" },
    caption: "The receiver recovers its clock from transitions. The left trace starves it and drags the decision thresholds with it.",
  },

  "pcs-scramble-257": {
    type: "bitfield", ruler: true,
    title: "Where bit 257 sits",
    fields: [
      { label: "bits 1 to 256, transcoded payload", w: 256 },
      { label: "257", w: 1, accent: true, note: "constant through data runs" },
    ],
    caption: "Left unscrambled, that one bit would put a predictable periodic line into the transmitted spectrum.",
  },

  "pcs-scramble-mult": {
    type: "compare", labels: ["one bit error arrives from the channel", "after descrambling, a short burst"],
    a: { type: "symbols", n: 20, damaged: [8], unit: "bits" },
    b: { type: "symbols", n: 20, damaged: [8, 9, 10], unit: "bits" },
    caption: "The errored bit re-enters the shift register. Some of the burstiness FEC must handle is manufactured inside the PHY.",
  },

  "pcs-am-parts": {
    type: "bitfield", ruler: true,
    title: "Marker structure",
    fields: [
      { label: "common part", w: 60, accent: true, note: "same on every lane" },
      { label: "unique part", w: 60, alt: true, note: "identifies this lane" },
    ],
    caption: "You cannot identify a lane with a pattern that is identical everywhere, nor hunt a boundary with one that differs per lane.",
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
    type: "fold", logical: { "400G": 16, "800G": 8, "1.6T": 16 }, physical: { "400G": 4, "800G": 8, "1.6T": 8 },
    title: "Logical lanes folded onto physical lanes",
    caption: "Because the logical count divides evenly, the same PCS drives four-lane and eight-lane interfaces with no change above the PMA.",
  },

  "pcs-lock": {
    type: "skew",
    title: "Lock, identify, deskew",
    caption: "Each lane locks independently, announces its identity, and is then delayed into alignment with the others.",
  },

  "pcs-lock-debug": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, fail: [11],
    title: "One lane failing",
    caption: "Isolation to a single lane points at that lane's own path. A fault in configuration would take every lane down together.",
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
  },

  /* ---------------------------------------------------------------- FEC --- */
  "fec-cw": {
    type: "symbols", n: 34, parityFrom: 30, scale: 16,
    title: "RS(544,514)",
    caption: "514 message symbols then 30 parity. Each cell here stands for sixteen real symbols.",
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
    caption: "Identical bit damage, opposite outcome. This is the whole reason distribution and multiplexing are argued about.",
  },

  "fec-interleave": {
    type: "lanes", n: { "400G": 16, "800G": 32, "1.6T": 8 }, mapping: true,
    title: "Codeword symbols across lanes",
    caption: "Two codewords interleaved ten bits at a time. Spreading means no single lane destroys a codeword alone; concentrating means a burst costs fewer symbols.",
  },

  "fec-il-sym": {
    type: "compare", labels: ["bit multiplexed: damage touches many symbols", "symbol multiplexed: damage stays in a few"],
    a: { type: "symbols", n: 24, damaged: [3, 5, 7, 9, 11, 13, 15, 17], budget: true },
    b: { type: "symbols", n: 24, damaged: [10, 11, 12], budget: true },
    caption: "The same channel burst, mapped two ways. At 200G per lane the bursts are long enough that containment wins.",
  },

  "fec-dec-cliff": {
    type: "curve",
    title: "Post-FEC against pre-FEC error rate",
    caption: "Flat, then vertical. A link reporting no loss may be sitting just left of the edge, and nothing downstream will say so.",
  },

  "fec-cc-inner": {
    type: "spans", mode: "concatenated",
    title: "Where each code sits",
    caption: "The inner code covers the segment with the worst statistics. The outer code still spans the whole path.",
  },

  /* ---- MAC, RS ---- */
  "mac-frame": {
    type: "bitfield", ruler: false,
    title: "An Ethernet frame",
    fields: [
      { label: "preamble", w: 7 }, { label: "SFD", w: 1, alt: true },
      { label: "destination", w: 6 }, { label: "source", w: 6 },
      { label: "type", w: 2, alt: true }, { label: "payload, 46 to 1500", w: 46 },
      { label: "FCS", w: 4, accent: true },
    ],
    caption: "Widths in octets, drawn at the 64-octet minimum. The FCS covers everything from the destination address onward.",
  },

  "mac-rate": {
    type: "bitfield", ruler: false,
    title: "Wire time for a minimum-size frame",
    fields: [
      { label: "preamble + SFD", w: 8, alt: true },
      { label: "header", w: 14 }, { label: "payload", w: 46, accent: true },
      { label: "FCS", w: 4 }, { label: "gap", w: 12, alt: true },
    ],
    caption: "84 octets of wire time carry 46 octets of payload. The same 26 octets of overhead barely register against a 1500-octet payload.",
  },

  "rs-adapt": {
    type: "states",
    title: "Aligning the next Start",
    nodes: ["frame ends anywhere", "gap too short or long", "insert or delete idles", "Start lands in lane 0"],
    caption: "The deficit idle count records what was borrowed, bounded so it must be repaid and the average gap holds.",
  },

  /* ---- PMA ---- */
  "pma-pam4": {
    type: "eye",
    title: "PAM4: four levels, three eyes",
    caption: "Four levels share the amplitude range NRZ used for two, so each eye is about a third the height. That is the roughly 9.5 dB penalty, drawn.",
  },

  "pma-eq": {
    type: "symbols", n: 20, damaged: [8, 9, 10, 11], unit: "PAM4 symbols",
    title: "DFE error propagation",
    caption: "One wrong decision feeds the next. With a one-tap DFE at coefficient 1 the chance of continuing is about 3/4 per symbol.",
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
    caption: "Two vendors, one channel. The specification divides the budget at the connector and defines compliance points either side, so neither has to test against the other.",
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
    caption: "Two vertical histograms at 0.45 and 0.55 unit intervals, spanning all four levels. The noise they capture is compared with an ideal receiver, and the difference in dB is the penalty.",
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
    caption: "Same 64-octet frame, but one bit and one duration per priority — so one class can be stopped while the others keep running.",
  },

  "rs-fault": {
    type: "states",
    title: "How a one-way failure gets reported",
    nodes: ["receive path breaks", "PCS sends local fault", "RS transmits remote fault", "far end sends idles only"],
    caption: "The far end's transmitter is the broken part, but it sees good data coming back. Remote fault is how it finds out.",
  },

  "form-lanes": {
    type: "fold", logical: { "400G": 8, "800G": 8, "1.6T": 16 }, physical: { "400G": 4, "800G": 8, "1.6T": 8 },
    title: "Electrical lanes into optical lanes",
    caption: "The cage decides how many electrical lanes arrive; the PMD decides how many optical lanes leave. They need not match.",
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
      { label: "SecTAG", w: 16, accent: true },
      { label: "secure data", w: 46 },
      { label: "ICV", w: 16, accent: true }, { label: "FCS", w: 4 },
    ],
    caption: "Widths in octets, drawn with a 16-octet SecTAG and a 16-octet ICV — the usual case, and 32 octets of addition.",
  },

  "fec-cc-seg": {
    type: "compare", labels: ["concatenated: outer code spans the whole link", "segmented: corrected and re-encoded per hop"],
    a: { type: "spans", mode: "concatenated" },
    b: { type: "spans", mode: "segmented" },
    caption: "Segmenting contains errors per hop but re-encodes an uncorrected error as apparently clean data for the next hop.",
  },
};
