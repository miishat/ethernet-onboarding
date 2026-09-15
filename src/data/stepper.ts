// Auto-extracted verbatim from the original EthernetStack.jsx (LANES/STAGES).
/* eslint-disable */
import type { Rate, LaneInfo, Stage } from "../types";

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
    note: "Two bits per symbol, four amplitude levels. Half the baud rate of NRZ for the same throughput, at the cost of roughly a third of the eye opening per level.",
    count: (r: Rate) => LANES[r].baud + " per lane",
  },
];
