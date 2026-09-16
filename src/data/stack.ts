// Auto-extracted verbatim from the original EthernetStack.jsx (DATA/RATE_META/etc.).
// Content is verified against research-brief.md - do not edit facts here.
/* eslint-disable */
import type { Rate, Dir, StackNode } from "../types";

export const RATES: Rate[] = ["400G", "800G", "1.6T"];

export const RATE_META: Record<Rate, { std: string; lanes: string; draft: boolean }> = {
  "400G": { std: "IEEE Std 802.3, Clause 119", lanes: "4 or 8 electrical lanes", draft: false },
  "800G": { std: "IEEE 802.3df-2024, Clause 172", lanes: "8 x 100G, or 4 x 200G (802.3dj)", draft: false },
  "1.6T": { std: "IEEE P802.3dj, Clause 175", lanes: "8 x 200G, or 16 x 100G", draft: true },
};

export const outline = (
  id: string, name: string, alias: string, clause: string, summary: string, dir?: Dir
): StackNode => ({
  id, name, alias, clause: { all: clause }, summary, dir: dir || "both", written: false,
});

export const DATA: Record<string, StackNode> = {
  /* ------------------------------------------------------------------ MAC */
  mac: {
    id: "mac", name: "MAC", alias: "Media Access Control", zone: "framing", written: true,
    clause: { "400G": "Clause 3, 4", "800G": "Clause 3, 4", "1.6T": "Clause 3, 4; 174 (draft)" },
    face: { "400G": "400 Gb/s", "800G": "800 Gb/s", "1.6T": "1.6 Tb/s" },
    summary: "Builds and checks frames. Deliberately unaware of the rate.",
    intro:
      "The MAC has changed less than anything else in Ethernet. It frames data, appends a frame check sequence, and enforces a minimum spacing between frames. It does not know whether it sits on four optical lanes or sixteen electrical ones.\n\nThat indifference is the whole architectural trick. A frame built by a 10 Mb/s MAC in 1990 and a frame built by a 1.6 Tb/s MAC have the same fields in the same order, so everything above the MAC survives every change below it. When a new speed is standardised, the MAC clause barely moves; the work is all in the PHY.\n\nWhat does change per rate is the [[inter-packet gap]] accounting, because the interface below the MAC is a parallel bus whose width does not divide neatly into arbitrary frame lengths.",
    terms: {
      "inter-packet gap": "The mandatory idle period between frames, specified as an average minimum of 12 octets (96 bit times). Individual gaps may be shorter, within bounded rules, provided the average holds.",
    },
    params: {
      "400G": [["MAC data rate", "400 Gb/s"], ["Interface below", "400GMII"], ["Minimum frame", "64 octets"], ["FCS", "CRC-32"], ["Minimum average IPG", "12 octets"]],
      "800G": [["MAC data rate", "800 Gb/s"], ["Interface below", "800GMII"], ["Minimum frame", "64 octets"], ["FCS", "CRC-32"], ["Minimum average IPG", "12 octets"]],
      "1.6T": [["MAC data rate", "1.6 Tb/s"], ["Interface below", "1.6TMII", { draft: true }], ["Minimum frame", "64 octets"], ["FCS", "CRC-32"], ["Minimum average IPG", "12 octets"]],
    },
    subs: [
      {
        id: "mac-frame", name: "Frame format and FCS", alias: "the octets on the wire", dir: "both", written: true,
        clause: { all: "Clause 3" },
        summary: "Preamble, addresses, type, payload, CRC-32.",
        intro:
          "A frame is a fixed sequence of fields. Seven octets of preamble and one start-of-frame delimiter get the receiver's attention, then six octets of destination address, six of source address, two of length or type, the payload, and four octets of frame check sequence.\n\nThe FCS is a 32-bit cyclic redundancy check computed over everything from the destination address through the end of the payload. It is the last line of defence, and it is why the PHY below is allowed to discard frames but never to deliver corrupted ones: a frame whose FCS fails is dropped, and the rules further down exist to make sure damaged frames actually fail that check rather than sneaking past it.",
        params: { all: [["Preamble", "7 octets"], ["Start of frame delimiter", "1 octet"], ["Destination address", "6 octets"], ["Source address", "6 octets"], ["Length / type", "2 octets"], ["Payload", "46 to 1500 octets, untagged"], ["FCS", "4 octets, CRC-32"], ["Minimum frame", "64 octets, excluding preamble and SFD"]] },
        sections: [
          {
            id: "mac-frame-min", name: "Why 64 octets",
            body:
              "The 64-octet minimum is a fossil. It comes from half-duplex CSMA/CD, where a frame had to stay on the wire long enough for a collision at the far end of the maximum-length segment to propagate back to the sender before transmission finished. Below that length a station could finish sending before learning it had collided.\n\nNothing about a modern full-duplex 400G link needs this. It survives because changing it would break the frame format that everything above depends on, and because the cost of padding short frames is small next to the cost of a flag day. It is the clearest example in Ethernet of a constraint that is kept for compatibility rather than for physics.",
            params: { all: [["Origin", "half-duplex collision detection"], ["Requirement", "frame longer than the round-trip slot time"], ["Still true today?", "physically no; architecturally yes"], ["Enforced by", "padding short payloads to 46 octets"]] },
          },
        ],
      },

      {
        id: "mac-ipg", name: "Inter-packet gap", alias: "the 12-octet rule", dir: "tx", written: true,
        clause: { all: "Clause 4.4.2" },
        summary: "An average minimum of 12 octets between frames.",
        intro:
          "Frames are separated by an idle period of at least twelve octets on average - 96 bit times. The gap exists to give receivers time to finish processing one frame and re-arm for the next, and it is part of the rate arithmetic, not a courtesy: the 12 octets are bandwidth you do not get to use.\n\nThe word **average** is doing real work in that sentence. Individual gaps are allowed to be shorter, under bounded rules, because the layer below cannot always place the next frame exactly where the MAC would like it. That mechanism lives in the Reconciliation Sublayer and is covered there.",
        params: { all: [["Minimum average IPG", "12 octets (96 bit times)"], ["Enforced as", "an average, not per-gap"], ["Reason for the gap", "receiver recovery between frames"], ["Consequence", "it counts against usable throughput"]] },
      },

      {
        id: "mac-rate", name: "Data rate versus goodput", alias: "where the headline number goes", dir: "both", written: true,
        clause: { all: "Clause 4" },
        summary: "What fraction of 400 Gb/s carries payload.",
        intro:
          "The headline rate is the MAC data rate, and payload is strictly less than that. Each frame carries 8 octets of preamble and SFD ahead of it and at least 12 octets of gap after it, so a 64-octet frame occupies 84 octets of wire time. That is 76 percent efficiency before you count the 18 octets of header and FCS inside the frame itself - of the 84 octets, only 46 are payload, about 55 percent.\n\nAt the other extreme, a 1500-octet payload occupies 1538 octets, which is about 97.5 percent. This is why benchmark numbers are always quoted with a frame size, and why small-frame line-rate performance is a much harder engineering claim than large-frame line-rate performance.\n\nNote that none of this counts PHY-layer overhead. The coding and FEC below have their own costs, but they are absorbed by running the line faster rather than by stealing MAC bandwidth - which is exactly why lane rates are odd numbers like 106.25 Gb/s rather than round ones.",
        params: { all: [["64-octet frame occupies", "84 octets of wire time"], ["Payload fraction", "46 / 84, about 55 percent"], ["1500-octet frame occupies", "1538 octets"], ["Payload fraction", "about 97.5 percent"], ["PHY overhead", "absorbed by a faster line rate, not by MAC bandwidth"]] },
        quiz: [
          {
            q: "Why does a 400G link never deliver 400 Gb/s of payload?",
            opts: ["FEC steals bandwidth from the MAC", "Preamble, gap, header and FCS all occupy wire time", "The PCS drops frames", "Clock tolerance reduces it"],
            a: 1,
            why: "The MAC rate is the frame rate including framing overhead and the gap. PHY coding overhead is handled separately by raising the line rate.",
          },
        ],
      },

      {
        id: "mac-flow", name: "Flow control", alias: "PAUSE and PFC", dir: "both", written: true,
        clause: { all: "Clause 31, Annex 31A, 31B; IEEE 802.1Qbb" },
        summary: "Telling a sender to stop, without dropping frames.",
        intro:
          "A receiver running out of buffer has two options: drop frames, or ask the sender to stop. **PAUSE** is the mechanism for asking. It arrived in 802.3x in 1997, and it is built on the MAC control frame defined in Clause 31, with opcodes in Annex 31A and the PAUSE frame format in Annex 31B.\n\nA PAUSE frame is a 64-octet MAC control frame carrying an opcode and a 16-bit pause duration. The duration is expressed in **quanta**, where one quantum is the time to transmit 512 bits at the current link speed - so the units scale with the link rather than being absolute. A duration of zero means resume immediately, which is how a sender is released early.\n\nThe fatal limitation is in the name of its successor. PAUSE stops **all** traffic on the link. That makes an Ethernet segment unsuitable for carrying flows with different quality-of-service needs, because pausing for one application stops everything.",
        params: { all: [["Defined in", "Clause 31, Annex 31A, Annex 31B"], ["Introduced by", "802.3x, 1997"], ["Frame", "64-octet MAC control frame"], ["EtherType", "0x8808"], ["Duration field", "16 bits, in quanta"], ["One quantum", "512 bit times at the current speed"], ["Duration zero", "resume"], ["Scope", "all traffic on the link"]] },
        sections: [
          {
            id: "mac-flow-quanta", name: "Quanta, and why max pause shrinks",
            body:
              "Because a quantum is 512 bit times rather than a fixed interval, the same numeric value means less time as the link gets faster. The maximum field value is 65,535 quanta, which is 65,535 × 512 = about 33.6 million bit times.\n\nConvert that to seconds and the effect is striking. At 400 Gb/s the longest possible pause is roughly 84 microseconds. At 800 Gb/s it is about 42, and at 1.6 Tb/s about 21. The mechanism was designed when links were three orders of magnitude slower, and its maximum hold time has been quietly shrinking ever since.\n\nIn practice implementations rarely try to compute a duration anyway. The common pattern is to pause for a large number of quanta and then send an explicit zero to resume - using PAUSE as an on/off signal rather than a timer.",
            params: {
              "400G": [["Max field value", "65,535 quanta"], ["In bit times", "about 33.6 million"], ["Max pause at this rate", "about 84 microseconds"]],
              "800G": [["Max field value", "65,535 quanta"], ["Max pause at this rate", "about 42 microseconds"]],
              "1.6T": [["Max field value", "65,535 quanta"], ["Max pause at this rate", "about 21 microseconds"]],
            },
            quiz: [
              {
                q: "Why does the maximum PAUSE duration get shorter at higher rates?",
                opts: ["The field got smaller", "A quantum is 512 bit times, so it represents less time as the link speeds up",
                       "FEC latency consumes it", "Faster links need shorter pauses by rule"],
                a: 1,
                why: "The unit is defined in bit times rather than seconds, so the same 65,535 quanta covers proportionally less wall-clock time as the bit rate rises.",
              },
            ],
          },
          {
            id: "mac-flow-pfc", name: "Priority Flow Control",
            body:
              "PFC, standardised as IEEE 802.1Qbb, keeps the same 64-octet control frame and extends the semantics to eight classes of service. The frame carries a **class enable vector** - one bit per priority - followed by a separate two-octet quanta value for each enabled class.\n\nSo instead of stopping the link, you stop priority 3 and leave the rest running. That is what makes lossless behaviour possible for one traffic class while other classes tolerate drops, and it is why PFC underpins storage and AI fabrics that assume a lossless medium.\n\nNote the layering: PFC is an 802.1 standard using an 802.3 frame format. Like MACsec, it sits beside this stack rather than inside it.",
            params: { all: [["Standard", "IEEE 802.1Qbb"], ["Frame", "the same 64-octet MAC control frame"], ["Classes", "8, from the 802.1p priority values"], ["Class enable vector", "8 bits, one per priority"], ["Per-class duration", "2 octets each, in quanta"], ["Enables", "lossless behaviour per class"]] },
            quiz: [
              {
                q: "What does PFC add over PAUSE?",
                opts: ["Longer pause durations", "Per-priority pausing, so one class can be stopped while others continue",
                       "Encryption of the control frame", "Automatic resume"],
                a: 1,
                why: "PAUSE is all-or-nothing for the link. PFC carries a class enable vector and a duration per class, so congestion in one traffic class does not stop the others.",
              },
            ],
          },
          {
            id: "mac-flow-timing", name: "Why the threshold is not 'buffer full'",
            body:
              "There is no value in sending PAUSE once the buffers are already full, because frames will be lost in the time it takes to act. The receiver has to predict.\n\nThe threshold has to allow for the PAUSE frame's own transmission time, the propagation delay of the link, the delay through both PHYs, the far end's response time, and the possibility that a maximum-length frame has just started transmitting and cannot be stopped. On a long link at high rate those terms add up to a meaningful amount of data in flight, and the headroom must cover all of it.\n\nThis is where PHY latency stops being an abstraction. Every nanosecond the PHY adds is buffer the receiver must reserve, which is one reason FEC latency and deskew buffer depth are argued over so carefully further down the stack.",
            params: { all: [["Must allow for", "PAUSE transmission time"], ["Plus", "link propagation delay"], ["Plus", "PHY delay at both ends"], ["Plus", "the far end's response time"], ["Plus", "a max-length frame already in flight"], ["Consequence", "PHY latency becomes reserved buffer"]] },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- RS */
  rs: {
    id: "rs", name: "Reconciliation Sublayer", alias: "RS, and the xxMII beneath it", zone: "framing", written: true,
    clause: { "400G": "Clause 81, 117", "800G": "Clause 81, 118", "1.6T": "Clause 174 (draft)" },
    face: { "400G": "400GMII", "800G": "800GMII", "1.6T": "1.6TMII" },
    summary: "Adapts the MAC to a fixed-width parallel interface.",
    intro:
      "The RS presents the MAC with something that still behaves like the classic media independent interface, and presents the PCS with a fixed-width parallel bus. It is a translator, and like most translators its interesting work is in the places where the two sides do not line up.\n\nThe main mismatch is alignment. Frames can be any whole number of octets, but the Start control character must appear in a fixed position on the parallel bus. Something has to absorb the difference, and that something is the [[deficit idle count]].\n\nThe RS is also where local and remote fault signalling lives, which makes it the answer to how a broken receive direction gets reported back to the far end.",
    terms: {
      "deficit idle count": "A counter in the RS tracking idle characters deleted or inserted to keep the Start character aligned, bounded so that the average inter-packet gap is preserved even though individual gaps vary.",
    },
    params: {
      "400G": [["Interface", "400GMII"], ["Carries", "data octets and control characters"], ["Alignment rule", "Start must land in a fixed lane"], ["Faults", "Local and Remote Fault ordered sets"]],
      "800G": [["Interface", "800GMII"], ["Faults", "Local and Remote Fault ordered sets"]],
      "1.6T": [["Interface", "1.6TMII", { draft: true }], ["Faults", "Local and Remote Fault ordered sets"]],
    },
    subs: [
      {
        id: "rs-mii", name: "The xxMII bus", alias: "data and control lanes", dir: "both", written: true,
        clause: { "400G": "Clause 81, 117", "800G": "Clause 81, 118", "1.6T": "Clause 174 (draft)" },
        summary: "A parallel bus of octet lanes, each with a control flag.",
        intro:
          "The media independent interface is a parallel bus carrying octets, each accompanied by a flag saying whether it is data or a control character. Idle, Start, Terminate and the ordered sets are all control characters on this bus.\n\nTwo placement rules matter, and the asymmetry between them is the source of everything on the next page. The **Terminate** character may appear in any lane, because a frame can end on any octet. The **Start** character must appear in a fixed lane - the first one. Frames are arbitrary lengths; the bus is a fixed width; so the gap between frames is where the two get reconciled.\n\nThe PCS above this bus encodes eight of these octets into each 66-bit block, which is why the interface width and the coding block size are related by design rather than coincidence.",
        params: { all: [["Carries", "octets plus data/control flags"], ["Control characters", "Idle, Start, Terminate, ordered sets"], ["Terminate", "may occur in any lane"], ["Start", "must occur in the first lane"], ["Consumed by", "the PCS, eight octets per 66-bit block"]] },
        quiz: [
          {
            q: "Why can Terminate appear in any lane but Start cannot?",
            opts: ["Terminate is higher priority", "Frames end on arbitrary octets, but the next frame must begin at a fixed bus position", "Start is not a control character", "It is an arbitrary rule"],
            a: 1,
            why: "Frame length is arbitrary so the end lands anywhere, but the receiver needs the frame start at a predictable position - so the idle between frames absorbs the difference.",
          },
        ],
      },

      {
        id: "rs-adapt", name: "Deficit idle count", alias: "keeping Start aligned without losing bandwidth", dir: "tx", written: true,
        clause: { all: "Clause 46.3.1.4, and equivalents at higher rates" },
        summary: "Insert or delete idles to align Start, and keep a running tally.",
        intro:
          "A frame ends wherever it ends. The next frame's Start must land in the first lane. So the RS has to insert or delete idle characters in the gap to push the Start into position - and if it only ever inserted, it would waste bandwidth, while if it only ever deleted, it would violate the 12-octet average.\n\nThe solution is a small counter. The **deficit idle count** is incremented when idle characters are deleted and decremented when they are inserted, and it is bounded, so the RS can only run a deficit so far before it must pay it back by inserting.\n\nIn the original 10 Gb/s specification the counter is bounded between **zero and three**, meaning up to three idles can be deleted at once - shrinking an individual gap from twelve octets to nine - but the deletions must be repaid, so the average holds at twelve. The counter resets only at initialisation and applies regardless of the gap the MAC asked for. Higher-rate Reconciliation Sublayers use the same technique; an implementation may use any equivalent method provided the result matches what DIC would produce.",
        params: { all: [["Incremented when", "idle characters are deleted"], ["Decremented when", "idle characters are inserted"], ["Bounds (10 Gb/s RS)", "0 to 3"], ["Effect", "individual gaps as short as 9 octets"], ["Preserved", "the 12-octet average"], ["Reset", "at initialisation only"], ["Alternatives", "any method with identical results is allowed"]] },
        sections: [
          {
            id: "rs-adapt-why", name: "Why not just always insert",
            body:
              "Always inserting idles would be simpler and would never violate the minimum gap. It would also permanently reduce the effective data rate, because every misalignment would cost extra idle time that is never recovered. For minimum-size frames, where misalignment happens constantly, the loss would be significant.\n\nThe deficit counter is the compromise: borrow bandwidth when alignment demands it, repay it when alignment permits. Over any window longer than a few frames the average gap is what the standard requires, while no individual frame pays much.",
            params: { all: [["Always insert", "simple, but permanently slower"], ["Always delete", "violates the average"], ["Deficit counter", "borrow and repay, bounded"]] },
            quiz: [
              {
                q: "The deficit idle count is bounded rather than free-running. Why?",
                opts: ["To limit counter width", "So deletions must be repaid and the average gap is preserved", "To synchronise with the PCS", "To detect faults"],
                a: 1,
                why: "An unbounded counter could delete idles indefinitely and drive the average gap below the specified minimum. The bound forces repayment.",
              },
            ],
          },
          {
            id: "rs-adapt-clock", name: "A second, separate mechanism",
            body:
              "Do not confuse alignment with clock compensation. They both insert and delete idles, and they are different functions with different counters.\n\nAlignment is about bus position and works octet by octet. Clock compensation is about two ends of a link running from independent oscillators with a tolerance between them: over time one side produces data slightly faster than the other consumes it, and idles must be removed or added to absorb the drift. That removal happens in larger units to stay compatible with the block structure below.\n\nThe practical consequence is that the gap you observe on a working link is the result of at least two mechanisms, which is why measured inter-frame spacing varies more than a naive reading of 'minimum 12 octets' would suggest.",
            params: { all: [["Alignment", "octet-level, to place Start correctly"], ["Clock compensation", "absorbs oscillator tolerance between ends"], ["Separate counters", "yes"], ["Observable effect", "measured gaps vary more than the minimum implies"]] },
          },
        ],
      },

      {
        id: "rs-fault", name: "Local and remote fault", alias: "LF and RF", dir: "both", written: true,
        clause: { "400G": "Clause 81.3.4", "800G": "Clause 81.3.4", "1.6T": "Clause 174 (draft)" },
        summary: "How a broken receive direction is reported back to the far end.",
        intro:
          "A link failure is usually one-directional. Your receiver goes dark, but your transmitter is fine - and the far end, whose transmitter is the broken part, sees perfectly good data coming back and has no idea anything is wrong. Fault signalling is how it finds out.\n\nThe mechanism is two ordered sets carried in the coded stream. When a sublayer detects a fault, the receive path sends **local fault** ordered sets up to the RS. The RS, on seeing local fault, stops sending MAC data and instead continuously transmits **remote fault** on its own transmit path. The far-end RS, on receiving remote fault, stops sending frames and transmits only idles.\n\nSo the two signals mean different things from the perspective of whoever is reading them. Local fault means \"my receive path is broken\". Remote fault means \"the other end is telling me my transmit path is broken\". Both bring the link down until the condition clears.\n\nFor 40G and above, this behaviour is specified in Clause 81.3.4 and follows the Clause 46 definition. One constraint worth knowing: Clause 81 link fault signalling supports **bidirectional operation only** - unlike the 10G lineage, it has no unidirectional mode.",
        params: {
          "400G": [["Specified in", "Clause 81.3.4, following Clause 46"], ["Local fault means", "a fault on my receive path"], ["Remote fault means", "the far end cannot receive from me"], ["On local fault, the RS", "stops MAC data, transmits remote fault"], ["On remote fault, the RS", "stops frames, sends only idles"], ["Unidirectional operation", "not supported"], ["Status exposed via", "MDIO registers, Clause 45"]],
          "800G": [["Specified in", "Clause 81.3.4"]],
          "1.6T": [["Specified in", "Clause 174", { draft: true }]],
        },
        sections: [
          {
            id: "rs-fault-limits", name: "What it cannot tell you",
            body:
              "LF and RF localise a fault to \"somewhere between the two Reconciliation Sublayers\", and no further. They do not identify which sublayer failed.\n\nThat gap was recognised early and argued over during the 10 Gb/s work. The awkward case is a far-end fault in, say, the PCS: it presents to you as a **local** fault, because from your side the symptom is that your receive path is broken - while the far end reports nothing wrong at all. An operator can then spend a long time running diagnostics on equipment that is working correctly.\n\nThe resolution is that fault signalling is a link-state mechanism, not a diagnostic one. Localisation comes from the **MDIO registers** in Clause 45, where each sublayer reports its own status, so management can walk the stack and find which one is unhappy. If you take one practical thing from this page: when you see local fault, the fault is probably not local.",
            params: { all: [["Resolution of LF/RF", "somewhere between the two RSs"], ["Cannot identify", "which sublayer failed"], ["Awkward case", "a far-end fault appears to you as local fault"], ["Localisation tool", "per-sublayer MDIO status, Clause 45"], ["Rule of thumb", "local fault rarely means the fault is local"]] },
            quiz: [
              {
                q: "You see local fault and the far end reports nothing wrong. What is the likely situation?",
                opts: ["Your own transmitter has failed", "Something in the path toward you has failed, which the far end cannot detect",
                       "The link is fine", "Both ends have failed"],
                a: 1,
                why: "Local fault means your receive path is broken. The far end is transmitting into that broken path and is receiving your good data, so it has no symptom to report.",
              },
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ PCS */
  pcs: {
    id: "pcs", name: "PCS", alias: "Physical Coding Sublayer", zone: "coding", written: true,
    clause: { "400G": "Clause 119", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
    face: { "400G": "16 PCS lanes", "800G": "two flows", "1.6T": "two flows" },
    summary: "Codes the stream, marks it, and splits it across lanes.",
    intro:
      "The PCS turns one fast stream of octets into something that can survive being sent across many independent lanes and reassembled at the far end. Five steps in a fixed order: code the data so the receiver can tell data from control, transcode to shrink that overhead and make room for error correction, scramble so the line has transitions and no sustained DC imbalance, insert periodic markers so lanes can be identified and deskewed, then distribute across [[PCS lanes]].\n\nThe lane count is a PCS decision pushed downward, not an optical decision pushed up. The PCS produces a fixed number of lanes and the PMA maps however many exist onto however many physical lanes the medium has. That is why one 400G PCS drives four lanes of parallel single-mode or eight lanes of multimode with nothing above it changing.\n\nOne structural note that trips people up: the 800G and 1.6T PCSs run **two flows** rather than one wider pipeline. At 800G, flow 0 carries the even encoded 4×66-bit blocks and flow 1 carries the odd ones. Each flow is close enough to a 400G PCS that the standard reuses the Clause 119 machinery rather than inventing new logic.\n\nAlso worth knowing early: the standard places the [[RS-FEC]] inside the PCS clause at these rates, while vendor block diagrams usually draw PCS and FEC as separate boxes. Both are defensible; they answer different questions.",
    terms: {
      "PCS lanes":
        "A logical lane created by the PCS. The count is fixed per rate and chosen so that it divides evenly by every supported physical lane count, which is what makes one PCS reusable across many PMDs.",
      "RS-FEC":
        "Reed-Solomon forward error correction. At 400G it is specified inside Clause 119 rather than as a separate clause, though it is a distinct function.",
    },
    params: {
      "400G": [
        ["PCS lanes", "16 (8 for 200GBASE-R)"],
        ["Coding", "64B/66B, then 256B/257B"],
        ["Scrambler", "x^58 + x^39 + 1, applied after transcoding"],
        ["FEC codewords", "2, interleaved 10 bits at a time"],
        ["Distribution", "one 10-bit symbol per lane, lowest to highest"],
      ],
      "800G": [
        ["Flows", "2 (flow 0 even blocks, flow 1 odd)"],
        ["Alignment markers", "32"],
        ["FEC codewords", "4"],
        ["PCS lanes", "32", { inferred: true }],
        ["Multiplexing below", "32:8 restricted bit-level (Clause 173)"],
      ],
      "1.6T": [
        ["PCS clause", "175", { draft: true }],
        ["Flows", "2", { draft: true }],
        ["FEC messages", "Ma, Mb, Mc, Md", { draft: true }],
        ["PCS lane count", "not confirmed - see the distribution page", { draft: true }],
      ],
    },
    subs: [
      /* ---------------- 64B/66B ---------------- */
      {
        id: "pcs-6466", name: "64B/66B encoding", alias: "line coding", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "64 bits of payload plus a two-bit header that says data or control.",
        intro:
          "Every 64 bits of data acquires a two-bit sync header, making a 66-bit block. The header is the entire point: 01 means the remaining 64 bits are all data, 10 means this is a control block whose first octet is a block type field. 00 and 11 never occur legally, and that illegality is how a receiver detects it has locked onto the wrong bit boundary.\n\nThe overhead is 2 bits in 66, about 3.125 percent. That was acceptable at 10G where this coding originated and is not acceptable at 400G, because forward error correction needs overhead of its own and the total has to fit inside what the optics and the [[baud rate]] can carry. That pressure is what the next stage exists to relieve.",
        terms: { "baud rate": "Symbols per second on the line, as distinct from bits per second. PAM4 carries two bits per symbol, so a 106.25 Gb/s lane runs at 53.125 GBd." },
        params: { all: [["Block", "66 bits"], ["Payload", "64 bits"], ["Overhead", "3.125 percent"], ["Data header", "01"], ["Control header", "10"], ["Illegal", "00 and 11"]] },
        sections: [
          {
            id: "pcs-6466-struct", name: "Block structure",
            body:
              "Bits 1 and 2 are the sync header. Bits 3 to 66 are the payload. In a data block the payload is eight octets of data, straight through, unmodified. In a control block the first octet of the payload is a block type field, and the interpretation of the remaining seven octets depends on it.\n\nThe header carries no error protection of its own. It survives because it is checked for legality, because FEC below corrects most errors before this layer sees them, and because persistent header violations cause a loss of block lock rather than being quietly accepted.",
            params: { all: [["Bits 1-2", "sync header"], ["Bits 3-66", "payload, 8 octets"], ["Control block", "first payload octet is block type"], ["Header protection", "none; legality-checked"]] },
          },
          {
            id: "pcs-6466-control", name: "Control blocks and ordered sets",
            body:
              "Control blocks carry everything that is not data: idle, error, start and terminate of a frame, and ordered sets used for signalling such as local and remote fault. The block type field distinguishes them.\n\nThis is the mechanism behind a fact that matters on the receive side: when an uncorrectable FEC codeword is detected, the PCS marks the affected blocks as error blocks. There is nowhere else in the stack such a marker could live, which is why the coding and the error-marking rules are specified together.",
            params: { all: [["Carried as", "control blocks, header 10"], ["Examples", "idle, error, start, terminate, ordered sets"], ["Selector", "block type field"], ["Used by", "fault signalling and error marking"]] },
          },
          {
            id: "pcs-6466-lock", name: "Illegal headers and block lock",
            body:
              "A receiver that does not yet know where blocks begin guesses a boundary and tests it. If the guess is wrong, sync headers land on arbitrary bit pairs and 00 and 11 appear at roughly the rate chance predicts. Enough violations and the receiver shifts its guess and tries again; enough clean blocks and it declares lock.\n\nIn practice, a link that cannot achieve lock is rarely suffering a subtle coding problem. It is usually receiving something structurally wrong: the wrong rate, the wrong lane count, or nothing at all.",
            params: { all: [["Hunt", "shift boundary, re-test"], ["Evidence of error", "00 or 11 headers"], ["Declares", "block lock"], ["Typical real cause", "rate or lane-count mismatch"]] },
            quiz: [
              {
                q: "A receiver sees 00 and 11 sync headers at about the rate chance would predict. What is happening?",
                opts: ["FEC has failed", "It has not found the block boundary", "The scrambler is misconfigured", "Lane skew exceeds the budget"],
                a: 1,
                why: "Random-looking illegal headers are the signature of testing a wrong boundary. A real coding fault would show a pattern rather than chance statistics.",
              },
            ],
          },
        ],
        quiz: [
          {
            q: "Why did 3.125 percent overhead stop being acceptable at 400G?",
            opts: ["Encoders cannot run that fast", "FEC needs overhead too, and the total must fit the baud rate", "Control blocks become ambiguous", "It breaks the scrambler"],
            a: 1,
            why: "FEC is mandatory at these rates and its parity also costs overhead. Something has to give, which is why 66-bit blocks are transcoded down before FEC is applied.",
          },
        ],
      },

      /* ---------------- 256B/257B ---------------- */
      {
        id: "pcs-257", name: "256B/257B transcoding", alias: "making room for FEC", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.2", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Four 66-bit blocks compressed into one 257-bit block.",
        intro:
          "Four consecutive 66-bit blocks carry eight sync-header bits between them. Transcoding replaces those eight bits with one leading bit plus, where needed, positional information, producing 257 bits where there were 264. Overhead falls from 3.125 percent to about 0.39 percent, and the recovered room is spent on Reed-Solomon parity.\n\nIt is lossless and exactly reversible. The receiver runs the inverse after FEC decoding, and no information about the original four blocks is lost in either direction.\n\nThe 257-bit block is the unit that everything downstream counts in. FEC messages are whole numbers of them, alignment marker groups are sized in them, and insertion periods are quoted in them.",
        params: { all: [["Input", "4 x 66 bits = 264"], ["Output", "257 bits"], ["Overhead before", "3.125 percent"], ["Overhead after", "0.39 percent"], ["Reversible", "exactly"]] },
        sections: [
          {
            id: "pcs-257-lead", name: "The leading bit",
            body:
              "Bit 1 of the 257-bit block says whether all four source blocks were data blocks. If it says yes, nothing further is needed and the remaining 256 bits are the four 64-bit payloads laid end to end. This is the overwhelmingly common case, and the encoding is built so the common case costs one bit.",
            params: { all: [["Bit 1 set", "all four were data blocks"], ["Then", "256 bits are four payloads"], ["Frequency", "the common case"]] },
          },
          {
            id: "pcs-257-control", name: "When control blocks are present",
            body:
              "If any of the four source blocks was a control block, the encoding records which positions were control and relocates their block type information into the space freed by removing the sync headers. Reconstruction is unambiguous: the receiver reads the flags, learns which positions were control, and rebuilds all four 66-bit blocks exactly.\n\nSo transcoding needs no escape hatch for control-heavy traffic. A stream of pure idle transcodes as happily as a stream of pure data.",
            params: { all: [["Flagged", "which of the four were control"], ["Relocated", "block type fields"], ["Reconstruction", "exact, unambiguous"], ["Works for", "any mix of data and control"]] },
          },
          {
            id: "pcs-257-order", name: "Transcode before scramble",
            body:
              "For 200G and 400G the transcoding happens before scrambling, which simplifies the transcoder. The 100G-era design in 802.3bj scrambled first. If you are reading a 100G block diagram beside a 400G one, that swap is a real difference and not a drafting error.\n\nIt also has a consequence on the receive side. Because scrambling is applied after transcoding, descrambler error propagation lands inside transcoded blocks, which is part of why the error-marking rules after an uncorrectable codeword extend past the codeword itself.",
            params: { all: [["200G and 400G onward", "transcode, then scramble"], ["100G era (802.3bj)", "scramble, then transcode"], ["Reason", "simpler transcoder"]] },
          },
        ],
        quiz: [
          {
            q: "What is the recovered overhead spent on?",
            opts: ["Higher goodput", "Reed-Solomon parity", "Alignment markers", "Larger inter-packet gaps"],
            a: 1,
            why: "Transcoding does not increase goodput. It buys room, and the room goes to FEC parity so the link can tolerate a far worse pre-FEC error rate.",
          },
        ],
      },

      /* ---------------- scrambler ---------------- */
      {
        id: "pcs-scramble", name: "Scrambling", alias: "self-synchronous scrambler", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.3", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Randomises the stream for transitions and DC balance.",
        intro:
          "A receiver recovers its clock from transitions in the incoming signal. A long run of identical symbols starves it, and a sustained DC imbalance drags the decision thresholds around, which is [[baseline wander]]. The scrambler prevents both by combining data with the output of a shift register, using a self-synchronous polynomial so the receiver needs no seed and no handshake: it runs the inverse register and converges.\n\nThe polynomial is x⁵⁸ + x³⁹ + 1, and it is applied after transcoding.",
        terms: { "baseline wander": "Slow drift in the average signal level caused by sustained imbalance between high and low symbols, which shifts the receiver's decision thresholds and closes the eye." },
        params: {
          "400G": [["Polynomial", "x^58 + x^39 + 1"], ["Type", "self-synchronous"], ["Applied to", "all 257 bits of each block"], ["Position", "after transcoding"], ["Not scrambled", "the alignment marker group"]],
          "800G": [["Type", "self-synchronous"], ["Flows", "2, scrambled per flow"], ["Position", "after transcoding"]],
          "1.6T": [["Flows", "2", { draft: true }], ["Position", "after transcoding", { draft: true }]],
        },
        sections: [
          {
            id: "pcs-scramble-257", name: "Why bit 257 is scrambled",
            body:
              "Bit 257 is a flag rather than payload, so leaving it alone is tempting. Its statistics are the problem: through long runs of all-data blocks it holds a constant value, and that regularity would appear on the line as periodic structure at a very predictable frequency - exactly the kind of spectral line the scrambler exists to remove. So it is included.",
            params: { all: [["Nature", "flag bit, not payload"], ["Problem", "constant through all-data runs"], ["If omitted", "reduced randomness, periodic content"], ["Decision", "scramble it"]] },
          },
          {
            id: "pcs-scramble-mult", name: "Error multiplication",
            body:
              "Self-synchronous descrambling has a cost. An errored bit re-enters the shift register, so one channel bit error emerges as a short burst after descrambling.\n\nThis is not a curiosity. It is why, after an uncorrectable codeword, the standard requires marking blocks beyond the codeword itself when the stateless decoder is used - the damage propagates into the next transcoded block through the descrambler. Some of the burstiness the FEC must handle is manufactured inside the PHY rather than by the channel.",
            params: { all: [["Cause", "errored bit re-enters the register"], ["Effect", "one error becomes a short burst"], ["Consequence", "error marking extends past the codeword"], ["Absorbed by", "FEC burst tolerance"]] },
          },
        ],
        quiz: [
          {
            q: "Why use a self-synchronous scrambler rather than one needing a seed exchange?",
            opts: ["Better randomisation", "The receiver converges with no handshake", "It avoids error multiplication", "FEC requires it"],
            a: 1,
            why: "No seed negotiation is needed; the receiver runs the inverse register and locks on. The price is error multiplication, accepted because FEC is sized for bursts anyway.",
          },
        ],
      },

      /* ---------------- alignment markers ---------------- */
      {
        id: "pcs-am", name: "Alignment markers", alias: "AM insertion", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.4", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Per-lane fingerprints for identification, deskew and monitoring.",
        intro:
          "Once the stream is split across lanes and sent over separate fibres or traces, three things go wrong that the receiver must undo. Lanes arrive out of order, because nothing guarantees which fibre carries which logical lane. They arrive skewed, because path lengths and equaliser latencies differ. And the receiver does not know where block boundaries sit. Alignment markers address all three.\n\nFor 400GBASE-R the marker for each lane is a 120-bit field with common elements and lane-unique elements. The markers for all 16 lanes are sent together as an [[alignment marker group]].",
        terms: {
          "lane skew": "The arrival-time spread between lanes carrying one logical stream. The standard specifies maximum skew and skew variation, and the deskew buffer is sized from those numbers.",
          "alignment marker group": "The set of per-lane markers sent together, plus padding and status, sized to a whole number of 257-bit blocks so it fits the downstream arithmetic cleanly.",
        },
        params: {
          "400G": [
            ["Markers per group", "16, one per PCS lane"],
            ["Marker field", "120 bits per lane"],
            ["Group composition", "16 markers + 133-bit pad + 3-bit status"],
            ["Group size", "equivalent of eight 257-bit blocks"],
            ["Pad", "free-running PRBS9, x^9 + x^5 + 1"],
            ["Scrambled?", "no - the group is not scrambled"],
            ["Insertion period", "every 163,840 x 257-bit blocks"],
          ],
          "800G": [["Markers", "32"], ["Per flow", "marker encodings defined for flow 0 and flow 1"], ["Elements", "15 per marker"]],
          "1.6T": [["Structure", "not yet confirmed", { draft: true }]],
        },
        sections: [
          {
            id: "pcs-am-parts", name: "Common and unique parts",
            body:
              "The marker has elements identical on every lane and elements that differ per lane, because it solves two different problems. You cannot identify a lane using a pattern that is the same everywhere, and you cannot reliably hunt for a boundary using a pattern that changes per lane. The common part gives boundary and presence; the unique part gives identity.",
            params: { all: [["Common elements", "boundary and lane presence"], ["Unique elements", "which lane this is"], ["Field size", "120 bits per lane at 400G"]] },
          },
          {
            id: "pcs-am-group", name: "The marker group",
            body:
              "The markers are not sprinkled through the stream individually. At 400G all sixteen are sent together, followed by a 133-bit pad and a 3-bit status field, and the whole thing is sized to exactly eight 257-bit blocks so it drops into the downstream arithmetic without remainder. The group is aligned to the start of two FEC messages.\n\nThree properties of the group are worth holding onto. It is **not scrambled**. It does not follow the normal encoding rules. And the pad is a free-running PRBS9 sequence, generated by x⁹ + x⁵ + 1 with any non-zero seed, which is ignored on receive.\n\nRoom for the group is created by **deleting idles** rather than by speeding the line up. That is why inserting markers does not change the signalling rate.",
            params: { all: [["Composition", "16 markers + 133-bit pad + 3-bit status"], ["Size", "eight 257-bit blocks"], ["Pad", "PRBS9, x^9 + x^5 + 1, any non-zero seed"], ["Scrambling", "none"], ["Aligned to", "the start of two FEC messages"], ["Room made by", "deleting idles"]] },
          },
          {
            id: "pcs-am-period", name: "How often markers appear",
            body:
              "At 400GbE the marker group appears every 163,840 × 257-bit blocks. That number looks arbitrary until you divide: each FEC message is 20 × 257-bit blocks, so 163,840 blocks is exactly 8192 codewords. The same interval is used as the measurement window for the high-symbol-error-rate indicator, which is why no separate counter is needed for it.\n\nFor 200GbE the period is half that, 81,920 blocks, or 4096 codewords.\n\nOne caveat: an early P802.3bs draft excerpt quotes 81,920 for 400GBASE-R. The published figure and the codeword arithmetic both give 163,840, so that is what is stated here, but it is worth verifying against the current published clause if you are designing to it.",
            params: {
              "400G": [["Period", "163,840 x 257-bit blocks"], ["In codewords", "8192"], ["200GbE period", "81,920 blocks = 4096 codewords"], ["Also used as", "the hi_ser measurement window"]],
              "800G": [["Window", "8192 codewords per 400G flow, results OR'd"]],
              "1.6T": [["Window", "8192 codewords", { draft: true }]],
            },
          },
          {
            id: "pcs-am-monitor", name: "Per-lane monitoring",
            body:
              "Because markers are per-lane and periodic, they give the receiver a natural place to hang per-lane error statistics. That is what turns a link from reporting 'unhealthy' into reporting 'lane 11 is unhealthy', and it is the single most useful diagnostic in a high-speed Ethernet PHY.\n\nMarkers are processed **before** FEC correction, since deskew and reorder must happen before codewords can be reassembled. Marker lock therefore has to tolerate bit errors in the markers themselves, and it does.",
            params: { all: [["Processed", "before FEC correction"], ["Implication", "marker lock tolerates some errored bits"], ["Gives", "per-lane rather than per-link visibility"], ["Lock processes", "one per lane, independent (16 at 400G)"]] },
          },
        ],
        quiz: [
          {
            q: "Which of these can alignment markers not do?",
            opts: ["Identify which logical lane a physical lane carries", "Measure inter-lane skew", "Correct bit errors in the payload", "Establish block boundaries"],
            a: 2,
            why: "Markers identify, align and monitor. Correction belongs to FEC - and in fact markers are processed before FEC correction, so they must survive errors rather than fix them.",
          },
          {
            q: "Inserting markers adds data to the stream. Why does the line rate not rise?",
            opts: ["The markers replace deleted idles", "The scrambler compresses them", "They are sent out of band", "The FEC parity shrinks to compensate"],
            a: 0,
            why: "Room is made by deleting idle characters, or not inserting them in the first place, so the marker group costs no additional bandwidth.",
          },
        ],
      },

      /* ---------------- distribution ---------------- */
      {
        id: "pcs-dist", name: "Pre-FEC distribution", alias: "splitting into FEC messages and lanes", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.5", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "One stream becomes two FEC messages, then many lanes.",
        intro:
          "This step is often drawn as a single arrow, and it is really two distinct operations. First the scrambled, marked stream is split into FEC messages. Then, after encoding, the resulting codewords are interleaved and dealt out to the PCS lanes.\n\nBoth are round-robin, and both operate at 10-bit granularity, because 10 bits is one Reed-Solomon symbol.",
        params: {
          "400G": [
            ["Input group", "40 x 257-bit blocks"],
            ["Split", "10-bit round robin into two messages"],
            ["Message size", "5140 bits each (mA, mB)"],
            ["Then", "RS(544,514) encode each"],
            ["Interleave", "the two codewords, 10 bits at a time"],
            ["Distribute", "one 10-bit symbol per PCS lane, lowest to highest"],
            ["PCS lanes", "16 (8 for 200GBASE-R)"],
          ],
          "800G": [["Flows", "2"], ["Codewords", "4"], ["Multiplexing below", "32:8 restricted bit-level (Clause 173)"]],
          "1.6T": [["Messages", "Ma, Mb, Mc, Md", { draft: true }], ["Flows", "2", { draft: true }], ["Below", "Clause 176 symbol-multiplexing PMA", { draft: true }]],
        },
        sections: [
          {
            id: "pcs-dist-arith", name: "The arithmetic, exactly",
            body:
              "At 400G the PCS takes a group of **40 × 257-bit blocks** and distributes it on a **10-bit round-robin** basis into two **5140-bit** messages, mA and mB. Those are then encoded by RS(544,514) into codeword A and codeword B.\n\nThe numbers close three ways, which is a good sign you have understood it rather than memorised it. 40 × 257 = 10,280 bits in, split into two 5140-bit messages. Each message is 514 symbols × 10 bits = 5140. And 5140 = 20 × 257, so each message is exactly twenty transcoded blocks. Nothing is left over anywhere, which is why the 257-bit block and the 10-bit symbol were chosen to fit each other.",
            params: { all: [["Group in", "40 x 257 = 10,280 bits"], ["Messages out", "2 x 5140 bits"], ["5140 =", "514 symbols x 10 bits"], ["5140 =", "20 x 257-bit blocks"], ["Granularity", "10 bits, one RS symbol"]] },
            quiz: [
              {
                q: "Why is an RS message exactly 5140 bits?",
                opts: ["It is an arbitrary round number", "It is both 514 ten-bit symbols and twenty 257-bit blocks", "It matches the alignment marker size", "It is the widest the encoder can handle"],
                a: 1,
                why: "The message length was chosen so the Reed-Solomon symbol count and the transcoded block count both divide it exactly, leaving no remainder between the coding and FEC layers.",
              },
            ],
          },
          {
            id: "pcs-dist-interleave", name: "Interleaving and lane distribution",
            body:
              "Once encoded, the two codewords are interleaved on a 10-bit basis, then distributed to the PCS lanes one 10-bit symbol at a time, from the lowest-numbered lane to the highest. The result is that consecutive symbols on any one lane come alternately from the two codewords.\n\nThat matters for a reason covered under FEC: damage concentrated in one lane is shared between two codewords rather than destroying one, and each codeword has its own fifteen-symbol budget.",
            params: { all: [["Interleave", "10-bit basis, two codewords"], ["Distribution", "one symbol per lane, ascending"], ["Effect", "lane damage is split across both codewords"]] },
          },
          {
            id: "pcs-dist-div", name: "Why the lane count divides",
            body:
              "Sixteen PCS lanes at 400G maps cleanly onto 16, 8, 4, 2 or 1 physical lanes. That single arithmetic property is why one PCS definition serves DR4, FR4, LR4, SR8 and CR4 without modification. The design rule is that the number of PCS lanes is the least common multiple of the expected optical and electrical interface widths.\n\nThe key property is that all bits from one PCS lane follow the same physical path no matter how the multiplexing is arranged. A PCS lane is never split across two fibres.",
            params: {
              "400G": [["PCS lanes", "16"], ["Divides by", "16, 8, 4, 2, 1"], ["Rule", "least common multiple of interface widths"], ["Guarantee", "one PCS lane never splits across physical paths"]],
              "800G": [["Multiplexing", "32:8 restricted bit-level"], ["Clause", "173"]],
              "1.6T": [["PMA", "Clause 176 symbol multiplexing", { draft: true }], ["Variants", "16:8 and 16:16 PMAs defined", { draft: true }]],
            },
          },
        ],
      },

      /* ---------------- RX: lock and deskew ---------------- */
      {
        id: "pcs-lock", name: "Alignment lock and lane deskew", alias: "finding the markers", dir: "rx", written: true,
        clause: { "400G": "Clause 119.2.5", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Locate markers, identify lanes, remove relative delay.",
        intro:
          "This is the first real intelligence in the receive path and where most bring-up problems announce themselves. Each lane runs its own independent alignment-marker lock process - sixteen of them at 400G. Finding the common marker elements repeatedly at the expected period gives boundary and presence; the unique elements give the lane number. Then offsets are measured and each lane is buffered until the markers line up.\n\nBecause all of this happens before FEC correction, the lock process must work on data that still contains errors. It is specified to tolerate mismatches in some marker bits rather than demanding an exact match.",
        params: {
          "400G": [["Lock processes", "16, one per lane, independent"], ["Uses", "common elements, then unique elements"], ["Runs", "before FEC correction"], ["Tolerates", "some errored bits in the marker"]],
          "800G": [["Markers", "32"], ["Lock", "per lane, independent"]],
          "1.6T": [["Detail", "not yet confirmed", { draft: true }]],
        },
        sections: [
          {
            id: "pcs-lock-debug", name: "Reading the failure",
            body:
              "One lane failing to lock while the others lock cleanly points at that lane's own physical path: its fibre, connector, trace or equaliser. Every lane failing points at something common: a rate mismatch, a lane-count mismatch, a configuration error, or a far end that is not sending what you believe it is.\n\nThis single distinction resolves a large fraction of real link problems before any instrument is attached.",
            params: { all: [["One lane fails", "that lane's physical path"], ["All lanes fail", "rate, lane count, config, or far end"], ["Value", "narrows the search before instrumenting"]] },
            quiz: [
              {
                q: "Fifteen of sixteen lanes achieve lock. Where do you look?",
                opts: ["PCS configuration", "The failing lane's physical path", "The far-end MAC", "The scrambler polynomial"],
                a: 1,
                why: "A configuration fault would affect all lanes. Isolation to one lane points at that lane's fibre, connector, trace or equaliser.",
              },
            ],
          },
          {
            id: "pcs-lock-buffer", name: "The deskew buffer",
            body:
              "Depth is set by the worst-case skew the receiver must tolerate plus its allowed variation - not by the lane count and not by the codeword length. Deeper costs latency and area, which is why the limit is specified rather than left to implementers: it has to be interoperable across vendors who each consume part of the budget.\n\nThe specific skew budget numbers are not yet researched here and are deliberately not quoted.",
            params: { all: [["Depth set by", "worst-case specified skew plus variation"], ["Cost of depth", "latency and area"], ["Why specified", "the budget is shared across vendors"]] },
          },
        ],
      },

      /* ---------------- RX: reorder ---------------- */
      {
        id: "pcs-reorder", name: "Lane reorder and de-interleave", alias: "putting it back in order", dir: "rx", written: true,
        clause: { "400G": "Clause 119.2.5", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Restore logical order and undo interleaving before decode.",
        intro:
          "Because identity came from the markers rather than the wiring, lanes can be put back into logical order regardless of which physical lane carried which. That is what lets a cable be assembled with lanes in any order, and it is deliberate rather than lucky.\n\nOnce the lanes are aligned, deskewed and reordered, the two interleaved codewords are de-interleaved to reconstruct the original codeword stream, and only then can the Reed-Solomon decoder run.",
        params: { all: [["Input", "deskewed, identified lanes"], ["Output", "reassembled codewords"], ["Enables", "arbitrary physical lane order"], ["Order", "align, deskew, reorder, de-interleave, decode"]] },
        sections: [
          {
            id: "pcs-reorder-fail", name: "Why failure here is loud",
            body:
              "A misordered lane does not degrade performance slightly. It produces codewords that fail to decode at all. That is convenient: the symptom is unambiguous and cannot be mistaken for marginal signal integrity. If a link is failing gradually, reorder is not the problem.",
            params: { all: [["Symptom", "codewords fail wholesale"], ["Not", "gradual degradation"], ["Diagnostic value", "rules itself in or out immediately"]] },
          },
        ],
      },

      /* ---------------- RX: decode ---------------- */
      {
        id: "pcs-decode", name: "Reverse transcode and decode", alias: "unwinding the coding", dir: "rx", written: true,
        clause: { "400G": "Clause 119.2.5", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Descramble, expand back to 66-bit blocks, hand octets up.",
        intro:
          "The receive path mirrors transmit in reverse: markers removed, stream descrambled, each 257-bit block expanded into four 66-bit blocks, those decoded into data and control.\n\nWhat makes this page worth reading is not the reversal but what happens when FEC has failed, because the rules are more specific than 'mark it bad'.",
        params: { all: [["Order", "remove markers, descramble, reverse transcode, decode"], ["On uncorrectable", "blocks marked EBLOCK_R"], ["Marker used", "sync header set to 11"], ["Upstream effect", "FCS failure at the MAC"]] },
        sections: [
          {
            id: "pcs-decode-eblock", name: "How an uncorrectable codeword is marked",
            body:
              "If a codeword contains errors that were not corrected, the PCS sets every 66-bit block within the **two associated interleaved codewords** to an error block. Not just the failed codeword - both, because they were interleaved and the receiver cannot cleanly separate the damage.\n\nThe marking may be done by setting the sync header to **11** for all 66-bit blocks produced from those codewords, which is one of the two illegal header values. The illegality is the mechanism: an illegal header cannot be mistaken for data.\n\nThere is a further rule when the stateless 64B/66B decoder is used: the **first four 66-bit blocks following** the uncorrected codewords must also be marked. Those four blocks are the next transcoded block, and they are contaminated by descrambler error propagation.",
            params: { all: [["Scope", "both interleaved codewords, not just one"], ["Mechanism", "sync header set to 11 (EBLOCK_R)"], ["Stateless decoder", "also mark the following four 66-bit blocks"], ["Reason for the extra four", "descrambler error propagation"]] },
            quiz: [
              {
                q: "One of two interleaved codewords is uncorrectable. What gets marked?",
                opts: ["Only the failed codeword", "Both codewords' blocks", "Only the parity symbols", "The whole alignment marker period"],
                a: 1,
                why: "The two codewords were interleaved, so the damage cannot be cleanly attributed. Both are marked bad.",
              },
              {
                q: "Why must four extra 66-bit blocks be marked with the stateless decoder?",
                opts: ["To pad the codeword", "Descrambler error propagation contaminates the next transcoded block", "To trigger a link reset", "Because the FEC parity spans them"],
                a: 1,
                why: "Self-synchronous descrambling carries the error forward into the next 257-bit block, which expands into four 66-bit blocks.",
              },
            ],
          },
          {
            id: "pcs-decode-principle", name: "Lose frames, never corrupt them",
            body:
              "An Ethernet link is permitted to lose frames. It is not permitted to deliver a corrupted frame as though it were good, because everything above will trust it. The error block is how an uncorrectable FEC event becomes an FCS failure at the MAC instead of wrong data in application memory.\n\nThis principle explains design choices throughout the stack that otherwise look excessively cautious, and it connects directly to the decoder mis-detection bound under FEC.",
            params: { all: [["Permitted", "frame loss"], ["Not permitted", "silent corruption"], ["Mechanism", "error block into FCS failure"], ["Related", "decoder mis-detection bound, under FEC"]] },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ FEC */
  fec: {
    id: "fec", name: "RS-FEC", alias: "commonly called KP4; plus an Inner FEC at 200G per lane", zone: "coding", written: true,
    clause: { "400G": "Clause 119 (within the PCS)", "800G": "Clause 172", "1.6T": "Clause 175, plus Clause 177 Inner FEC (draft)" },
    face: { "400G": "RS(544,514)", "800G": "RS(544,514)", "1.6T": "outer + inner" },
    summary: "Mandatory error correction. The reason these links work.",
    intro:
      "Forward error correction is not a robustness feature at these rates. It is load-bearing. The channel delivers a raw error rate that would make the link useless, and FEC converts it into something where frame loss is rare. Remove it and the link does not degrade, it stops.\n\nThe workhorse is [[RS(544,514)]], universally called KP4: Reed-Solomon over ten-bit symbols, correcting up to fifteen symbol errors per codeword. The name comes from 802.3bj clause naming rather than anything descriptive, which is why nobody derives it from first principles.\n\nAt 200G per lane the single-code arithmetic stops working. The link is a chain of an electrical channel, an optical channel and another electrical channel, and one end-to-end Reed-Solomon code cannot absorb the sum. P802.3dj's answer is a [[concatenated FEC]]: an inner Hamming code close to the optics, and the outer Reed-Solomon code still spanning the whole path. That is the largest architectural change in this stack between 800G and 1.6T.",
    terms: {
      "RS(544,514)": "544 ten-bit symbols per codeword, 514 message and 30 parity, correcting up to 15 symbol errors. Known industrially as KP4.",
      "concatenated FEC": "Two codes in series, an inner code near the channel and an outer code spanning the whole link, so each handles the error statistics it suits.",
    },
    params: {
      "400G": [
        ["Code", "RS(544,514) over GF(2^10)"],
        ["Corrects", "15 symbols per codeword (t = 15)"],
        ["Codewords", "2, interleaved"],
        ["Pre-FEC BER limit", "< 2.4 x 10^-4 (Clause 120)"],
        ["Resulting FLR", "< 1.7 x 10^-12, 64-octet frames"],
        ["Complete PHY may degrade to", "6.2 x 10^-11"],
      ],
      "800G": [
        ["Code", "RS(544,514) based"],
        ["Codewords", "4"],
        ["Resulting FLR", "3.4 x 10^-12"],
        ["Architecture at 100G/lane", "end-to-end (Type 1)"],
      ],
      "1.6T": [
        ["Outer", "RS(544,514) based", { draft: true }],
        ["Inner", "Hamming(128,120), 200G/lane IM-DD optics", { draft: true }],
        ["Inner FEC clause", "177", { draft: true }],
        ["Architecture", "concatenated (Type 2)", { draft: true }],
      ],
    },
    subs: [
      {
        id: "fec-cw", name: "Codeword anatomy", alias: "what RS(544,514) is", dir: "both", written: true,
        clause: { "400G": "Clause 119", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Symbols, parity, and correction capacity.",
        intro:
          "A codeword is 544 symbols, each ten bits, so 5,440 bits in total. Of the 544, 514 carry message and 30 carry parity, and the decoder corrects up to fifteen symbol errors.\n\nThe crucial subtlety is that correction is counted in symbols, not bits. A symbol is wrong if any of its ten bits is wrong, so one bit error and ten bit errors in the same symbol cost exactly the same: one of your fifteen. That single fact drives nearly every other decision in the sublayer.",
        params: { all: [["Codeword", "544 symbols, 5,440 bits"], ["Message", "514 symbols, 5,140 bits"], ["Parity", "30 symbols"], ["Symbol", "10 bits, GF(2^10)"], ["Corrects", "t = 15 symbols"], ["Counted in", "symbols, never bits"]] },
        sections: [
          {
            id: "fec-cw-gf", name: "Symbols and GF(2^10)",
            body:
              "Reed-Solomon works on symbols from a finite field. A ten-bit symbol gives 1,024 field elements, which bounds the codeword at 1,023 symbols, comfortably above the 544 used. Ten bits is a compromise: wider symbols tolerate longer bursts per symbol error but make decoder arithmetic costlier.\n\nThe fit upward is deliberate. A 5,140-bit message is both 514 ten-bit symbols and twenty 257-bit transcoded blocks. When candidate codes are evaluated for new rates, 'message size corresponds to an integer number of 257-bit blocks' is an explicit construction rule, alongside 'the codeword spreads evenly across 4, 8 and 16 physical lanes'.",
            params: { all: [["Field", "GF(2^10)"], ["Elements", "1,024"], ["Max codeword", "1,023 symbols"], ["Used", "544"], ["Construction rule", "message = whole number of 257-bit blocks"], ["Construction rule", "codeword spreads evenly over 4, 8, 16 lanes"]] },
          },
          {
            id: "fec-cw-budget", name: "The fifteen-symbol budget",
            body:
              "Because the symbol is the unit of damage, where a burst lands matters more than how long it is. Forty consecutive corrupted bits falling inside four symbols cost four of fifteen. The same forty bits spread across twenty symbols cost twenty, and the codeword fails. Identical damage, opposite outcome, decided entirely by how the bits were distributed.\n\nEverything about interleaving, multiplexing granularity and the 200G-per-lane changes follows from this paragraph.",
            params: { all: [["Unit of damage", "the symbol"], ["Concentrated burst", "cheap"], ["Spread burst", "expensive"], ["Budget", "15 symbols per codeword"]] },
            quiz: [
              {
                q: "A 40-bit burst lands inside four symbols. How much of the budget is spent?",
                opts: ["40 of 15", "4 of 15", "1 of 15", "It is uncorrectable"],
                a: 1,
                why: "Four damaged symbols cost four, regardless of how many bits inside them were wrong.",
              },
              {
                q: "The same 40-bit burst is spread across twenty symbols. Now what?",
                opts: ["Still 4 of 15", "20 of 15, so uncorrectable", "Still correctable with margin", "Depends on the scrambler"],
                a: 1,
                why: "Twenty damaged symbols exceeds the fifteen-symbol capacity and the codeword fails, on identical bit damage.",
              },
            ],
          },
          {
            id: "fec-cw-mttfpa", name: "Detection, not just correction",
            body:
              "A link may drop frames but must not deliver a corrupted frame that passes the 32-bit FCS, because upper layers will trust it. The risk is not a decoder that fails - it is a decoder that **miscorrects**, emitting a confidently wrong codeword instead of reporting failure.\n\nSo the standard requires two things of the decoder. It shall correct any combination of up to fifteen symbol errors, and it shall **indicate when an errored codeword was not corrected**. The probability that it fails to flag a codeword carrying t+1 errors is **not expected to exceed 10⁻¹⁶**, and the same limit is expected to hold for t+2, t+3 and beyond.\n\nThat number is the concrete form of the false-packet-acceptance argument. Design choices in these clauses that look excessively cautious usually trace back to it. It also explains why inner-code miscorrection is called out as highly undesirable in the 200G-per-lane work: an inner code that miscorrects hands clean-looking garbage to the outer decoder.",
            params: { all: [["Must correct", "up to t = 15 symbol errors"], ["Must also", "indicate uncorrected codewords"], ["Mis-detection bound", "not expected to exceed 10^-16"], ["Also expected for", "t+2, t+3, and beyond"], ["Why it matters", "a miscorrected codeword can pass the FCS"]] },
            quiz: [
              {
                q: "Why is a miscorrecting decoder worse than one reporting failure?",
                opts: ["It is slower", "It emits plausible wrong data that may pass the FCS", "It uses more power", "It breaks alignment lock"],
                a: 1,
                why: "Detected failure gets marked and discarded. Miscorrection produces data that looks valid, which is exactly what the 10^-16 mis-detection bound exists to make negligible.",
              },
            ],
          },
        ],
      },

      {
        id: "fec-interleave", name: "Interleaving and multiplexing", alias: "how symbols reach the lanes", dir: "both", written: true,
        clause: { "400G": "Clause 119", "800G": "Clause 172, 173", "1.6T": "Clause 176 (draft)" },
        summary: "How codeword symbols map onto lanes, and why 200G per lane changed it.",
        intro:
          "Interleaving decides which lane carries which part of which codeword. Given that correction is counted in symbols, the mapping determines how channel damage converts into consumed budget - a performance decision, not packaging.\n\nAt 400G two codewords are interleaved on a 10-bit basis and dealt to the lanes one symbol at a time. Below the PCS, the PMA has historically done plain bit multiplexing to reach narrower interfaces.",
        params: {
          "400G": [["Codewords", "2, interleaved on a 10-bit basis"], ["To lanes", "one 10-bit symbol at a time, ascending"], ["Below", "bit multiplexing in the PMA"]],
          "800G": [["Codewords", "4"], ["Below", "32:8 restricted bit-level multiplexing (Clause 173)"]],
          "1.6T": [["Below", "Clause 176 symbol-multiplexing PMA", { draft: true }], ["Adopted", "March 2023, for 200G/lane AUIs and PMDs", { draft: true }]],
        },
        sections: [
          {
            id: "fec-il-tension", name: "Two opposing pressures",
            body:
              "Spreading a codeword across all lanes means no single lane failure destroys a codeword by itself: damage is shared between the interleaved codewords, and shared damage is more likely to stay inside two fifteen-symbol budgets than to exhaust one. Concentrating damage means a burst consumes fewer symbols. These pull in opposite directions, and each generation re-strikes the balance for its channel.\n\nThere is a related rule worth knowing: if one codeword of an interleaved pair is uncorrectable, the other is marked bad as well. So the sharing helps up to a point and then stops helping abruptly.",
            params: { all: [["Spread", "no single lane destroys a codeword alone"], ["Concentrate", "bursts consume fewer symbols"], ["Coupled failure", "one uncorrectable codeword marks its partner too"]] },
          },
          {
            id: "fec-il-sym", name: "Symbol multiplexing at 200G per lane",
            body:
              "Bit multiplexing spreads a burst across multiple symbols; symbol multiplexing keeps it inside fewer. Analysis presented to the task force showed 4:1 bit multiplexing already carries a larger coding-gain penalty for burst errors than 2:1 or symbol multiplexing, and that going to 8:1 for 200G per lane would degrade it further.\n\nThe response was a symbol-multiplexing PMA, adopted in March 2023 and specified in Clause 176, used by 200GBASE-R, 400GBASE-R, 800GBASE-R and 1.6TBASE-R whenever the AUIs or PMDs run at 200G per lane. Note that this is a **PMA** change. It is not a change to how the PCS forms its lanes.",
            params: { "1.6T": [["Mechanism", "symbol multiplexing in the PMA", { draft: true }], ["Clause", "176", { draft: true }], ["Adopted", "March 2023 plenary", { draft: true }], ["Applies to", "200G, 400G, 800G and 1.6T at 200G/lane", { draft: true }]] },
            quiz: [
              {
                q: "Where does symbol multiplexing live?",
                opts: ["In the PCS lane formation", "In the PMA", "In the MAC", "In the optical module firmware"],
                a: 1,
                why: "It is a PMA function, specified in Clause 176 for interfaces running at 200G per lane. The PCS above is largely unchanged by it.",
              },
            ],
          },
        ],
      },

      {
        id: "fec-decode", name: "Decoding, margin and the cliff", alias: "what the receiver does with parity", dir: "rx", written: true,
        clause: { "400G": "Clause 119, 120", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Pre-FEC BER, frame loss ratio, and where margin actually lives.",
        intro:
          "The decoder reassembles each codeword, computes syndromes from the parity, and if fifteen or fewer symbols are wrong it locates and repairs them. The relationship between input and output error rate is steep: a modest improvement in pre-FEC BER produces an enormous improvement downstream, right up until the input exceeds capacity, at which point performance collapses over a very small range of channel quality.",
        params: {
          "400G": [["Pre-FEC BER limit", "< 2.4 x 10^-4"], ["Gives FLR", "< 1.7 x 10^-12, 64-octet frames, min IPG"], ["Complete PHY allowance", "6.2 x 10^-11"], ["Measured over", "8192 codewords (one AM period)"]],
          "800G": [["FLR", "3.4 x 10^-12"], ["hi_ser window", "8192 codewords per 400G flow, OR'd"]],
          "1.6T": [["hi_ser window", "8192 codewords", { draft: true }]],
        },
        sections: [
          {
            id: "fec-dec-budget", name: "The error budget, split up",
            body:
              "At 100G per lane the budget is explicit and worth memorising, because it tells you who is allowed to contribute what. The total presented to the end-to-end FEC is **2.8 × 10⁻⁴** or lower, made up of a **2.4 × 10⁻⁴** target for the PMD link and **1 × 10⁻⁵** for each AUI.\n\nThat asymmetry is the point: the optics are allowed to be an order of magnitude worse than the electrical interfaces, because the optics are the expensive part. When someone argues about an electrical channel spec, this is the budget they are arguing over.\n\nAt 200G per lane the same accounting no longer closes, which is what motivates the inner code.",
            params: { all: [["Total to end-to-end FEC", "2.8 x 10^-4 or lower"], ["PMD link target", "2.4 x 10^-4"], ["Each AUI", "1 x 10^-5"], ["Applies to", "200G, 400G, 800G at 100G per lane"]] },
            quiz: [
              {
                q: "Why is the PMD allowed a far worse BER than each AUI?",
                opts: ["Optics are more reliable", "The optics are the expensive part, so the budget favours them", "AUIs have no FEC", "It is an arbitrary split"],
                a: 1,
                why: "The allocation gives the optical link roughly an order of magnitude more error budget than each electrical interface, because relaxing the optics saves the most cost.",
              },
            ],
          },
          {
            id: "fec-dec-cliff", name: "Why the cliff matters",
            body:
              "Frame loss ratio after FEC is either negligible or catastrophic, with very little in between. A link reporting zero loss can be one small degradation away from failing, and nothing downstream will warn you.\n\nSo margin is discussed in pre-FEC terms. The useful readings are pre-FEC BER and the per-lane symbol error counts carried through the alignment markers. The healthy-looking metric is the uninformative one.",
            params: { all: [["Post-FEC FLR", "negligible, then catastrophic"], ["Tells you about margin", "almost nothing"], ["Watch instead", "pre-FEC BER, per-lane symbol counts"]] },
            quiz: [
              {
                q: "A link reports zero frame loss. What does that say about margin?",
                opts: ["It has healthy margin", "Almost nothing, because loss stays negligible until the cliff", "It is at the BER target", "FEC is disabled"],
                a: 1,
                why: "Only pre-FEC BER and per-lane counters reveal how close the link is to the edge.",
              },
            ],
          },
          {
            id: "fec-dec-monitor", name: "Counters and hi_ser",
            body:
              "The standard defines counters for corrected codewords, uncorrected codewords, and symbol errors, plus bins counting codewords by how many symbol errors they contained. The bins are the interesting ones: they show the shape of the error distribution, not just its magnitude, and a distribution creeping rightward is an early warning.\n\nThere is also a high-symbol-error-rate indicator, `hi_ser`, computed over a window of 8192 codewords at 400G - which is exactly one alignment marker period, so no separate counter is needed to time it. At 800G the same window is applied per 400G flow and the two results are OR'd together.",
            params: { all: [["Counters", "corrected CW, uncorrected CW, symbol errors"], ["Bins", "codewords by symbol-error count"], ["hi_ser window (400G)", "8192 codewords"], ["Convenient because", "that equals one AM period"], ["800G", "per flow, results OR'd"]] },
          },
        ],
      },

      {
        id: "fec-concat", name: "Concatenated FEC", alias: "inner and outer codes at 200G per lane", dir: "both", written: true,
        clause: { "400G": "not applicable", "800G": "not applicable at 100G/lane", "1.6T": "Clause 177 (draft)" },
        summary: "The P802.3dj inner-plus-outer arrangement.",
        intro:
          "A 200G-per-lane link is not one channel. It is a chain: an electrical channel from host to module, an optical channel, and another electrical channel at the far end. The task force compared three arrangements explicitly, and the names are worth learning because they appear throughout the drafts.\n\n**Type 1, end-to-end**: a single FEC spans both AUIs and the PMD link. This is what 200GBASE-R, 400GBASE-R and 800GBASE-R use at 100G per lane.\n\n**Type 2, concatenated**: the outer FEC still spans everything, with an additional inner FEC covering just the PMD link. This is the 200G-per-lane answer.\n\n**Type 3, terminated or segmented**: different FECs are dedicated to the AUIs and to the PMD link, each decoded and re-encoded at the boundary.",
        params: {
          "1.6T": [["Inner code", "Hamming(128,120)", { draft: true }], ["Built from", "Hamming(127,120) plus one extended parity bit", { draft: true }], ["Inner payload", "120 bits = 12 RS symbols", { draft: true }], ["Interleaver", "convolutional, 12-way RS interleaved", { draft: true }], ["Decoding", "soft-decision supported", { draft: true }], ["Clause", "177", { draft: true }]],
          "800G": [["At 100G per lane", "end-to-end, Type 1"], ["At 200G per lane", "concatenated, as for 1.6T", { draft: true }]],
          "400G": [["Applicable", "no; single end-to-end RS(544,514)"]],
        },
        sections: [
          {
            id: "fec-cc-inner", name: "The inner code",
            body:
              "The adopted inner code is **Hamming(128,120)**, constructed from the Hamming(127,120) code by adding one extended parity bit. It sits nearest the optical channel and its job is statistical rather than heroic: clean up the dense errors so what reaches the outer decoder looks more like what Reed-Solomon was designed for.\n\nBeing close to the channel it must be low latency and low power, which rules out anything elaborate - hence a short Hamming code rather than a second Reed-Solomon stage.\n\nThe standard also supports **soft-decision decoding** of the inner code. Ordinarily a PAM4 receive symbol takes one of four values; to feed a soft-decision decoder, the received symbol may instead take an implementation-dependent set of more than four values, carrying confidence information rather than a hard decision. That extra information is where much of the coding gain comes from.",
            params: { "1.6T": [["Code", "Hamming(128,120)", { draft: true }], ["Base", "Hamming(127,120) + extended parity bit", { draft: true }], ["Placement", "nearest the optical channel", { draft: true }], ["Constraints", "low latency, low power", { draft: true }], ["Soft decision", "rx symbol may take more than four values", { draft: true }]] },
            quiz: [
              {
                q: "What does soft-decision decoding require of the receive symbol?",
                opts: ["Exactly four PAM4 values", "More than four values, carrying confidence information", "A separate clock", "Two bits of parity"],
                a: 1,
                why: "Instead of a hard decision among four levels, the receiver passes a finer-grained value expressing how confident it is, and the inner decoder uses that to gain performance.",
              },
            ],
          },
          {
            id: "fec-cc-interleave", name: "Twelve symbols from twelve codewords",
            body:
              "This is the detail that makes the concatenation work, and it is easy to miss. The inner Hamming code's 120-bit payload is exactly **twelve ten-bit Reed-Solomon symbols**. A convolutional interleaver ahead of it guarantees that those twelve symbols come from **twelve different RS codewords**.\n\nThe reason is the failure mode. If an inner codeword is overwhelmed, the damage it passes on is spread across twelve different outer codewords, costing each of them one symbol out of fifteen, rather than costing one codeword twelve of its fifteen. The interleaver converts a concentrated inner failure into twelve cheap outer failures.\n\nNote this is the opposite pressure from the symbol-multiplexing argument elsewhere. Concentration is good when the outer code sees the burst directly; dispersion is good when an inner codeword has already failed as a unit. Both are true, at different points in the chain.",
            params: { "1.6T": [["Inner payload", "120 bits = 12 RS symbols", { draft: true }], ["Guarantee", "the 12 symbols come from 12 different RS codewords", { draft: true }], ["Mechanism", "convolutional interleaver, 3 delay lines", { draft: true }], ["Input", "output of the Clause 176 SM-PMA", { draft: true }], ["Effect", "an inner failure costs 12 codewords one symbol each", { draft: true }]] },
            quiz: [
              {
                q: "Why must the twelve RS symbols in one inner codeword come from twelve different RS codewords?",
                opts: ["To reduce latency", "So an inner failure costs each outer codeword only one symbol", "To simplify the interleaver", "To match the lane count"],
                a: 1,
                why: "Spreading the inner payload across twelve outer codewords turns a single inner failure into twelve single-symbol errors instead of one twelve-symbol hit.",
              },
            ],
          },
          {
            id: "fec-cc-seg", name: "Concatenated versus terminated",
            body:
              "Terminated, or segmented, FEC decodes and re-encodes at an intermediate point. Each segment is independently corrected, which contains errors per hop but adds latency at every termination and means an uncorrected segment error is re-encoded as apparently clean data for the next hop.\n\nConcatenated FEC layers inner and outer codes over the same end-to-end data, so the outer code still sees the whole path and can clean up what the inner code missed.\n\nBoth terms appear throughout the 802.3df and 802.3dj material, along with 'end-to-end'. Conflating them makes those discussions very hard to follow.",
            params: { all: [["End-to-end (Type 1)", "one FEC over AUIs and PMD"], ["Concatenated (Type 2)", "outer over everything, inner over the PMD link"], ["Terminated (Type 3)", "separate FECs, re-encoded at boundaries"], ["Terminated hazard", "uncorrected errors re-encoded as clean"]] },
            quiz: [
              {
                q: "What is the main hazard of terminating FEC at an intermediate point?",
                opts: ["Reduced reach", "An uncorrected error is re-encoded as apparently clean data", "Alignment markers break", "More lanes are needed"],
                a: 1,
                why: "Re-encoding after a failed correction hides the damage from the next decoder, which sees a valid codeword carrying wrong data.",
              },
            ],
          },
        ],
      },

      outline("fec-degrade", "FEC degrade signalling", "pre-FEC thresholds", "Clause 45", "Raising an alarm before the cliff. Not yet researched."),
    ],
  },

  /* ------------------------------------------------------------------ PMA */
  pma: {
    id: "pma", name: "PMA", alias: "Physical Medium Attachment", zone: "signal", written: true,
    clause: { "400G": "Clause 120", "800G": "Clause 173, or 176 at 200G/lane", "1.6T": "Clause 176 (draft)" },
    face: { "400G": "4 or 8 lanes", "800G": "8 or 4 lanes", "1.6T": "8 or 16 lanes" },
    summary: "Maps PCS lanes onto physical lanes and drives the serial signal.",
    intro:
      "The PMA does two jobs that are easy to confuse. It **multiplexes** - folding however many lanes the PCS produced onto however many the interface has - and it **signals**, which means the transmitter mapping, the receive equaliser, and clock recovery. Most of what engineers mean by 'the SerDes' lives in the second half.\n\nThe multiplexing has changed shape across generations. At 100G per lane and below the PMA does bit multiplexing: 2:1 for early 100GbE, and 32:8 restricted bit-level multiplexing for 800G in Clause 173. At 200G per lane that stopped being good enough, and Clause 176 defines a **symbol-multiplexing PMA**, adopted in March 2023 and used by 200GBASE-R, 400GBASE-R, 800GBASE-R and 1.6TBASE-R whenever the AUIs or PMDs run at 200G per lane.\n\nThe signalling is [[PAM4]] throughout, and the three pages that follow - level mapping, precoding, and equalisation - are really one argument about burst errors seen from three angles.",
    terms: {
      "PAM4": "Four-level pulse amplitude modulation: two bits per symbol, so a 106.25 Gb/s lane runs at 53.125 GBd. Halving the baud rate for a given bit rate costs signal-to-noise ratio, because the four levels must fit in the same amplitude range.",
    },
    params: {
      "400G": [["Clause", "120"], ["Physical lanes", "4 or 8"], ["Modulation", "PAM4"], ["Multiplexing", "bit multiplexing"]],
      "800G": [["Clause", "173 (100G/lane), 176 (200G/lane)"], ["Multiplexing", "32:8 restricted bit-level"], ["Modulation", "PAM4"]],
      "1.6T": [["Clause", "176, symbol multiplexing", { draft: true }], ["PMA variants", "16:8 and 16:16", { draft: true }], ["Adopted", "March 2023 plenary", { draft: true }], ["Modulation", "PAM4", { draft: true }]],
    },
    subs: [
      {
        id: "pma-pam4", name: "PAM4 signalling", alias: "four levels, two bits", dir: "both", written: true,
        clause: { "400G": "Clause 120", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Two bits per symbol, and what it costs.",
        intro:
          "NRZ sends one bit per symbol using two levels. PAM4 sends two bits per symbol using four. For a given bit rate that halves the baud rate, which is what makes 200 Gb/s on a single lane achievable with electronics and optics that top out near 106 GBd.\n\nThe cost is signal-to-noise ratio, and it is large. The four levels have to fit inside the same amplitude range the two levels used, so the spacing between adjacent levels is a third of the NRZ spacing. That works out to a detection penalty of about **9.5 dB** relative to NRZ - a figure worth remembering, because it is the reason FEC went from optional to mandatory at these rates. PAM4 did not make links slightly worse; it made them unusable without strong error correction, and the industry accepted that trade because the alternative was doubling the baud rate.\n\nEverything else in this sublayer is damage control for that decision.",
        params: { all: [["Levels", "4"], ["Bits per symbol", "2"], ["Baud rate for 106.25 Gb/s", "53.125 GBd"], ["Baud rate for 212.5 Gb/s", "106.25 GBd"], ["Detection penalty vs NRZ", "about 9.5 dB"], ["Consequence", "FEC becomes mandatory, not optional"]] },
        quiz: [
          {
            q: "Where does the roughly 9.5 dB PAM4 penalty come from?",
            opts: ["The encoder latency", "Four levels share the amplitude range two levels had, so level spacing is a third", "The scrambler", "Gray coding overhead"],
            a: 1,
            why: "Adjacent levels sit a third as far apart as in NRZ, so far less noise is needed to cross a decision threshold.",
          },
        ],
      },

      {
        id: "pma-gray", name: "Gray coding", alias: "one level error, one bit error", dir: "both", written: true,
        clause: { "400G": "Clause 120", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Mapping bit pairs to levels so neighbours differ by one bit.",
        intro:
          "Two bits have to be mapped onto four levels, and the mapping is a free choice. Gray coding picks the one where adjacent levels differ in exactly one bit position.\n\nThe reason is the shape of the errors. Noise moves a symbol to an adjacent level far more often than it moves it two levels, so almost every symbol error is a neighbour error. Under Gray coding a neighbour error produces exactly **one** wrong bit. Under a naive binary mapping some neighbour pairs differ in both bits, so the same physical event would produce two.\n\nThis matters more than it sounds, because of how FEC counts. Halving the bits damaged per symbol error directly improves what the Reed-Solomon decoder sees, for no hardware cost at all - it is purely a choice of which bit pattern labels which level.",
        params: { all: [["Mapping", "adjacent levels differ in one bit"], ["Typical error", "a neighbour-level error"], ["Result", "one bit error per symbol error"], ["Naive mapping", "some neighbour errors would flip two bits"], ["Cost", "none"]] },
        quiz: [
          {
            q: "Why is Gray coding worth doing when it costs nothing and adds nothing?",
            opts: ["It improves the eye opening", "It halves the bits damaged by the most common kind of symbol error", "It removes DC content", "It is required for clock recovery"],
            a: 1,
            why: "Neighbour-level errors dominate, and Gray coding makes each one cost a single bit instead of two. It is a free improvement in what FEC has to absorb.",
          },
        ],
      },

      {
        id: "pma-eq", name: "Equalisation and error bursts", alias: "CTLE, DFE, and why DFE bites", dir: "rx", written: true,
        clause: { "400G": "Clause 120", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Undoing channel loss, and manufacturing bursts in the process.",
        intro:
          "A high-loss channel smears each symbol into the ones after it. Equalisers undo that. Continuous-time linear equalisation boosts high frequencies before slicing; feed-forward equalisation applies a filter; and **decision feedback equalisation** subtracts the estimated interference caused by symbols that have already been decided.\n\nThat last one has a trap built into its name. DFE subtracts based on *decisions*, so if a decision was wrong, it subtracts the wrong thing and makes the next decision more likely to be wrong too. A single error becomes a burst.\n\nThe arithmetic is unpleasantly concrete. For a one-tap DFE with a tap coefficient of 1, a wrong decision gives roughly a **3/4 probability** that the next symbol is also wrong, so the probability of k consecutive errors goes as **(3/4)ᵏ**. Bursts tend to show a characteristic alternating pattern and terminate when the equalised signal falls out of range. Tap weights are bounded by the standard - 802.3cd limits the first tap to 0.7 and the rest to 0.2 - precisely to keep this behaviour in a range the FEC can absorb.\n\nSo a significant share of the burstiness that drove the interleaving and multiplexing decisions in the FEC block is not the channel. It is the receiver's own equaliser.",
        params: { all: [["CTLE", "boosts high frequencies before slicing"], ["FFE", "filter applied to the received signal"], ["DFE", "subtracts interference using previous decisions"], ["DFE failure mode", "a wrong decision corrupts the next"], ["1-tap DFE, coefficient 1", "about 3/4 chance the next symbol errors too"], ["k consecutive errors", "probability about (3/4)^k"], ["802.3cd tap limits", "first tap 0.7, taps 2 to 12 limited to 0.2"]] },
        quiz: [
          {
            q: "Why does DFE produce bursts rather than isolated errors?",
            opts: ["It amplifies noise", "It subtracts based on previous decisions, so a wrong decision corrupts the next", "It runs slower than the data", "It has no feedback"],
            a: 1,
            why: "The feedback loop is fed by decisions. One wrong decision feeds a wrong correction into the next symbol, which is how a single error propagates.",
          },
          {
            q: "A burst of four consecutive symbol errors is observed. Where should you look first?",
            opts: ["The MAC", "The receive equaliser, before blaming the channel", "The alignment markers", "The scrambler polynomial"],
            a: 1,
            why: "DFE error propagation is a well-characterised burst source inside the receiver. Channel events and equaliser behaviour produce similar signatures, so the equaliser is not a safe thing to rule out.",
          },
        ],
      },

      {
        id: "pma-precode", name: "Precoding", alias: "1/(1+D) mod 4", dir: "both", written: true,
        clause: { "400G": "Clause 120.5.7.2", "800G": "Clause 173.5.7.2", "1.6T": "Clause 176.9.1.2 (draft)" },
        summary: "A transmitter-side trick that shortens DFE bursts.",
        intro:
          "Precoding is a small transformation applied at the transmitter - **1/(1+D) mod 4**, first defined for PAM4 in 802.3cd - and undone at the receiver. Its purpose is narrow and specific: to break up the error bursts that DFE error propagation creates.\n\nThe status is worth noting because it is unusual. Precoding is **mandatory to implement** in the transmitter but **optional to use**: the link can enable or disable it depending on the receiver architecture and how badly that receiver propagates errors. So every compliant transmitter has the machinery, and whether it is switched on is a property of the pairing rather than of either end alone.\n\nIn P802.3dj, precoding appears for CR, KR, C2C and C2M links, and is one of the options a chip-to-module link training session can negotiate. It is also referenced for optical transmitters where a burst-error-prone receiver is in play.",
        params: {
          "400G": [["Function", "1/(1+D) mod 4"], ["First defined in", "802.3cd, 120.5.7.2"], ["Implementation", "mandatory in the transmitter"], ["Use", "optional, configurable per link"], ["Purpose", "shorten DFE error propagation bursts"]],
          "800G": [["Function", "1/(1+D) mod 4"], ["Clause", "173.5.7.2"]],
          "1.6T": [["Clause", "176.9.1.2", { draft: true }], ["Applies to", "CR, KR, C2C and C2M", { draft: true }], ["Negotiated in", "link training", { draft: true }]],
        },
        quiz: [
          {
            q: "Precoding is mandatory to implement but optional to use. Why that split?",
            opts: ["It is being phased out", "Whether it helps depends on the receiver, but both ends must be capable so the link can choose",
                   "It costs too much power to run always", "It is only needed on copper"],
            a: 1,
            why: "Its benefit depends on how much the far-end receiver propagates errors. Mandating the capability lets any pairing turn it on; mandating its use would penalise receivers that do not need it.",
          },
        ],
      },

      {
        id: "pma-mux", name: "Lane multiplexing", alias: "bit muxing and symbol muxing", dir: "both", written: true,
        clause: { "400G": "Clause 120.5.2", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Folding PCS lanes onto physical lanes, two different ways.",
        intro:
          "The PMA takes n lanes in and produces m lanes out. How it interleaves them turns out to matter for error performance, which is why this apparently mechanical function has been redesigned at 200G per lane.\n\n**Bit multiplexing** takes bits from the input lanes in turn. It is simple and it is what earlier generations use - 2:1 for 100GbE in Clause 120.5.2, and 32:8 restricted bit-level multiplexing for 800G in Clause 173. Its drawback is that a burst on one physical lane is scattered across several FEC symbols, and since Reed-Solomon counts damage in symbols, scattering is expensive.\n\n**Symbol multiplexing** keeps Reed-Solomon symbols intact across the multiplexing boundary, so a channel burst stays inside fewer of them. Analysis presented to the task force showed the bit-multiplexing penalty grows with the ratio - 4:1 is worse than 2:1, and 8:1 for 200G per lane would be worse still. Clause 176 defines the symbol-multiplexing PMA that resulted, with 1.6T variants including 16:8 and 16:16.\n\nThe thing to hold onto: this is a **PMA** change. The PCS above forms its lanes the same way regardless.",
        params: {
          "400G": [["Scheme", "bit multiplexing"], ["100GbE example", "2:1, Clause 120.5.2"]],
          "800G": [["Scheme", "32:8 restricted bit-level"], ["Clause", "173"]],
          "1.6T": [["Scheme", "symbol multiplexing", { draft: true }], ["Clause", "176", { draft: true }], ["Variants", "16:8 and 16:16", { draft: true }], ["Reason", "bit-mux penalty grows with the ratio", { draft: true }]],
        },
      },

      outline("pma-cdr", "Clock and data recovery", "CDR", "Clause 120", "Extracting timing from the data itself. Not yet researched."),
      {
        id: "pma-skew", name: "Skew and the skew budget", alias: "who is allowed to spend what", dir: "both", written: true,
        clause: { "400G": "Clause 116, 120", "800G": "Clause 116", "1.6T": "Clause 174 (draft)" },
        summary: "Six numbered points along the link, each with an allowance.",
        intro:
          "Skew is the arrival-time spread between lanes carrying one logical stream, and it is budgeted rather than merely limited. The standard defines numbered **skew points**, SP1 through SP6, at defined places along the link, and gives the maximum cumulative skew permitted at each. A second table does the same for skew **variation**, which is the part that changes with time, temperature and voltage and therefore cannot be calibrated out.\n\nThe structure matters more than any single number. Because the limits are cumulative and positional, each component vendor knows exactly how much of the total they may contribute, and the receiver knows how deep its deskew buffer must be. It is an interoperability contract expressed as a table.\n\nOne useful rule from the standard: if the summary table and the individual sublayer clause disagree, the **sublayer clause governs**.",
        params: {
          "400G": [
            ["SP1, PCS and TX PMA output", "29 ns"],
            ["SP2, PMD service interface", "43 ns"],
            ["SP3, medium interface", "54 ns"],
            ["SP4, after the medium", "134 ns"],
            ["SP5, RX PMD service interface", "145 ns"],
            ["SP6, RX PMA input", "160 ns"],
            ["At the PCS receive", "180 ns"],
            ["1 UI at a PCS lane", "37.64706 ps"],
          ],
          "800G": [["Skew points", "same SP1 to SP6 framework, Clause 116"], ["Note", "800G limits were set in 802.3df because they could not be changed later"]],
          "1.6T": [["Framework", "Table 174-5", { draft: true }], ["SP2 and SP5", "not populated - no physically instantiated PMD service interface is defined for any dj PHY", { draft: true }]],
        },
        sections: [
          {
            id: "pma-skew-read", name: "Reading the budget",
            body:
              "The values are **cumulative**, not per-component. 29 ns at SP1 is the total permitted by the time the signal leaves the transmit PMA; 54 ns at SP3 is the total permitted by the time it reaches the medium. So the amount any one stage may add is the difference between its point and the previous one.\n\nThe largest single allocation is the medium - from 54 ns to 134 ns, so 80 ns for the fibre itself. That reflects physics rather than generosity: parallel fibres in a cable have different effective lengths, and skew in parallel fibre depends partly on how the cable is bent. A task-force proposal cited figures as high as roughly 45 ps per metre for heavily bent parallel fibre, though that is a bounding case rather than a specification value.\n\nThe last row is worth noting: 180 ns at the PCS receive, beyond the 160 ns at SP6. That extra allowance covers skew generated inside the receiving device itself, after the signal has crossed the pins.",
            params: { all: [["Values are", "cumulative totals, not per-stage"], ["Per-stage allowance", "the difference between adjacent points"], ["Largest allocation", "the medium, 54 ns to 134 ns"], ["Bent parallel fibre", "up to roughly 45 ps/m (proposal figure)"], ["Beyond SP6", "180 ns, covering the receiving device's own skew"]] },
            quiz: [
              {
                q: "SP3 is 54 ns and SP4 is 134 ns. What does that tell you?",
                opts: ["The medium may add up to 134 ns", "The medium may add up to 80 ns", "SP4 replaces SP3", "The values are unrelated"],
                a: 1,
                why: "The numbers are cumulative, so the medium's own allowance is the difference between the two points.",
              },
            ],
          },
          {
            id: "pma-skew-variation", name: "Skew versus skew variation",
            body:
              "Two tables, two different problems. **Skew** is the static spread, and a receiver can measure it once at alignment and buffer it out. **Skew variation** is how much that spread moves afterwards, as temperature, voltage and time drift.\n\nVariation is the harder constraint even though its numbers are much smaller, because it cannot be calibrated away. A receiver that deskews perfectly at link-up and then drifts will lose alignment, so the deskew mechanism has to track rather than merely acquire. This is why test equipment vendors sell dynamic skew measurement as a distinct capability from static skew: the failure it catches appears only after the link is up and looking healthy.",
            params: { all: [["Skew", "static spread; measured once and buffered out"], ["Skew variation", "drift with time, voltage, temperature"], ["Why variation is harder", "it cannot be calibrated out at link-up"], ["Consequence", "deskew must track, not just acquire"]] },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ PMD */
  pmd: {
    id: "pmd", name: "PMD", alias: "Physical Medium Dependent", zone: "signal", written: true,
    clause: { "400G": "Clause 121-124", "800G": "Clause 124; 802.3df", "1.6T": "Clauses 180-183 (draft)" },
    face: { "400G": "DR4, FR8, LR8", "800G": "DR8, DR4, FR4", "1.6T": "DR8, DR8-2" },
    summary: "The optics and copper drivers. Where reach is decided.",
    intro:
      "The PMD is what changes when you change media. Everything above it is deliberately insulated from that choice, which is why one switch ASIC drives a DR4 module or an FR4 module with identical logic.\n\nThere are really only two optical strategies, and every PHY name is one or the other. **Parallel** optics give each lane its own fibre, one wavelength per fibre, which needs simple optics and a lot of strands. **WDM** optics put every lane on a single fibre pair as separate wavelengths, which needs more complex optics and far fewer strands. That is the entire trade, and which side wins depends on something no datasheet knows: whether you already own the fibre.\n\nThe naming conventions are learnable, with one recent exception that breaks them - see the page on reading a PHY name.",
    params: {
      "400G": [
        ["From 802.3bs-2017", "400GBASE-DR4, FR8, LR8, SR16"],
        ["Clause 124", "400GBASE-DR4 (later extended)"],
        ["Clause 123", "400GBASE-SR16"],
        ["802.3dj types", "400GBASE-KR2, CR2, DR2, DR2-2", { draft: true }],
      ],
      "800G": [
        ["From 802.3df-2024", "800GBASE-DR8, DR8-2, SR8, VR8, CR8, KR8"],
        ["Clause 124 extended to", "400GBASE-DR4-2, 800GBASE-DR8, 800GBASE-DR8-2"],
        ["802.3dj 500 m", "800GBASE-DR4, 800GBASE-FR4-500", { draft: true }],
        ["802.3dj 2 km", "800GBASE-DR4-2, 800GBASE-FR4", { draft: true }],
        ["Longer reach", "LR4, LR1, ER1-20, ER1", { draft: true }],
      ],
      "1.6T": [
        ["500 m", "1.6TBASE-DR8", { draft: true }],
        ["2 km", "1.6TBASE-DR8-2", { draft: true }],
        ["Copper", "1.6TBASE-CR8", { draft: true }],
        ["Backplane", "1.6TBASE-KR8", { draft: true }],
        ["Note", "no FR8 or SR8 among the dj objectives", { draft: true }],
      ],
    },
    subs: [
      {
        id: "pmd-naming", name: "Reading a PHY name", alias: "what 1.6TBASE-DR8-2 tells you", dir: "both", written: true,
        clause: { all: "Clause 1.4, and the PMD clauses" },
        summary: "Rate, media class, lane count, and a reach suffix.",
        intro:
          "A PHY name is four pieces of information stuck together, and once you can read it you can infer most of a module's properties without a datasheet.\n\nTake **1.6TBASE-DR8-2**. The rate is 1.6 Tb/s. BASE means baseband signalling. **DR** is the media class - parallel single-mode, one wavelength per fibre. **8** is the number of lanes, and for a parallel PMD that means eight fibre pairs. The trailing **-2** means two kilometres rather than the 500 m the class would otherwise imply.\n\nThe media letters are the part worth memorising: **D** for parallel single-mode, **F** and **L** and **E** for progressively longer single-mode reaches, **S** and **V** for multimode, **C** for copper cable assemblies, **K** for backplane.",
        params: { all: [["Rate prefix", "200G, 400G, 800G, 1.6T"], ["BASE", "baseband"], ["D", "parallel single-mode, one wavelength per fibre"], ["F / L / E", "single-mode at increasing reach"], ["S / V", "multimode, short and very short"], ["C", "copper cable assembly"], ["K", "backplane"], ["Trailing number", "lane count"], ["Trailing -2", "the 2 km variant"]] },
        sections: [
          {
            id: "pmd-naming-break", name: "Where the convention breaks",
            body:
              "The scheme used to be tidy: DR meant 500 m and FR meant 2 km. Then 802.3dj adopted an objective for 500 m over four WDM wavelengths on a single fibre, and named the result **800GBASE-FR4-500**. So FR no longer implies 2 km, and a reach suffix now appears on a name whose class already implied a reach.\n\nThis was raised formally during ballot, along with the observation that the 2 km family had become confusing in its own right: 200GBASE-FR1, 400GBASE-DR2-2, 800GBASE-DR4-2 and 1.6TBASE-DR8-2 are all 2 km PHYs with three different naming patterns between them. The resolution renamed 200GBASE-FR1 to **200GBASE-DR1-2** for consistency.\n\nThe lesson is practical rather than pedantic: read the reach from the specification, not from the letters, on anything newer than 100G per lane.",
            params: { all: [["Old rule", "DR = 500 m, FR = 2 km"], ["Broken by", "800GBASE-FR4-500, a 500 m WDM PHY"], ["Also confusing", "the 2 km family used three patterns"], ["Ballot resolution", "200GBASE-FR1 renamed 200GBASE-DR1-2"], ["Practical advice", "check the spec, not the letters"]] },
            quiz: [
              {
                q: "What reach does 800GBASE-FR4-500 have?",
                opts: ["2 km, because FR means 2 km", "500 m, as the suffix says", "40 km", "100 m"],
                a: 1,
                why: "This PHY is the reason the convention broke. FR no longer implies 2 km; the -500 suffix is authoritative.",
              },
            ],
          },
          {
            id: "pmd-naming-fibre", name: "Counting strands",
            body:
              "For a parallel PMD the lane count is also a fibre count. Each lane needs a strand in each direction, so an eight-lane parallel PHY such as 1.6TBASE-DR8 occupies sixteen strands. A four-lane parallel PHY occupies eight.\n\nFor a WDM PMD the lane count tells you the number of wavelengths, not the number of fibres. Every WDM part - FR4, FR8, LR4, LR8 - carries all its lanes on a single fibre pair, so it is two strands regardless of the number in the name.\n\nThis is the single most common source of surprise when a cabling plant is sized for one generation and reused for the next: moving from a four-lane parallel part to an eight-lane parallel part doubles the strand count and can change the connector, which is a cabling project rather than a transceiver swap.",
            params: { all: [["Parallel (DR)", "2 strands per lane"], ["DR4", "8 strands"], ["DR8", "16 strands"], ["WDM (FR, LR)", "2 strands total, lanes are wavelengths"], ["Implication", "lane count growth can be a cabling project"]] },
            quiz: [
              {
                q: "How many fibre strands does an 800GBASE-FR4 link use?",
                opts: ["Eight, one pair per lane", "Two, with the four lanes as wavelengths", "Four", "Sixteen"],
                a: 1,
                why: "FR is WDM: all four lanes travel as separate wavelengths on one fibre pair, so the link is two strands.",
              },
            ],
          },
        ],
      },

      {
        id: "pmd-tdecq", name: "TDECQ", alias: "transmitter and dispersion eye closure quaternary", dir: "tx", written: true,
        clause: { all: "specified per PMD clause; introduced in 802.3bs" },
        summary: "The primary quality metric for a PAM4 optical transmitter.",
        intro:
          "TDECQ is how a PAM4 optical transmitter is graded. It is a **power penalty**: how much extra optical power this transmitter needs, compared with an ideal one, to reach the target symbol error ratio. A lower number is a better transmitter, and it is quoted in dB.\n\nIt was developed in 802.3bs and refined in later amendments, replacing the older eye-mask and transmitter dispersion penalty tests. Those tests stopped being adequate once links used strong equalisation and mandatory FEC: a waveform can look poor against a mask and still perform well after the receiver's equaliser, so a metric was needed that accounts for what the receiver will actually do.\n\nThe most common misreading is to treat a TDECQ figure as an error rate. It is not. It is a measure of eye-opening quality relative to an ideal transmitter, expressed as the power you would have to add to compensate.",
        params: { all: [["Full name", "transmitter and dispersion eye closure quaternary"], ["Type of metric", "optical power penalty, in dB"], ["Measured against", "target symbol error ratio"], ["Introduced in", "802.3bs; refined in later amendments"], ["Replaces", "eye mask and TDP"], ["Lower is", "better"], ["Not", "a bit error rate"]] },
        sections: [
          {
            id: "pmd-tdecq-how", name: "How it is measured",
            body:
              "The measurement is taken from an eye diagram, but not with a mask. Two vertical histograms are taken across the eye, centred at **0.45 and 0.55 unit intervals**, each spanning all four PAM4 levels. The noise captured in those histograms is compared with what an ideal receiver would see, and the difference in dB is the penalty.\n\nTwo details distinguish it from the older TDP test. It uses **symbol** error ratio rather than bit error ratio, because each PAM4 symbol carries two bits. And instead of comparing against a physical reference transmitter, a **virtual** reference is constructed mathematically from the measured optical modulation amplitude of the device under test - which removes the need for a golden transmitter in every test lab.\n\nThe reference receiver includes an equaliser, so the result naturally separates into penalties the equaliser can remove and penalties it cannot. Low-pass filtering of the waveform mostly lands in the equalisable part; amplitude noise, compression and eye skew mostly land in the part that cannot be equalised away.",
            params: { all: [["Sampling points", "0.45 and 0.55 unit intervals"], ["Histograms", "vertical, spanning all four levels"], ["Compared with", "an ideal reference receiver"], ["Error metric", "symbol error ratio, not BER"], ["Reference transmitter", "virtual, built from measured OMA"], ["Reference receiver", "includes an equaliser"]] },
            quiz: [
              {
                q: "Why does TDECQ use symbol error ratio rather than bit error ratio?",
                opts: ["It is easier to measure", "Each PAM4 symbol carries two bits, so symbols are the natural unit", "BER is not defined for optics", "To match the FEC"],
                a: 1,
                why: "PAM4 decisions are made per symbol, and each symbol carries two bits, so the error statistic that matches what the receiver actually decides is the symbol error ratio.",
              },
              {
                q: "A transmitter fails an eye mask but passes TDECQ comfortably. Is that contradictory?",
                opts: ["Yes, one of the tests is broken", "No - TDECQ accounts for the receiver's equaliser, which a static mask cannot",
                       "Yes, masks are stricter by definition", "No, because they measure different wavelengths"],
                a: 1,
                why: "That mismatch is exactly why TDECQ replaced the mask. Impairments a reference equaliser can remove should not condemn a transmitter that will be used with an equalising receiver.",
              },
            ],
          },
        ],
      },

      {
        id: "pmd-dr", name: "Parallel single-mode: DR", alias: "one wavelength per fibre", dir: "both", written: true,
        clause: { "400G": "Clause 124", "800G": "Clause 124", "1.6T": "Clause 180, 182 (draft)" },
        summary: "Simple optics, more fibre. The datacentre volume choice.",
        intro:
          "A DR PMD gives every lane its own fibre pair and uses a single wavelength on each. The optics are as simple as they can be - no multiplexer, no demultiplexer, no per-wavelength wavelength control - which is what makes them cheap to build at volume.\n\nThe cost is strands. DR4 is eight, DR8 is sixteen, and the connector grows with them.\n\nDR is also the family with the most consistent 500 m target, and the 2 km variants are spelled with a trailing -2: 400GBASE-DR4-2, 800GBASE-DR8-2, 1.6TBASE-DR8-2. All of 1.6T's standardised optical PMDs are DR: there is no WDM 1.6T PHY among the 802.3dj objectives.",
        params: {
          "400G": [["Type", "400GBASE-DR4"], ["Lanes", "4"], ["Strands", "8"], ["2 km variant", "400GBASE-DR4-2"]],
          "800G": [["Types", "800GBASE-DR8 (100G/lane), 800GBASE-DR4 (200G/lane)"], ["Strands", "16 for DR8, 8 for DR4"], ["2 km variants", "DR8-2, DR4-2"]],
          "1.6T": [["Types", "1.6TBASE-DR8, DR8-2", { draft: true }], ["Lanes", "8 at 200G each", { draft: true }], ["Strands", "16", { draft: true }]],
        },
      },

      {
        id: "pmd-fr", name: "Wavelength multiplexed: FR and LR", alias: "lanes as colours on one fibre pair", dir: "both", written: true,
        clause: { "400G": "Clause 122", "800G": "Clause 183 (draft)", "1.6T": "none defined" },
        summary: "More complex optics, two strands, longer reach.",
        intro:
          "A WDM PMD carries every lane as a different wavelength on a single fibre pair. That needs a multiplexer and demultiplexer and tighter wavelength control, so the optics cost more - and it needs only two strands no matter how many lanes the name implies.\n\nThis family also covers the longer reaches. FR is the shorter of the two traditionally, LR longer, and ER longer still.\n\nWorth noting for the 1.6T column: there is no WDM 1.6T PHY in the 802.3dj objectives. At 1.6T the standardised optical options are parallel only.",
        params: {
          "400G": [["802.3bs types", "400GBASE-FR8, LR8"], ["Strands", "2"], ["Lanes carried as", "wavelengths"]],
          "800G": [["dj types", "800GBASE-FR4-500, FR4, LR4", { draft: true }], ["Strands", "2", { draft: true }]],
          "1.6T": [["WDM PHYs", "none among the dj objectives", { draft: true }]],
        },
      },

      outline("pmd-cr", "Copper and backplane: CR and KR", "twinax and backplane", "Clause 178, 179", "Passive copper and its reach wall. Not yet researched."),
      outline("pmd-sr", "Multimode: SR and VR", "short reach", "Clause 138, 167; 802.3cm, db", "Where multimode still pays. Not yet researched."),
    ],
  },

  /* --------------------------------------------------------------- medium */
  medium: {
    id: "medium", name: "Medium", alias: "fibre, copper, backplane", zone: "signal", written: true,
    clause: { all: "specified within each PMD clause" },
    face: { all: "SMF, MMF, twinax" },
    summary: "The physical channel every other decision reacts to.",
    intro:
      "The medium is not really a sublayer - it is the thing the sublayers above are compensating for. Every decision you have read about on the way down this stack exists because of some property of a piece of glass or copper.\n\nThe practical question at these rates is rarely 'will it work' and more often 'how many strands does it take, and do I already have them'. That arithmetic is covered under the PMD pages.\n\nFibre types, loss and dispersion budgets, and copper insertion loss are not yet researched here.",
    params: { all: [["Single-mode", "DR, FR, LR, ER classes"], ["Multimode", "SR, VR classes"], ["Twinax copper", "CR"], ["Backplane", "KR"]] },
    subs: [
      outline("medium-smf", "Single-mode fibre", "SMF", "per PMD clause", "Loss, dispersion, and why reach is cheap here. Not yet researched."),
      outline("medium-mmf", "Multimode fibre", "MMF", "802.3cm, 802.3db", "Modal bandwidth as the limiter. Not yet researched."),
      outline("medium-twinax", "Twinax copper", "direct attach", "Clause 179", "Insertion loss against length. Not yet researched."),
    ],
  },

  /* ------------------------------------------------- electrical + modules */
  aui: {
    id: "aui", name: "AUI", alias: "Attachment Unit Interface", zone: "signal", written: true, group: "iface",
    clause: { "400G": "Annex 120E, 120F", "800G": "802.3df and dj annexes", "1.6T": "Clause 176, Annex 176A, 176D (draft)" },
    face: { "400G": "400GAUI-8 / -2", "800G": "800GAUI-8 / -4", "1.6T": "1.6TAUI-16 / -8" },
    summary: "The electrical lanes between ASIC and module.",
    intro:
      "AUI is where most 800G and 1.6T confusion lives, because the electrical lane count and the optical lane count need not match - and the AUI name tells you the electrical one.\n\nThe naming is arithmetic: the suffix is the number of electrical lanes. **1.6TAUI-16** is sixteen lanes at 100G each; **1.6TAUI-8** is eight lanes at 200G each. Same rate, same prefix, different SerDes generation. An 800G port might be 800GAUI-8 into a module that is optically 800GBASE-DR8, or 800GAUI-4 into one that is 800GBASE-DR4 - and reading a part number correctly means knowing which number you are looking at.\n\nEvery AUI comes in two flavours with different budgets: **C2C** (chip to chip, across a board) and **C2M** (chip to module, ending at a connector). The error budget is tight: each AUI is allowed **1 × 10⁻⁵** at 100G per lane, against 2.4 × 10⁻⁴ for the whole optical link.",
    params: {
      "400G": [["dj type", "400GAUI-2 (2 x 200G)", { draft: true }], ["Earlier", "400GAUI-8, 400GAUI-4"], ["Flavours", "C2C and C2M"], ["Error budget", "1 x 10^-5 per AUI at 100G/lane"]],
      "800G": [["802.3df", "800GAUI-8 (8 x 100G)"], ["802.3dj", "800GAUI-4 (4 x 200G)", { draft: true }], ["Flavours", "C2C and C2M"]],
      "1.6T": [["100G per lane", "1.6TAUI-16", { draft: true }], ["200G per lane", "1.6TAUI-8", { draft: true }], ["C2M annex", "176D", { draft: true }], ["Link training annex", "176A", { draft: true }], ["SerDes IA", "OIF CEI-224G", { draft: true }]],
    },
    subs: [
      {
        id: "aui-c2m", name: "Chip to chip, chip to module", alias: "C2C and C2M", dir: "both", written: true,
        clause: { "400G": "Annex 120E, 120F", "800G": "df annexes", "1.6T": "Annex 176D (draft)" },
        summary: "Two channels, two budgets, two sets of compliance points.",
        intro:
          "A C2C channel runs between two devices on a board, and both ends are under one designer's control. A C2M channel runs from a host device to a pluggable module and stops at a connector - so the host is designed by one company, the module by another, and neither has seen the other's half.\n\nThat difference is the whole reason the two are specified separately. C2M needs the budget explicitly split at the connector, with compliance points defined either side, so a compliant host and a compliant module interoperate without either vendor testing against the other. In 802.3dj the C2M specifications live in Annex 176D.\n\nThe practical consequence for anyone debugging: a C2M problem is a shared-boundary problem, and the first useful question is which side of the connector owns the loss.",
        params: { all: [["C2C", "device to device on a board, one owner"], ["C2M", "host to pluggable module, two owners"], ["Why split", "the budget must be divided at the connector"], ["dj C2M annex", "176D"], ["Debug question", "which side of the connector owns the loss"]] },
        quiz: [
          {
            q: "Why are C2C and C2M specified separately?",
            opts: ["C2M runs faster", "C2M crosses a vendor boundary at a connector, so the budget must be split explicitly",
                   "C2C has no FEC", "C2M is optical"],
            a: 1,
            why: "Host and module come from different vendors who never test against each other, so each needs its own half of a divided budget with defined compliance points.",
          },
        ],
      },

      {
        id: "aui-budget", name: "Channel Operating Margin", alias: "COM", dir: "both", written: true,
        clause: { "400G": "Annex 93A", "800G": "Annex 93A", "1.6T": "Annex 178A (draft)" },
        summary: "One number in dB that says whether a channel is good enough.",
        intro:
          "COM is the modern way an electrical channel is qualified. It is a figure of merit in dB computed from the channel's scattering parameters together with the specified behaviour of a reference transmitter and receiver - including the transmitter's equaliser and the receiver's equalisation and sensitivity. A channel passes if its COM exceeds a threshold, which in practice sits in the **2 to 3 dB** range, with the exact value given by the relevant specification.\n\nIt was introduced in **802.3bj** in 2014 and is specified in **Annex 93A**. Unusually for a standard, the reference implementation is published as code, which is what made it stick: everyone computes the same number the same way.\n\nWhat COM replaced is the interesting part.",
        params: { all: [["What it is", "a figure of merit in dB"], ["Computed from", "channel S-parameters plus reference TX and RX behaviour"], ["Pass criterion", "COM above a threshold, typically 2 to 3 dB"], ["Introduced in", "802.3bj, 2014"], ["Specified in", "Annex 93A"], ["dj backplane use", "Annex 178A"], ["Statistical basis", "linear time-invariant assumptions"]] },
        sections: [
          {
            id: "aui-budget-why", name: "Why it replaced hard limits",
            body:
              "The older approach set rigid frequency-domain limits - insertion loss, insertion loss deviation, crosstalk - each with its own hard pass/fail line. The problem was that those limits could not trade against one another. A channel with unusually low loss can comfortably tolerate more crosstalk, but under hard limits it fails the crosstalk line anyway. The result was systematic overdesign: channels built to satisfy every limit independently rather than to work.\n\nCOM makes the trade explicit by rolling the impairments into one statistical calculation. It also folds in things the old frequency-domain parameters ignored entirely: losses inside the IC, package reflections, IC-related jitter, and a lumped noise term for everything else. And because the reference transmitter and receiver equalisation are specified as part of the algorithm, two vendors computing COM on the same channel get the same answer - which the old approach never guaranteed, since it left reference equalisation undefined.",
            params: { all: [["Old approach", "independent hard limits per parameter"], ["Problem", "no trade-offs, so systematic overdesign"], ["COM adds", "IC loss, package reflections, IC jitter, lumped noise"], ["COM fixes", "undefined reference equalisation"], ["Result", "repeatable qualification across vendors"]] },
            quiz: [
              {
                q: "What was the main shortcoming of hard frequency-domain limits?",
                opts: ["They were too lenient", "They allowed no trade-off between impairments, forcing overdesign",
                       "They could not be measured", "They ignored insertion loss"],
                a: 1,
                why: "A low-loss channel can afford more crosstalk, but independent limits cannot express that, so designers had to satisfy every limit separately.",
              },
            ],
          },
        ],
      },

      {
        id: "aui-training", name: "Link training", alias: "tuning the transmitter from the far end", dir: "both", written: true,
        clause: { "400G": "Clause 72, 802.3ck", "800G": "802.3ck-era training", "1.6T": "Annex 176A (draft)" },
        summary: "The receiver tells the transmitter how to pre-distort.",
        intro:
          "On an electrical link, the receiver is the only party that knows what the channel did to the signal. Link training is the mechanism by which it tells the transmitter to adjust - a negotiation over the link itself, before data flows, in which the receiver requests changes to the transmitter's equaliser coefficients and the transmitter reports back.\n\nThis is distinct from autonegotiation. Autonegotiation selects *what* to run; training tunes *how well* it runs, and does not change the rate or the PHY type.\n\nIn 802.3dj, electrical link training is specified in **Annex 176A**, and **precoding** is one of the options a session can negotiate - which fits the pattern from the PMA pages, where precoding is mandatory to implement and optional to use. Training is where that option actually gets exercised.\n\nThe detailed state machines and frame formats are not researched here.",
        params: {
          "400G": [["Purpose", "tune transmitter equalisation to this channel"], ["Direction of control", "the receiver requests, the transmitter adjusts"], ["Not the same as", "autonegotiation"]],
          "800G": [["Purpose", "as above"]],
          "1.6T": [["Annex", "176A", { draft: true }], ["Applies to", "CR, KR, C2C and C2M", { draft: true }], ["Negotiable option", "precoding", { draft: true }]],
        },
        quiz: [
          {
            q: "How does link training differ from autonegotiation?",
            opts: ["They are the same thing", "Autoneg selects what to run; training tunes how well it runs",
                   "Training selects the rate", "Autoneg applies only to optics"],
            a: 1,
            why: "Autonegotiation chooses the PHY type and capabilities. Training adjusts equalisation for the specific channel without changing what was chosen.",
          },
        ],
      },
    ],
  },
  retimer: {
    id: "retimer", name: "Retimed or Linear", alias: "module DSP versus linear drive", zone: "signal", written: true, group: "iface",
    clause: { all: "industry practice; not an IEEE distinction" },
    face: { all: "DSP, LPO or LRO" },
    summary: "Whether the module re-clocks the signal or just amplifies it.",
    intro:
      "A **retimed** module contains a DSP that recovers the data, cleans it up and re-transmits it. A **linear** module does not: it amplifies, and leaves the equalisation work to the host ASIC's SerDes. The optical and electrical specifications do not change; what changes is which side of the connector does the signal processing.\n\nThis is industry terminology, not IEEE terminology. There is no clause that defines LPO. But it matters to this page because it decides where the burden lands - and the AUI and COM pages are where that burden is measured.\n\nThe motivation is power. A retimed 800G module can draw around 17 W; fill a 64-port switch with them and the optics alone exceed a kilowatt before the switch ASIC draws anything. Removing the DSP is reported to cut module power by roughly 40 to 50 percent, with typical figures around 8 to 12 W against 18 to 22 W retimed. These are vendor figures, not specification values.",
    params: { all: [
      ["Retimed", "module DSP recovers and regenerates the data"],
      ["Linear (LPO)", "no DSP; host SerDes does the work"],
      ["LRO", "linear on the receive path only"],
      ["Retimed 800G module", "around 17 W", { industry: true }],
      ["LPO power saving", "roughly 40 to 50 percent", { industry: true }],
      ["Typical LPO module", "8 to 12 W versus 18 to 22 W retimed", { industry: true }],
      ["Standards basis", "none; MSA and industry practice"],
    ] },
    subs: [
      {
        id: "retimer-lpo", name: "What you give up", alias: "the linear trade", dir: "both", written: true,
        clause: { all: "industry practice" },
        summary: "Power and latency saved, reach and interoperability spent.",
        intro:
          "Removing the DSP saves power and removes the latency that retiming adds, which is why linear optics get attention in AI fabrics where both matter.\n\nThe costs are real and they land on the host. Without a module DSP, the host board's signal integrity has to be good enough on its own, so the electrical channel requirements tighten. Reach is reduced. And because performance now depends on the pairing of a specific host with a specific module rather than on each independently meeting a spec, **interoperability becomes a qualification exercise** - exactly the property that C2M specifications were designed to avoid.\n\nThe common industry guidance is to stay retimed beyond a few hundred metres, in multi-vendor environments where every pairing cannot be qualified, and anywhere dispersion management matters. There is also a view that at 200G per lane, linear receive-only designs may prove more deployable than fully linear ones.",
        params: { all: [
          ["Gains", "lower power, lower latency"],
          ["Costs", "reduced reach, tighter host signal integrity"],
          ["Biggest cost", "interoperability becomes per-pairing qualification"],
          ["Guidance", "stay retimed for longer reach and multi-vendor fleets", { industry: true }],
          ["At 200G per lane", "LRO may be more deployable than full LPO", { industry: true }],
        ] },
        quiz: [
          {
            q: "Why is LPO an interoperability concern rather than just a power choice?",
            opts: ["It uses a different connector", "Performance depends on the specific host-module pairing rather than each meeting a spec independently",
                   "It is not standardised at the optical level", "It requires a different FEC"],
            a: 1,
            why: "With no module DSP, the host's signal integrity and the module's optics have to work together, so a compliant host and a compliant module are no longer sufficient on their own.",
          },
        ],
      },
    ],
  },
  form: {
    id: "form", name: "Form Factors", alias: "QSFP-DD, OSFP, OSFP-XD", zone: "signal", written: true, group: "iface",
    clause: { all: "MSA, not IEEE 802.3" },
    face: { "400G": "QSFP-DD, OSFP", "800G": "QSFP-DD, OSFP", "1.6T": "OSFP-XD, OSFP1600" },
    summary: "Mechanical and thermal envelopes, defined outside IEEE.",
    intro:
      "Form factors are **MSA** territory, not 802.3. IEEE defines the PMD and the electrical interface; the multi-source agreement groups define the cage, the connector, the thermal envelope and the management interface. IEEE liaises with them - there is correspondence on record between the task force and the MSA groups - but you will not find OSFP in the standard.\n\nThey belong on this page anyway, because the mechanical envelope constrains what the standard can assume. A form factor decides how many electrical lanes reach the module and how many watts it may dissipate, and those two numbers bound which PMDs are physically deployable.\n\nThe rule connecting them is simple: the lane count in the AUI name has to be a number of lanes the cage actually carries.",
    params: { all: [
      ["Defined by", "MSA groups, plus OIF CMIS for management"],
      ["IEEE role", "liaison only; not in the standard"],
      ["OSFP", "8 electrical lanes", { industry: true }],
      ["OSFP-XD", "16 electrical lanes", { industry: true }],
      ["Constrains", "lane count, power, thermal"],
    ] },
    subs: [
      {
        id: "form-lanes", name: "Lanes and the 1.6T split", alias: "why there are three answers", dir: "both", written: true,
        clause: { all: "MSA" },
        summary: "Eight lanes, sixteen lanes, and a compatibility choice.",
        intro:
          "OSFP carries **eight** electrical lanes. OSFP-XD doubles that to **sixteen**, which is what lets it reach 1.6T with 16 lanes of 100G - and leaves headroom for 3.2T later with 16 lanes of 200G. The two are deliberately **not** mechanically compatible, and the XD cages carry keying features specifically to stop someone inserting an OSFP module into an XD port.\n\nThat gives 1.6T more than one home, and the choice is about thermal headroom and ecosystem rather than bandwidth. A 1.6T module can be eight lanes of 200G in an OSFP-class cage, or sixteen lanes of 100G in OSFP-XD. A QSFP-DD-lineage option exists too, and is attractive where port density and reuse of the existing QSFP ecosystem matter more than power headroom.\n\nThis is the practical reason the AUI page insists that the electrical lane count and the optical lane count are separate facts. 1.6TAUI-8 and 1.6TAUI-16 are not two ways of saying the same thing - they are two different cages, two different SerDes generations, and two different procurement decisions.",
        params: { all: [
          ["OSFP", "8 electrical lanes", { industry: true }],
          ["OSFP-XD", "16 electrical lanes", { industry: true }],
          ["OSFP-XD at 16 x 100G", "1.6T", { industry: true }],
          ["OSFP-XD at 16 x 200G", "3.2T, future", { industry: true }],
          ["Compatibility", "XD is not OSFP-compatible; cages are keyed to prevent mis-insertion", { industry: true }],
          ["Maps to", "1.6TAUI-16 and 1.6TAUI-8 respectively"],
        ] },
        quiz: [
          {
            q: "Why do OSFP-XD cages include keying features?",
            opts: ["To improve grounding", "To physically prevent an incompatible OSFP module being inserted",
                   "To identify the vendor", "To lock the module in place"],
            a: 1,
            why: "OSFP-XD is not mechanically compatible with OSFP, so the cages are keyed to stop a module being inserted into a port that cannot drive it correctly.",
          },
          {
            q: "A 1.6T port is specified as 1.6TAUI-16. What does that tell you about the module?",
            opts: ["It uses 16 optical fibres", "It presents sixteen electrical lanes at 100G each",
                   "It is a coherent module", "It must be OSFP"],
            a: 1,
            why: "The AUI suffix counts electrical lanes. Sixteen lanes at 100G implies the wider cage, and says nothing directly about the optical lane count.",
          },
        ],
      },
      outline("form-cpo", "Co-packaged optics", "CPO", "industry", "Removing the pluggable boundary entirely. Not yet researched."),
    ],
  },

  /* ------------------------------------------------ adjacent, cross-cutting */
  macsec: {
    id: "macsec", name: "MACsec", alias: "IEEE 802.1AE, above the MAC", zone: "framing", written: true, group: "aside",
    clause: { all: "IEEE 802.1AE (not 802.3)" },
    face: { all: "above the MAC" },
    summary: "Link-layer encryption. Not a stage in the PHY pipeline.",
    intro:
      "MACsec is drawn to one side deliberately. It is a sublayer above the MAC, not a stage in the PHY pipeline, and putting it in the main column would teach the wrong layering.\n\nIt is also a different standard from a different working group: IEEE 802.1AE, not 802.3. It provides confidentiality, integrity and authenticity on a point-to-point link, frame by frame, and it is a link-layer mechanism rather than an end-to-end one - each hop decrypts and re-encrypts.\n\nIts relevance to this page is arithmetic. MACsec makes every frame bigger, and frame size is what determines how much of your headline rate becomes payload.",
    params: { all: [["Standard", "IEEE 802.1AE"], ["Position", "above the MAC"], ["Scope", "point to point, per hop"], ["Adds", "a SecTAG before the payload and an ICV after it"], ["Key agreement", "MKA, defined in 802.1X"]] },
    subs: [
      {
        id: "macsec-frame", name: "What encryption adds to a frame", alias: "SecTAG and ICV", dir: "both", written: true,
        clause: { all: "IEEE 802.1AE" },
        summary: "Between 16 and 32 extra octets per frame.",
        intro:
          "MACsec inserts a **SecTAG** - a protocol header identifying the key in use and providing replay protection - and appends an **integrity check value** after the payload.\n\nNeither field is a fixed size. The SecTAG is 8 to 16 octets: 16 when the optional secure channel identifier is encoded, 8 when it is omitted. The ICV is 8 to 16 octets depending on the cipher suite, and is 16 for the common GCM-AES suites. So the overhead per frame runs from about 16 octets at the lean end to **32 octets** in the usual configuration.\n\nThat is a fixed cost per frame, not per octet, which means it hurts small frames far more than large ones. On a stream of 64-octet frames, 32 extra octets is a very large proportional addition; on 1500-octet frames it is close to noise. If you have read the goodput page under the MAC, this is the same argument with a different constant.",
        params: { all: [["SecTAG", "8 to 16 octets"], ["SecTAG is 16 when", "the secure channel identifier is encoded"], ["ICV", "8 to 16 octets, cipher-suite dependent"], ["ICV with GCM-AES", "16 octets"], ["Typical total", "32 octets per frame"], ["Cost shape", "fixed per frame, so worst on small frames"]] },
        quiz: [
          {
            q: "Why does MACsec overhead hurt small frames disproportionately?",
            opts: ["Encryption is slower on small frames", "The overhead is a fixed number of octets per frame, not a percentage",
                   "Small frames need more keys", "The ICV grows as frames shrink"],
            a: 1,
            why: "A fixed addition of roughly 32 octets is half again on a 64-octet frame and about two percent on a 1500-octet frame.",
          },
        ],
      },
    ],
  },
  ptp: {
    id: "ptp", name: "Time Synchronization", alias: "Clause 90 TimeSync, cross-cutting", zone: "framing", written: true, group: "aside",
    clause: { "400G": "Clause 90", "800G": "Clause 90", "1.6T": "Clause 90, with 175.6 and 177.7 (draft)" },
    face: { all: "a reference point" },
    summary: "Not a block. A timestamping reference point inside the PHY.",
    intro:
      "Time sync is not a sublayer. It defines a point in the PHY at which timestamps are taken, and requires known and bounded latency between that point and the medium. Each sublayer that adds delay has to report it.\n\nOne confirmed detail shows how this bites at 1.6T. Clause 175.6 requires the 1.6TBASE-R PCS to report transmit and receive path data delays as if the measurement point sits **at the start of the set of four interleaved FEC codewords**, with maximum and minimum values in nanoseconds and optionally sub-nanoseconds. The Inner FEC has its own delay figures and needed its own TimeSync MDIO registers added during ballot - a concrete example of a new sublayer creating new timing obligations.",
    params: {
      "400G": [["Mechanism", "Clause 90 reference point"], ["Needs", "known, bounded PHY latency"]],
      "800G": [["Mechanism", "Clause 90 reference point"]],
      "1.6T": [["PCS reporting", "175.6, at the start of four interleaved codewords", { draft: true }], ["Values", "max and min, ns and sub-ns", { draft: true }], ["Inner FEC", "own delay figures and TimeSync registers", { draft: true }], ["Described in", "Clause 90.7"]],
    },
    subs: [
      {
        id: "ptp-ref", name: "Why every sublayer must declare its delay", alias: "path data delay", dir: "both", written: true,
        clause: { "400G": "Clause 90.7", "800G": "Clause 90.7", "1.6T": "Clause 90.7, with 175.6 and 177 (draft)" },
        summary: "Timestamps are taken at a reference point, so everything below it must have known delay.",
        intro:
          "Timestamping needs a known reference point and a known delay from that point to the wire. So each sublayer is required to report its transmit and receive **path data delay**, with maximum and minimum values, and the mechanism for that reporting is described in Clause 90.7.\n\nThe maximum and minimum matter more than any single figure. A large but perfectly known delay can be subtracted out. A delay that varies between the two bounds cannot, and the spread is what limits achievable accuracy - which is why a sublayer with low but uncertain latency can be worse for timing than one with high, stable latency.\n\n1.6T shows how this ripples. Clause 175.6 requires the PCS to report its delays as though measured at the start of the set of interleaved FEC codewords, in nanoseconds and optionally sub-nanoseconds. And because 802.3dj adds an **Inner FEC** - a new sublayer in the path - that sublayer needed its own delay figures and its own TimeSync MDIO registers, which were added during ballot. Every new block in the stack creates a new timing obligation.",
        params: {
          "400G": [["Reporting mechanism", "Clause 90.7 path data delay"], ["Reported as", "maximum and minimum"], ["Why both bounds", "the spread limits achievable accuracy"]],
          "800G": [["Reporting mechanism", "Clause 90.7"]],
          "1.6T": [["PCS reporting", "175.6, at the start of the interleaved FEC codewords", { draft: true }], ["Units", "nanoseconds, optionally sub-nanoseconds", { draft: true }], ["Inner FEC", "own delay figures and TimeSync registers, added in ballot", { draft: true }]],
        },
        quiz: [
          {
            q: "Which is worse for timing accuracy?",
            opts: ["A large but precisely known delay", "A small delay with a wide range between its maximum and minimum",
                   "Any delay above 100 ns", "They are equivalent"],
            a: 1,
            why: "A known delay can be compensated exactly. Uncertainty cannot, so the spread between the reported bounds is what limits accuracy.",
          },
        ],
      },
    ],
  },
  autoneg: {
    id: "autoneg", name: "Autoneg and Link Training", alias: "copper and backplane, not optics", zone: "signal", written: true, group: "aside",
    clause: { "400G": "Clause 73", "800G": "Clause 73", "1.6T": "Clause 73; Annex 176A (draft)" },
    face: { all: "copper and backplane" },
    summary: "Mostly a copper concern. Optical links do not negotiate.",
    intro:
      "A common beginner surprise: there is no autonegotiation on optical 400G and above. You plug in a module and it either matches or it does not. Clause 73 autonegotiation applies to backplanes and copper cable assemblies, and the electrical-lane equivalent is link training, which tunes the transmitter and equaliser rather than selecting a rate.\n\nIn P802.3dj, electrical link training is specified in Annex 176A, and precoding is one of the options a C2M training session can negotiate.\n\nThe mechanics of both are not yet researched.",
    params: {
      "400G": [["Clause 73", "backplane and copper only"], ["Optical", "no negotiation"], ["Electrical lanes", "link training"]],
      "800G": [["Clause 73", "copper and backplane"]],
      "1.6T": [["Link training", "Annex 176A", { draft: true }], ["Applies to", "CR, KR, C2C and C2M", { draft: true }], ["Negotiable option", "precoding", { draft: true }]],
    },
    subs: [
      outline("an-cl73", "Clause 73 autonegotiation", "copper and backplane", "Clause 73", "What is actually negotiated, and where. Not yet researched."),
      outline("an-training", "Link training", "see the AUI block", "Annex 176A", "Written up under AUI, where the channel budgets live."),
    ],
  },
};

export const CORE = ["mac", "rs", "pcs", "fec", "pma", "pmd", "medium"];
export const IFACE = ["aui", "retimer", "form"];
export const ASIDE = ["macsec", "ptp", "autoneg"];
