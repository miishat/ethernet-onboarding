/* eslint-disable */
import type { Rate, Dir, LaneGen, LanePhys, Stage } from "../types";

/* Logical PCS lane count is fixed per rate (independent of the physical lane
   generation). 1.6T is null — the sources behind these pages do not confirm it. */
export const PCS_LANES: Record<Rate, number | null> = {
  "400G": 16,
  "800G": 32,
  "1.6T": null,
};

/* Physical lanes depend on both rate and per-lane generation. Every rate has a
   100G/lane and a 200G/lane variant (e.g. 400GBASE-CR4/KR4/DR4 vs CR2/KR2/DR2). */
export const LANE_TABLE: Record<Rate, Record<LaneGen, LanePhys>> = {
  "400G": {
    "100": { phys: 4, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
    "200": { phys: 2, laneRate: "212.5 Gb/s", baud: "106.25 GBd" },
  },
  "800G": {
    "100": { phys: 8, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
    "200": { phys: 4, laneRate: "212.5 Gb/s", baud: "106.25 GBd" },
  },
  "1.6T": {
    "100": { phys: 16, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
    "200": { phys: 8, laneRate: "212.5 Gb/s", baud: "106.25 GBd" },
  },
};

export function laneInfo(rate: Rate, gen: LaneGen): LanePhys {
  return LANE_TABLE[rate][gen];
}

export const STAGES: Stage[] = [
  {
    id: "frame", block: "mac", title: "A frame leaves the MAC",
    shape: "octets",
    note: "The MAC hands down octets: addresses, type, payload, and a CRC-32 at the end. Nothing here depends on the rate.",
    count: (_r: Rate, _gen: LaneGen) => "64 octets minimum",
  },
  {
    id: "encode", block: "pcs", title: "Coded into 66-bit blocks",
    shape: "block66",
    note: "Each 64 bits gains a two-bit sync header. 01 for data, 10 for control. The stream is now self-describing and costs 3.125 percent to be so.",
    count: (_r: Rate, _gen: LaneGen) => "66 bits per block, 3.125 percent overhead",
  },
  {
    id: "transcode", block: "pcs", title: "Four blocks become one",
    shape: "block257",
    note: "Four 66-bit blocks are transcoded into a single 257-bit block. Overhead falls to 0.39 percent, and the room recovered is what pays for parity.",
    count: (_r: Rate, _gen: LaneGen) => "264 bits in, 257 out",
  },
  {
    id: "scramble", block: "pcs", title: "Scrambled",
    shape: "scrambled",
    note: "Combined with a self-synchronous shift register so the line has transitions and no DC imbalance. The data is unchanged in content and unrecognisable in appearance.",
    count: (_r: Rate, _gen: LaneGen) => "x^58 + x^39 + 1",
  },
  {
    id: "am", block: "pcs", title: "Alignment markers inserted",
    shape: "marker",
    note: "One marker per lane, periodically. Common part for boundary and presence, unique part for identity, plus per-lane error monitoring.",
    count: (r: Rate, _gen: LaneGen) => (PCS_LANES[r] ? PCS_LANES[r] + " lanes to identify" : "one marker per lane"),
  },
  {
    id: "fec", block: "fec", title: "Parity appended",
    shape: "codeword",
    note: "A group of 40 transcoded blocks becomes two 5140-bit messages; each gains 30 parity symbols. The decoder can repair fifteen damaged symbols per codeword.",
    count: (r: Rate, _gen: LaneGen) => (r === "1.6T" ? "RS(544,514) outer, plus an inner code" : "RS(544,514), corrects 15 symbols"),
  },
  {
    id: "stripe", block: "fec", title: "Striped across lanes",
    shape: "lanes",
    note: "Two codewords are interleaved ten bits at a time, then dealt one symbol per lane. How they are mapped decides whether a channel burst costs three symbols or thirty.",
    count: (r: Rate, _gen: LaneGen) => (r === "1.6T"
      ? "symbol multiplexed in the PMA (Clause 176)"
      : PCS_LANES[r] + " PCS lanes, bit multiplexed below"),
  },
  {
    id: "serialise", block: "pma", title: "Mapped onto physical lanes",
    shape: "phys",
    note: "The PMA folds the logical lanes onto however many physical lanes this variant has. This is the step that lets one PCS serve four-lane and eight-lane interfaces alike.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).phys + " physical lanes at " + laneInfo(r, gen).laneRate,
  },
  {
    id: "pam4", block: "pmd", title: "Sent as PAM4 symbols",
    shape: "pam4",
    note: "Two bits per symbol, four amplitude levels. Half the baud rate of NRZ for the same throughput, at the cost of roughly a third of the eye opening per level. Switch to RX to watch the receiver undo every step and repair the errors the channel adds.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).baud + " per lane",
  },
];

/* ===========================================================================
   RX — the receive path, in reverse. This is where FEC actually earns its
   parity: errors born in the channel are corrected here.
   =========================================================================== */
export const RX_STAGES: Stage[] = [
  {
    id: "rx-pam4", block: "pmd", title: "PAM4 symbols arrive",
    shape: "pam4",
    note: "The slicer decides which of four levels each symbol is and recovers two bits from each. Channel loss and noise have closed the eye, so this is where raw bit errors are born.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).baud + " per lane",
  },
  {
    id: "rx-serialise", block: "pma", title: "Physical lanes recovered",
    shape: "phys",
    note: "Clock and data recovery locks to each physical lane and hands the logical lanes back up. The PMA undoes the fold it made on transmit.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).phys + " physical lanes at " + laneInfo(r, gen).laneRate,
  },
  {
    id: "rx-align", block: "pcs", title: "Lanes deskewed and reordered",
    shape: "lanes",
    note: "Each lane locks to its alignment markers, announces its identity, and is delayed into alignment with the others. Skew and reordering the medium introduced are undone here, before any decoding.",
    count: (r: Rate, _gen: LaneGen) => (r === "1.6T"
      ? "symbol demultiplexed in the PMA (Clause 176)"
      : (PCS_LANES[r] ? PCS_LANES[r] + " PCS lanes realigned" : "lanes realigned")),
  },
  {
    id: "rx-fec", block: "fec", title: "Errors corrected",
    shape: "correct",
    note: "The payoff. The Reed-Solomon decoder repairs up to fifteen damaged symbols per codeword. Beyond fifteen the codeword is uncorrectable, and both interleaved codewords are marked as errors for the layers above.",
    count: (r: Rate, _gen: LaneGen) => (r === "1.6T"
      ? "inner Hamming, then RS(544,514) outer"
      : "RS(544,514), up to 15 symbols repaired"),
  },
  {
    id: "rx-am", block: "pcs", title: "Alignment markers removed",
    shape: "marker",
    note: "With deskew and correction done, the markers have served their purpose and are stripped out, restoring the original block stream.",
    count: (_r: Rate, _gen: LaneGen) => "one marker per lane removed",
  },
  {
    id: "rx-descramble", block: "pcs", title: "Descrambled",
    shape: "scrambled",
    note: "The same self-synchronous shift register, run in reverse, recovers the original bits. A single line error smears into a few bits here, which is why the error-marking rules account for it.",
    count: (_r: Rate, _gen: LaneGen) => "x^58 + x^39 + 1, reversed",
  },
  {
    id: "rx-transcode", block: "pcs", title: "One block becomes four",
    shape: "block257",
    note: "The 257-bit block is expanded back into four 66-bit blocks. A single flag bit says whether all four were data blocks, which is the common case.",
    count: (_r: Rate, _gen: LaneGen) => "257 bits in, 264 out",
  },
  {
    id: "rx-decode", block: "pcs", title: "Blocks decoded",
    shape: "block66",
    note: "Each block's two-bit sync header is checked and the sixty-four bits of payload are read out. Persistent illegal headers cost block lock rather than being accepted.",
    count: (_r: Rate, _gen: LaneGen) => "64 bits of payload per block",
  },
  {
    id: "rx-frame", block: "mac", title: "Frame delivered to the MAC",
    shape: "octets",
    note: "The octets are reassembled and the frame check sequence is verified. A frame whose FCS fails is dropped, never delivered corrupted - which is the whole point of everything below it.",
    count: (_r: Rate, _gen: LaneGen) => "FCS checked, corrupted frames dropped",
  },
];

/** The stage list for a direction: TX descends the stack, RX climbs it. */
export function stagesFor(dir: Dir): Stage[] {
  return dir === "rx" ? RX_STAGES : STAGES;
}

/** Which reference page each stage opens ("read more"), keyed by stage id. */
export const STAGE_LINKS: Record<string, string> = {
  frame: "mac-frame",
  encode: "pcs-6466",
  transcode: "pcs-257",
  scramble: "pcs-scramble",
  am: "pcs-am",
  fec: "fec-cw",
  stripe: "fec-interleave",
  serialise: "pma",
  pam4: "pmd",
  "rx-pam4": "pmd",
  "rx-serialise": "pma",
  "rx-align": "pcs-lock",
  "rx-fec": "fec-decode",
  "rx-am": "pcs-am",
  "rx-descramble": "pcs-scramble",
  "rx-transcode": "pcs-257",
  "rx-decode": "pcs-6466",
  "rx-frame": "mac-frame",
};
