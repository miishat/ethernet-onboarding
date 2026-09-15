// Auto-extracted verbatim from the original EthernetStack.jsx (LANES/STAGES).
/* eslint-disable */
import type { Rate, Dir, LaneInfo, Stage } from "../types";

export const LANES: Record<Rate, LaneInfo> = {
  "400G": { pcs: 16, phys: 4, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
  "800G": { pcs: 32, phys: 8, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
  "1.6T": { pcs: null, phys: 8, laneRate: "212.5 Gb/s", baud: "106.25 GBd" },
};

export const STAGES: Stage[] = [
  {
    id: "frame", block: "mac", title: "A frame leaves the MAC",
    shape: "octets",
    note: "The MAC hands down octets: addresses, type, payload, and a CRC-32 at the end. Nothing here depends on the rate.",
    count: (_r: Rate) => "64 octets minimum",
  },
  {
    id: "encode", block: "pcs", title: "Coded into 66-bit blocks",
    shape: "block66",
    note: "Each 64 bits gains a two-bit sync header. 01 for data, 10 for control. The stream is now self-describing and costs 3.125 percent to be so.",
    count: (_r: Rate) => "66 bits per block, 3.125 percent overhead",
  },
  {
    id: "transcode", block: "pcs", title: "Four blocks become one",
    shape: "block257",
    note: "Four 66-bit blocks are transcoded into a single 257-bit block. Overhead falls to 0.39 percent, and the room recovered is what pays for parity.",
    count: (_r: Rate) => "264 bits in, 257 out",
  },
  {
    id: "scramble", block: "pcs", title: "Scrambled",
    shape: "scrambled",
    note: "Combined with a self-synchronous shift register so the line has transitions and no DC imbalance. The data is unchanged in content and unrecognisable in appearance.",
    count: (_r: Rate) => "x^58 + x^39 + 1",
  },
  {
    id: "am", block: "pcs", title: "Alignment markers inserted",
    shape: "marker",
    note: "One marker per lane, periodically. Common part for boundary and presence, unique part for identity, plus per-lane error monitoring.",
    count: (r: Rate) => (LANES[r].pcs ? LANES[r].pcs + " lanes to identify" : "one marker per lane"),
  },
  {
    id: "fec", block: "fec", title: "Parity appended",
    shape: "codeword",
    note: "A group of 40 transcoded blocks becomes two 5140-bit messages; each gains 30 parity symbols. The decoder can repair fifteen damaged symbols per codeword.",
    count: (r: Rate) => (r === "1.6T" ? "RS(544,514) outer, plus an inner code" : "RS(544,514), corrects 15 symbols"),
  },
  {
    id: "stripe", block: "fec", title: "Striped across lanes",
    shape: "lanes",
    note: "Two codewords are interleaved ten bits at a time, then dealt one symbol per lane. How they are mapped decides whether a channel burst costs three symbols or thirty.",
    count: (r: Rate) => (r === "1.6T"
      ? "symbol multiplexed in the PMA (Clause 176)"
      : LANES[r].pcs + " PCS lanes, bit multiplexed below"),
  },
  {
    id: "serialise", block: "pma", title: "Mapped onto physical lanes",
    shape: "phys",
    note: "The PMA folds the logical lanes onto however many physical lanes this variant has. This is the step that lets one PCS serve four-lane and eight-lane interfaces alike.",
    count: (r: Rate) => LANES[r].phys + " physical lanes at " + LANES[r].laneRate,
  },
  {
    id: "pam4", block: "pmd", title: "Sent as PAM4 symbols",
    shape: "pam4",
    note: "Two bits per symbol, four amplitude levels. Half the baud rate of NRZ for the same throughput, at the cost of roughly a third of the eye opening per level. Switch to RX to watch the receiver undo every step and repair the errors the channel adds.",
    count: (r: Rate) => LANES[r].baud + " per lane",
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
    count: (r: Rate) => LANES[r].baud + " per lane",
  },
  {
    id: "rx-serialise", block: "pma", title: "Physical lanes recovered",
    shape: "phys",
    note: "Clock and data recovery locks to each physical lane and hands the logical lanes back up. The PMA undoes the fold it made on transmit.",
    count: (r: Rate) => LANES[r].phys + " physical lanes at " + LANES[r].laneRate,
  },
  {
    id: "rx-align", block: "pcs", title: "Lanes deskewed and reordered",
    shape: "lanes",
    note: "Each lane locks to its alignment markers, announces its identity, and is delayed into alignment with the others. Skew and reordering the medium introduced are undone here, before any decoding.",
    count: (r: Rate) => (r === "1.6T"
      ? "symbol demultiplexed in the PMA (Clause 176)"
      : (LANES[r].pcs ? LANES[r].pcs + " PCS lanes realigned" : "lanes realigned")),
  },
  {
    id: "rx-fec", block: "fec", title: "Errors corrected",
    shape: "correct",
    note: "The payoff. The Reed-Solomon decoder repairs up to fifteen damaged symbols per codeword. Beyond fifteen the codeword is uncorrectable, and both interleaved codewords are marked as errors for the layers above.",
    count: (r: Rate) => (r === "1.6T"
      ? "inner Hamming, then RS(544,514) outer"
      : "RS(544,514), up to 15 symbols repaired"),
  },
  {
    id: "rx-am", block: "pcs", title: "Alignment markers removed",
    shape: "marker",
    note: "With deskew and correction done, the markers have served their purpose and are stripped out, restoring the original block stream.",
    count: (_r: Rate) => "one marker per lane removed",
  },
  {
    id: "rx-descramble", block: "pcs", title: "Descrambled",
    shape: "scrambled",
    note: "The same self-synchronous shift register, run in reverse, recovers the original bits. A single line error smears into a few bits here, which is why the error-marking rules account for it.",
    count: (_r: Rate) => "x^58 + x^39 + 1, reversed",
  },
  {
    id: "rx-transcode", block: "pcs", title: "One block becomes four",
    shape: "block257",
    note: "The 257-bit block is expanded back into four 66-bit blocks. A single flag bit says whether all four were data blocks, which is the common case.",
    count: (_r: Rate) => "257 bits in, 264 out",
  },
  {
    id: "rx-decode", block: "pcs", title: "Blocks decoded",
    shape: "block66",
    note: "Each block's two-bit sync header is checked and the sixty-four bits of payload are read out. Persistent illegal headers cost block lock rather than being accepted.",
    count: (_r: Rate) => "64 bits of payload per block",
  },
  {
    id: "rx-frame", block: "mac", title: "Frame delivered to the MAC",
    shape: "octets",
    note: "The octets are reassembled and the frame check sequence is verified. A frame whose FCS fails is dropped, never delivered corrupted - which is the whole point of everything below it.",
    count: (_r: Rate) => "FCS checked, corrupted frames dropped",
  },
];

/** The stage list for a direction: TX descends the stack, RX climbs it. */
export function stagesFor(dir: Dir): Stage[] {
  return dir === "rx" ? RX_STAGES : STAGES;
}
