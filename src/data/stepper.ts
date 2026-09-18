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
    note: "The MAC transmits a frame containing addresses, Length/Type, data and any pad, followed by the FCS. The basic field layout is shared across the rates shown here. The 64-octet minimum counts from destination address through FCS, excluding preamble and SFD.",
    count: (_r: Rate, _gen: LaneGen) => "64 octets minimum",
  },
  {
    id: "encode", block: "pcs", title: "Coded into 66-bit blocks",
    shape: "block66",
    note: "The PCS represents interface data and control in 66-bit blocks: a two-bit sync header and a 64-bit block payload. Data blocks use 01; control blocks use 10 and include a block-type field. The two added bits are 3.125 percent overhead relative to 64 bits.",
    count: (_r: Rate, _gen: LaneGen) => "66 bits per block, 3.125 percent overhead",
  },
  {
    id: "transcode", block: "pcs", title: "Four blocks become one",
    shape: "block257",
    note: "Transcoding represents four 66-bit blocks in 257 bits while retaining their data and control information. The coding addition is now one bit per 256 input bits, about 0.39 percent. This reduces coding overhead before Reed-Solomon parity is added.",
    count: (_r: Rate, _gen: LaneGen) => "264 bits in, 257 out",
  },
  {
    id: "scramble", block: "pcs", title: "Scrambled",
    shape: "scrambled",
    note: "The scrambler combines the transcoded stream with a sequence derived from earlier bits. The drawing illustrates a repetitive input becoming less repetitive. Scrambling improves transition and balance statistics; it does not guarantee a fixed maximum run length or exact DC balance.",
    count: (_r: Rate, _gen: LaneGen) => "x^58 + x^39 + 1",
  },
  {
    id: "am", block: "pcs", title: "Alignment markers inserted",
    shape: "marker",
    note: "Periodic marker groups are inserted before lane distribution. The common pattern helps the receiver find boundaries, and each lane's unique pattern identifies its logical position. The receiver later uses these markers to reorder lanes and compensate for skew.",
    count: (r: Rate, _gen: LaneGen) => (PCS_LANES[r] ? PCS_LANES[r] + " lanes to identify" : "one marker per lane"),
  },
  {
    id: "fec", block: "fec", title: "Parity appended",
    shape: "codeword",
    note: "In the 400G example, forty 257-bit blocks supply two 5140-bit messages. Each message gains thirty ten-bit parity symbols to form an RS(544,514) codeword. Up to fifteen erroneous symbols per codeword are guaranteed correctable. Applicable optical paths can add a separate inner code.",
    count: (_r: Rate, gen: LaneGen) => gen === "200" ? "outer RS(544,514); optical inner FEC is PHY-dependent" : "RS(544,514), corrects up to 15 symbols",
  },
  {
    id: "stripe", block: "fec", title: "Striped across lanes",
    shape: "lanes",
    note: "The 400G stream interleaves two codewords in ten-bit units and distributes symbols across logical PCS lanes. The complete lane mapping determines how a channel error event reaches Reed-Solomon symbols and codewords. Bit and symbol multiplexing below the PCS produce different error distributions.",
    count: (r: Rate, gen: LaneGen) => (gen === "200"
      ? "symbol multiplexed in the PMA (Clause 176)"
      : PCS_LANES[r] + " PCS lanes, bit multiplexed below"),
  },
  {
    id: "serialise", block: "pma", title: "Mapped onto physical lanes",
    shape: "phys",
    note: "The PMA maps logical streams onto the physical lanes of the selected interface. A PCS can support different physical lane counts through specified PMA mappings. The rate shown here is the coded electrical lane rate, not a universal optical PMD rate.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).phys + " electrical lanes at " + laneInfo(r, gen).laneRate,
  },
  {
    id: "pam4", block: "pmd", title: "Sent as PAM4 symbols",
    shape: "pam4",
    note: "PAM4 carries two bits per symbol using four levels. For equally spaced levels over the same amplitude range, adjacent-level separation is one-third of NRZ's. The optical PMD applies its own signaling requirements; an inner optical code adds overhead beyond the electrical lane rate. Switch to RX to follow recovery and correction.",
    count: (r: Rate, gen: LaneGen) => gen === "200" ? "optical baud depends on PMD and inner-FEC mode" : laneInfo(r, gen).baud + " in the 100G-class PAM4 example",
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
    note: "The receiver recovers timing and estimates the transmitted PAM4 symbols. Noise and channel impairments can cause wrong decisions. A hard decision selects among four levels; a soft-decision inner decoder can use finer-resolution information before the outer Reed-Solomon stage.",
    count: (r: Rate, gen: LaneGen) => gen === "200" ? "optical baud depends on PMD and inner-FEC mode" : laneInfo(r, gen).baud + " in the 100G-class PAM4 example",
  },
  {
    id: "rx-serialise", block: "pma", title: "Physical lanes recovered",
    shape: "phys",
    note: "The receive PMA recovers the serial streams and applies the specified demultiplexing. This reconstructs the logical streams expected above it. The displayed lane rate describes the selected electrical interface; the optical path can have additional processing and a different coded rate.",
    count: (r: Rate, gen: LaneGen) => laneInfo(r, gen).phys + " electrical lanes at " + laneInfo(r, gen).laneRate,
  },
  {
    id: "rx-align", block: "pcs", title: "Lanes deskewed and reordered",
    shape: "lanes",
    note: "The receiver finds alignment markers, identifies each logical lane and delays earlier-arriving streams to align them with later ones. It can then restore the symbol order needed by the outer decoder. Marker lock and alignment are prerequisites, not proof that the data is error-free.",
    count: (r: Rate, _gen: LaneGen) => PCS_LANES[r] ? PCS_LANES[r] + " PCS lanes realigned" : "logical lanes realigned; count unconfirmed here",
  },
  {
    id: "rx-fec", block: "fec", title: "Errors corrected",
    shape: "correct",
    note: "The outer Reed-Solomon decoder corrects up to fifteen erroneous symbols per codeword. More than fifteen exceed its guaranteed capacity; successful correction is not guaranteed. Detected failures are propagated under the PCS rules. In Clause 119's interleaved pair, both codewords' reconstructed blocks are marked bad.",
    count: (_r: Rate, gen: LaneGen) => gen === "200" ? "outer RS; applicable optical inner decoding occurs earlier" : "RS(544,514), up to 15 symbols repaired",
  },
  {
    id: "rx-am", block: "pcs", title: "Alignment markers removed",
    shape: "marker",
    note: "After lane reconstruction and outer FEC decoding, alignment-marker groups are removed from the reconstructed stream. The remaining scrambled blocks proceed to descrambling and reverse transcoding. Markers are PHY overhead, not fields delivered inside the Ethernet frame.",
    count: (_r: Rate, _gen: LaneGen) => "one marker per lane removed",
  },
  {
    id: "rx-descramble", block: "pcs", title: "Descrambled",
    shape: "scrambled",
    note: "The self-synchronous descrambler reconstructs the sequence needed to recover the original transcoded bits. A residual error at its input can affect several output bits. FEC decoding has already occurred, so PCS error propagation must account for this stage rather than rely on later FEC correction.",
    count: (_r: Rate, _gen: LaneGen) => "self-synchronous descrambling: x^58 + x^39 + 1",
  },
  {
    id: "rx-transcode", block: "pcs", title: "One block becomes four",
    shape: "block257",
    note: "Reverse transcoding restores four 66-bit blocks from each 257-bit representation. The indicator and encoded control information distinguish an all-data group from one containing control blocks. This preserves the data and control meanings needed by the interface decoder.",
    count: (_r: Rate, _gen: LaneGen) => "257 bits in, 264 out",
  },
  {
    id: "rx-decode", block: "pcs", title: "Blocks decoded",
    shape: "block66",
    note: "The PCS decodes valid data and control blocks into interface octets and control indications. A block's 64-bit payload is not always eight octets of frame data: control blocks have defined formats. Invalid blocks and propagated FEC failures produce error indications for the receiving interface.",
    count: (_r: Rate, _gen: LaneGen) => "data and control restored to the interface",
  },
  {
    id: "rx-frame", block: "mac", title: "Frame delivered to the MAC",
    shape: "octets",
    note: "The receiving MAC checks the frame, including its FCS and receive-error indications. Invalid frames are rejected according to the receive rules. FEC and frame checks provide strong protection, but neither establishes that undetected corruption is impossible.",
    count: (_r: Rate, _gen: LaneGen) => "frame validation and FCS check",
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
