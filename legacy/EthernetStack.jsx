import React, { useState, useMemo } from "react";

/* ===========================================================================
   PALETTE  —  ink-blue instrument ground, one amber signal accent.
   Amber means "active path / moving data" and appears nowhere else.
   Each sublayer zone gets a desaturated hue family, not a loud fill.
   =========================================================================== */
const C = {
  ink: "#0c141f",
  ink2: "#111c28",
  ink3: "#18242f",
  rule: "#25384b",
  ruleSoft: "#1c2b3a",
  text: "#dae4ed",
  dim: "#8fa1b3",
  faint: "#607586",
  signal: "#f2b03d",
  signalDim: "#7d5c1f",
  signalWash: "#251d0e",
  good: "#5fae8c",
  bad: "#c9756b",
  maxW: 700,
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace',
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

/* One rendering scale for every SVG in the page: full width of its column,
   but never wider than the viewBox, so SVG type and panel type stay the same
   physical size instead of drifting apart as the column grows. */
const SVG_STYLE = { width: "100%", maxWidth: 700, height: "auto", display: "block" };

/* zone = which band of the stack a block belongs to */
const ZONES = {
  framing: { label: "frames", hue: "#2b4557", fill: "#16242f", note: "rate-agnostic" },
  coding: { label: "coding and correction", hue: "#3c3f63", fill: "#1a1c2b", note: "where the rate shows up" },
  signal: { label: "signal and medium", hue: "#2a5045", fill: "#14231f", note: "where reach is decided" },
};

/* ===========================================================================
   DATA
   ---------------------------------------------------------------------------
   Levels:  1 top block  ->  2 sub-block  ->  3 section (rendered in-panel)
   Numeric facts keyed by rate; "all" is the rate-independent fallback.
   dir: "tx" | "rx" | "both".  written:false renders the outline treatment.
   face: the one parameter shown on the block face in the diagram.

   Sourcing rule: a row marked {draft:true} comes from P802.3dj, which was
   still in ballot at the time of writing. A row marked {inferred:true} is a
   strong inference rather than clause text, and says so on the page.
   Anything that could not be confirmed is absent, not guessed.
   =========================================================================== */

const RATES = ["400G", "800G", "1.6T"];

const RATE_META = {
  "400G": { std: "IEEE Std 802.3, Clause 119", lanes: "4 or 8 electrical lanes", draft: false },
  "800G": { std: "IEEE 802.3df-2024, Clause 172", lanes: "8 x 100G, or 4 x 200G (802.3dj)", draft: false },
  "1.6T": { std: "IEEE P802.3dj, Clause 175", lanes: "8 x 200G, or 16 x 100G", draft: true },
};

const outline = (id, name, alias, clause, summary, dir) => ({
  id, name, alias, clause: { all: clause }, summary, dir: dir || "both", written: false,
});

const DATA = {
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
          "Frames are separated by an idle period of at least twelve octets on average — 96 bit times. The gap exists to give receivers time to finish processing one frame and re-arm for the next, and it is part of the rate arithmetic, not a courtesy: the 12 octets are bandwidth you do not get to use.\n\nThe word **average** is doing real work in that sentence. Individual gaps are allowed to be shorter, under bounded rules, because the layer below cannot always place the next frame exactly where the MAC would like it. That mechanism lives in the Reconciliation Sublayer and is covered there.",
        params: { all: [["Minimum average IPG", "12 octets (96 bit times)"], ["Enforced as", "an average, not per-gap"], ["Reason for the gap", "receiver recovery between frames"], ["Consequence", "it counts against usable throughput"]] },
      },

      {
        id: "mac-rate", name: "Data rate versus goodput", alias: "where the headline number goes", dir: "both", written: true,
        clause: { all: "Clause 4" },
        summary: "What fraction of 400 Gb/s carries payload.",
        intro:
          "The headline rate is the MAC data rate, and payload is strictly less than that. Each frame carries 8 octets of preamble and SFD ahead of it and at least 12 octets of gap after it, so a 64-octet frame occupies 84 octets of wire time. That is 76 percent efficiency before you count the 18 octets of header and FCS inside the frame itself — of the 84 octets, only 46 are payload, about 55 percent.\n\nAt the other extreme, a 1500-octet payload occupies 1538 octets, which is about 97.5 percent. This is why benchmark numbers are always quoted with a frame size, and why small-frame line-rate performance is a much harder engineering claim than large-frame line-rate performance.\n\nNote that none of this counts PHY-layer overhead. The coding and FEC below have their own costs, but they are absorbed by running the line faster rather than by stealing MAC bandwidth — which is exactly why lane rates are odd numbers like 106.25 Gb/s rather than round ones.",
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
          "A receiver running out of buffer has two options: drop frames, or ask the sender to stop. **PAUSE** is the mechanism for asking. It arrived in 802.3x in 1997, and it is built on the MAC control frame defined in Clause 31, with opcodes in Annex 31A and the PAUSE frame format in Annex 31B.\n\nA PAUSE frame is a 64-octet MAC control frame carrying an opcode and a 16-bit pause duration. The duration is expressed in **quanta**, where one quantum is the time to transmit 512 bits at the current link speed — so the units scale with the link rather than being absolute. A duration of zero means resume immediately, which is how a sender is released early.\n\nThe fatal limitation is in the name of its successor. PAUSE stops **all** traffic on the link. That makes an Ethernet segment unsuitable for carrying flows with different quality-of-service needs, because pausing for one application stops everything.",
        params: { all: [["Defined in", "Clause 31, Annex 31A, Annex 31B"], ["Introduced by", "802.3x, 1997"], ["Frame", "64-octet MAC control frame"], ["EtherType", "0x8808"], ["Duration field", "16 bits, in quanta"], ["One quantum", "512 bit times at the current speed"], ["Duration zero", "resume"], ["Scope", "all traffic on the link"]] },
        sections: [
          {
            id: "mac-flow-quanta", name: "Quanta, and why max pause shrinks",
            body:
              "Because a quantum is 512 bit times rather than a fixed interval, the same numeric value means less time as the link gets faster. The maximum field value is 65,535 quanta, which is 65,535 × 512 = about 33.6 million bit times.\n\nConvert that to seconds and the effect is striking. At 400 Gb/s the longest possible pause is roughly 84 microseconds. At 800 Gb/s it is about 42, and at 1.6 Tb/s about 21. The mechanism was designed when links were three orders of magnitude slower, and its maximum hold time has been quietly shrinking ever since.\n\nIn practice implementations rarely try to compute a duration anyway. The common pattern is to pause for a large number of quanta and then send an explicit zero to resume — using PAUSE as an on/off signal rather than a timer.",
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
              "PFC, standardised as IEEE 802.1Qbb, keeps the same 64-octet control frame and extends the semantics to eight classes of service. The frame carries a **class enable vector** — one bit per priority — followed by a separate two-octet quanta value for each enabled class.\n\nSo instead of stopping the link, you stop priority 3 and leave the rest running. That is what makes lossless behaviour possible for one traffic class while other classes tolerate drops, and it is why PFC underpins storage and AI fabrics that assume a lossless medium.\n\nNote the layering: PFC is an 802.1 standard using an 802.3 frame format. Like MACsec, it sits beside this stack rather than inside it.",
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
          "The media independent interface is a parallel bus carrying octets, each accompanied by a flag saying whether it is data or a control character. Idle, Start, Terminate and the ordered sets are all control characters on this bus.\n\nTwo placement rules matter, and the asymmetry between them is the source of everything on the next page. The **Terminate** character may appear in any lane, because a frame can end on any octet. The **Start** character must appear in a fixed lane — the first one. Frames are arbitrary lengths; the bus is a fixed width; so the gap between frames is where the two get reconciled.\n\nThe PCS above this bus encodes eight of these octets into each 66-bit block, which is why the interface width and the coding block size are related by design rather than coincidence.",
        params: { all: [["Carries", "octets plus data/control flags"], ["Control characters", "Idle, Start, Terminate, ordered sets"], ["Terminate", "may occur in any lane"], ["Start", "must occur in the first lane"], ["Consumed by", "the PCS, eight octets per 66-bit block"]] },
        quiz: [
          {
            q: "Why can Terminate appear in any lane but Start cannot?",
            opts: ["Terminate is higher priority", "Frames end on arbitrary octets, but the next frame must begin at a fixed bus position", "Start is not a control character", "It is an arbitrary rule"],
            a: 1,
            why: "Frame length is arbitrary so the end lands anywhere, but the receiver needs the frame start at a predictable position — so the idle between frames absorbs the difference.",
          },
        ],
      },

      {
        id: "rs-adapt", name: "Deficit idle count", alias: "keeping Start aligned without losing bandwidth", dir: "tx", written: true,
        clause: { all: "Clause 46.3.1.4, and equivalents at higher rates" },
        summary: "Insert or delete idles to align Start, and keep a running tally.",
        intro:
          "A frame ends wherever it ends. The next frame's Start must land in the first lane. So the RS has to insert or delete idle characters in the gap to push the Start into position — and if it only ever inserted, it would waste bandwidth, while if it only ever deleted, it would violate the 12-octet average.\n\nThe solution is a small counter. The **deficit idle count** is incremented when idle characters are deleted and decremented when they are inserted, and it is bounded, so the RS can only run a deficit so far before it must pay it back by inserting.\n\nIn the original 10 Gb/s specification the counter is bounded between **zero and three**, meaning up to three idles can be deleted at once — shrinking an individual gap from twelve octets to nine — but the deletions must be repaid, so the average holds at twelve. The counter resets only at initialisation and applies regardless of the gap the MAC asked for. Higher-rate Reconciliation Sublayers use the same technique; an implementation may use any equivalent method provided the result matches what DIC would produce.",
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
          "A link failure is usually one-directional. Your receiver goes dark, but your transmitter is fine — and the far end, whose transmitter is the broken part, sees perfectly good data coming back and has no idea anything is wrong. Fault signalling is how it finds out.\n\nThe mechanism is two ordered sets carried in the coded stream. When a sublayer detects a fault, the receive path sends **local fault** ordered sets up to the RS. The RS, on seeing local fault, stops sending MAC data and instead continuously transmits **remote fault** on its own transmit path. The far-end RS, on receiving remote fault, stops sending frames and transmits only idles.\n\nSo the two signals mean different things from the perspective of whoever is reading them. Local fault means \"my receive path is broken\". Remote fault means \"the other end is telling me my transmit path is broken\". Both bring the link down until the condition clears.\n\nFor 40G and above, this behaviour is specified in Clause 81.3.4 and follows the Clause 46 definition. One constraint worth knowing: Clause 81 link fault signalling supports **bidirectional operation only** — unlike the 10G lineage, it has no unidirectional mode.",
        params: {
          "400G": [["Specified in", "Clause 81.3.4, following Clause 46"], ["Local fault means", "a fault on my receive path"], ["Remote fault means", "the far end cannot receive from me"], ["On local fault, the RS", "stops MAC data, transmits remote fault"], ["On remote fault, the RS", "stops frames, sends only idles"], ["Unidirectional operation", "not supported"], ["Status exposed via", "MDIO registers, Clause 45"]],
          "800G": [["Specified in", "Clause 81.3.4"]],
          "1.6T": [["Specified in", "Clause 174", { draft: true }]],
        },
        sections: [
          {
            id: "rs-fault-limits", name: "What it cannot tell you",
            body:
              "LF and RF localise a fault to \"somewhere between the two Reconciliation Sublayers\", and no further. They do not identify which sublayer failed.\n\nThat gap was recognised early and argued over during the 10 Gb/s work. The awkward case is a far-end fault in, say, the PCS: it presents to you as a **local** fault, because from your side the symptom is that your receive path is broken — while the far end reports nothing wrong at all. An operator can then spend a long time running diagnostics on equipment that is working correctly.\n\nThe resolution is that fault signalling is a link-state mechanism, not a diagnostic one. Localisation comes from the **MDIO registers** in Clause 45, where each sublayer reports its own status, so management can walk the stack and find which one is unhappy. If you take one practical thing from this page: when you see local fault, the fault is probably not local.",
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
        ["PCS lane count", "not confirmed — see the distribution page", { draft: true }],
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
              "Bit 257 is a flag rather than payload, so leaving it alone is tempting. Its statistics are the problem: through long runs of all-data blocks it holds a constant value, and that regularity would appear on the line as periodic structure at a very predictable frequency — exactly the kind of spectral line the scrambler exists to remove. So it is included.",
            params: { all: [["Nature", "flag bit, not payload"], ["Problem", "constant through all-data runs"], ["If omitted", "reduced randomness, periodic content"], ["Decision", "scramble it"]] },
          },
          {
            id: "pcs-scramble-mult", name: "Error multiplication",
            body:
              "Self-synchronous descrambling has a cost. An errored bit re-enters the shift register, so one channel bit error emerges as a short burst after descrambling.\n\nThis is not a curiosity. It is why, after an uncorrectable codeword, the standard requires marking blocks beyond the codeword itself when the stateless decoder is used — the damage propagates into the next transcoded block through the descrambler. Some of the burstiness the FEC must handle is manufactured inside the PHY rather than by the channel.",
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
            ["Scrambled?", "no — the group is not scrambled"],
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
            why: "Markers identify, align and monitor. Correction belongs to FEC — and in fact markers are processed before FEC correction, so they must survive errors rather than fix them.",
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
          "This is the first real intelligence in the receive path and where most bring-up problems announce themselves. Each lane runs its own independent alignment-marker lock process — sixteen of them at 400G. Finding the common marker elements repeatedly at the expected period gives boundary and presence; the unique elements give the lane number. Then offsets are measured and each lane is buffered until the markers line up.\n\nBecause all of this happens before FEC correction, the lock process must work on data that still contains errors. It is specified to tolerate mismatches in some marker bits rather than demanding an exact match.",
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
              "Depth is set by the worst-case skew the receiver must tolerate plus its allowed variation — not by the lane count and not by the codeword length. Deeper costs latency and area, which is why the limit is specified rather than left to implementers: it has to be interoperable across vendors who each consume part of the budget.\n\nThe specific skew budget numbers are not yet researched here and are deliberately not quoted.",
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
              "If a codeword contains errors that were not corrected, the PCS sets every 66-bit block within the **two associated interleaved codewords** to an error block. Not just the failed codeword — both, because they were interleaved and the receiver cannot cleanly separate the damage.\n\nThe marking may be done by setting the sync header to **11** for all 66-bit blocks produced from those codewords, which is one of the two illegal header values. The illegality is the mechanism: an illegal header cannot be mistaken for data.\n\nThere is a further rule when the stateless 64B/66B decoder is used: the **first four 66-bit blocks following** the uncorrected codewords must also be marked. Those four blocks are the next transcoded block, and they are contaminated by descrambler error propagation.",
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
              "A link may drop frames but must not deliver a corrupted frame that passes the 32-bit FCS, because upper layers will trust it. The risk is not a decoder that fails — it is a decoder that **miscorrects**, emitting a confidently wrong codeword instead of reporting failure.\n\nSo the standard requires two things of the decoder. It shall correct any combination of up to fifteen symbol errors, and it shall **indicate when an errored codeword was not corrected**. The probability that it fails to flag a codeword carrying t+1 errors is **not expected to exceed 10⁻¹⁶**, and the same limit is expected to hold for t+2, t+3 and beyond.\n\nThat number is the concrete form of the false-packet-acceptance argument. Design choices in these clauses that look excessively cautious usually trace back to it. It also explains why inner-code miscorrection is called out as highly undesirable in the 200G-per-lane work: an inner code that miscorrects hands clean-looking garbage to the outer decoder.",
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
          "Interleaving decides which lane carries which part of which codeword. Given that correction is counted in symbols, the mapping determines how channel damage converts into consumed budget — a performance decision, not packaging.\n\nAt 400G two codewords are interleaved on a 10-bit basis and dealt to the lanes one symbol at a time. Below the PCS, the PMA has historically done plain bit multiplexing to reach narrower interfaces.",
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
              "The standard defines counters for corrected codewords, uncorrected codewords, and symbol errors, plus bins counting codewords by how many symbol errors they contained. The bins are the interesting ones: they show the shape of the error distribution, not just its magnitude, and a distribution creeping rightward is an early warning.\n\nThere is also a high-symbol-error-rate indicator, `hi_ser`, computed over a window of 8192 codewords at 400G — which is exactly one alignment marker period, so no separate counter is needed to time it. At 800G the same window is applied per 400G flow and the two results are OR'd together.",
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
              "The adopted inner code is **Hamming(128,120)**, constructed from the Hamming(127,120) code by adding one extended parity bit. It sits nearest the optical channel and its job is statistical rather than heroic: clean up the dense errors so what reaches the outer decoder looks more like what Reed-Solomon was designed for.\n\nBeing close to the channel it must be low latency and low power, which rules out anything elaborate — hence a short Hamming code rather than a second Reed-Solomon stage.\n\nThe standard also supports **soft-decision decoding** of the inner code. Ordinarily a PAM4 receive symbol takes one of four values; to feed a soft-decision decoder, the received symbol may instead take an implementation-dependent set of more than four values, carrying confidence information rather than a hard decision. That extra information is where much of the coding gain comes from.",
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
      "The PMA does two jobs that are easy to confuse. It **multiplexes** — folding however many lanes the PCS produced onto however many the interface has — and it **signals**, which means the transmitter mapping, the receive equaliser, and clock recovery. Most of what engineers mean by 'the SerDes' lives in the second half.\n\nThe multiplexing has changed shape across generations. At 100G per lane and below the PMA does bit multiplexing: 2:1 for early 100GbE, and 32:8 restricted bit-level multiplexing for 800G in Clause 173. At 200G per lane that stopped being good enough, and Clause 176 defines a **symbol-multiplexing PMA**, adopted in March 2023 and used by 200GBASE-R, 400GBASE-R, 800GBASE-R and 1.6TBASE-R whenever the AUIs or PMDs run at 200G per lane.\n\nThe signalling is [[PAM4]] throughout, and the three pages that follow — level mapping, precoding, and equalisation — are really one argument about burst errors seen from three angles.",
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
          "NRZ sends one bit per symbol using two levels. PAM4 sends two bits per symbol using four. For a given bit rate that halves the baud rate, which is what makes 200 Gb/s on a single lane achievable with electronics and optics that top out near 106 GBd.\n\nThe cost is signal-to-noise ratio, and it is large. The four levels have to fit inside the same amplitude range the two levels used, so the spacing between adjacent levels is a third of the NRZ spacing. That works out to a detection penalty of about **9.5 dB** relative to NRZ — a figure worth remembering, because it is the reason FEC went from optional to mandatory at these rates. PAM4 did not make links slightly worse; it made them unusable without strong error correction, and the industry accepted that trade because the alternative was doubling the baud rate.\n\nEverything else in this sublayer is damage control for that decision.",
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
          "Two bits have to be mapped onto four levels, and the mapping is a free choice. Gray coding picks the one where adjacent levels differ in exactly one bit position.\n\nThe reason is the shape of the errors. Noise moves a symbol to an adjacent level far more often than it moves it two levels, so almost every symbol error is a neighbour error. Under Gray coding a neighbour error produces exactly **one** wrong bit. Under a naive binary mapping some neighbour pairs differ in both bits, so the same physical event would produce two.\n\nThis matters more than it sounds, because of how FEC counts. Halving the bits damaged per symbol error directly improves what the Reed-Solomon decoder sees, for no hardware cost at all — it is purely a choice of which bit pattern labels which level.",
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
          "A high-loss channel smears each symbol into the ones after it. Equalisers undo that. Continuous-time linear equalisation boosts high frequencies before slicing; feed-forward equalisation applies a filter; and **decision feedback equalisation** subtracts the estimated interference caused by symbols that have already been decided.\n\nThat last one has a trap built into its name. DFE subtracts based on *decisions*, so if a decision was wrong, it subtracts the wrong thing and makes the next decision more likely to be wrong too. A single error becomes a burst.\n\nThe arithmetic is unpleasantly concrete. For a one-tap DFE with a tap coefficient of 1, a wrong decision gives roughly a **3/4 probability** that the next symbol is also wrong, so the probability of k consecutive errors goes as **(3/4)ᵏ**. Bursts tend to show a characteristic alternating pattern and terminate when the equalised signal falls out of range. Tap weights are bounded by the standard — 802.3cd limits the first tap to 0.7 and the rest to 0.2 — precisely to keep this behaviour in a range the FEC can absorb.\n\nSo a significant share of the burstiness that drove the interleaving and multiplexing decisions in the FEC block is not the channel. It is the receiver's own equaliser.",
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
          "Precoding is a small transformation applied at the transmitter — **1/(1+D) mod 4**, first defined for PAM4 in 802.3cd — and undone at the receiver. Its purpose is narrow and specific: to break up the error bursts that DFE error propagation creates.\n\nThe status is worth noting because it is unusual. Precoding is **mandatory to implement** in the transmitter but **optional to use**: the link can enable or disable it depending on the receiver architecture and how badly that receiver propagates errors. So every compliant transmitter has the machinery, and whether it is switched on is a property of the pairing rather than of either end alone.\n\nIn P802.3dj, precoding appears for CR, KR, C2C and C2M links, and is one of the options a chip-to-module link training session can negotiate. It is also referenced for optical transmitters where a burst-error-prone receiver is in play.",
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
          "The PMA takes n lanes in and produces m lanes out. How it interleaves them turns out to matter for error performance, which is why this apparently mechanical function has been redesigned at 200G per lane.\n\n**Bit multiplexing** takes bits from the input lanes in turn. It is simple and it is what earlier generations use — 2:1 for 100GbE in Clause 120.5.2, and 32:8 restricted bit-level multiplexing for 800G in Clause 173. Its drawback is that a burst on one physical lane is scattered across several FEC symbols, and since Reed-Solomon counts damage in symbols, scattering is expensive.\n\n**Symbol multiplexing** keeps Reed-Solomon symbols intact across the multiplexing boundary, so a channel burst stays inside fewer of them. Analysis presented to the task force showed the bit-multiplexing penalty grows with the ratio — 4:1 is worse than 2:1, and 8:1 for 200G per lane would be worse still. Clause 176 defines the symbol-multiplexing PMA that resulted, with 1.6T variants including 16:8 and 16:16.\n\nThe thing to hold onto: this is a **PMA** change. The PCS above forms its lanes the same way regardless.",
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
          "1.6T": [["Framework", "Table 174-5", { draft: true }], ["SP2 and SP5", "not populated — no physically instantiated PMD service interface is defined for any dj PHY", { draft: true }]],
        },
        sections: [
          {
            id: "pma-skew-read", name: "Reading the budget",
            body:
              "The values are **cumulative**, not per-component. 29 ns at SP1 is the total permitted by the time the signal leaves the transmit PMA; 54 ns at SP3 is the total permitted by the time it reaches the medium. So the amount any one stage may add is the difference between its point and the previous one.\n\nThe largest single allocation is the medium — from 54 ns to 134 ns, so 80 ns for the fibre itself. That reflects physics rather than generosity: parallel fibres in a cable have different effective lengths, and skew in parallel fibre depends partly on how the cable is bent. A task-force proposal cited figures as high as roughly 45 ps per metre for heavily bent parallel fibre, though that is a bounding case rather than a specification value.\n\nThe last row is worth noting: 180 ns at the PCS receive, beyond the 160 ns at SP6. That extra allowance covers skew generated inside the receiving device itself, after the signal has crossed the pins.",
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
      "The PMD is what changes when you change media. Everything above it is deliberately insulated from that choice, which is why one switch ASIC drives a DR4 module or an FR4 module with identical logic.\n\nThere are really only two optical strategies, and every PHY name is one or the other. **Parallel** optics give each lane its own fibre, one wavelength per fibre, which needs simple optics and a lot of strands. **WDM** optics put every lane on a single fibre pair as separate wavelengths, which needs more complex optics and far fewer strands. That is the entire trade, and which side wins depends on something no datasheet knows: whether you already own the fibre.\n\nThe naming conventions are learnable, with one recent exception that breaks them — see the page on reading a PHY name.",
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
          "A PHY name is four pieces of information stuck together, and once you can read it you can infer most of a module's properties without a datasheet.\n\nTake **1.6TBASE-DR8-2**. The rate is 1.6 Tb/s. BASE means baseband signalling. **DR** is the media class — parallel single-mode, one wavelength per fibre. **8** is the number of lanes, and for a parallel PMD that means eight fibre pairs. The trailing **-2** means two kilometres rather than the 500 m the class would otherwise imply.\n\nThe media letters are the part worth memorising: **D** for parallel single-mode, **F** and **L** and **E** for progressively longer single-mode reaches, **S** and **V** for multimode, **C** for copper cable assemblies, **K** for backplane.",
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
              "For a parallel PMD the lane count is also a fibre count. Each lane needs a strand in each direction, so an eight-lane parallel PHY such as 1.6TBASE-DR8 occupies sixteen strands. A four-lane parallel PHY occupies eight.\n\nFor a WDM PMD the lane count tells you the number of wavelengths, not the number of fibres. Every WDM part — FR4, FR8, LR4, LR8 — carries all its lanes on a single fibre pair, so it is two strands regardless of the number in the name.\n\nThis is the single most common source of surprise when a cabling plant is sized for one generation and reused for the next: moving from a four-lane parallel part to an eight-lane parallel part doubles the strand count and can change the connector, which is a cabling project rather than a transceiver swap.",
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
              "The measurement is taken from an eye diagram, but not with a mask. Two vertical histograms are taken across the eye, centred at **0.45 and 0.55 unit intervals**, each spanning all four PAM4 levels. The noise captured in those histograms is compared with what an ideal receiver would see, and the difference in dB is the penalty.\n\nTwo details distinguish it from the older TDP test. It uses **symbol** error ratio rather than bit error ratio, because each PAM4 symbol carries two bits. And instead of comparing against a physical reference transmitter, a **virtual** reference is constructed mathematically from the measured optical modulation amplitude of the device under test — which removes the need for a golden transmitter in every test lab.\n\nThe reference receiver includes an equaliser, so the result naturally separates into penalties the equaliser can remove and penalties it cannot. Low-pass filtering of the waveform mostly lands in the equalisable part; amplitude noise, compression and eye skew mostly land in the part that cannot be equalised away.",
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
                opts: ["Yes, one of the tests is broken", "No — TDECQ accounts for the receiver's equaliser, which a static mask cannot",
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
          "A DR PMD gives every lane its own fibre pair and uses a single wavelength on each. The optics are as simple as they can be — no multiplexer, no demultiplexer, no per-wavelength wavelength control — which is what makes them cheap to build at volume.\n\nThe cost is strands. DR4 is eight, DR8 is sixteen, and the connector grows with them.\n\nDR is also the family with the most consistent 500 m target, and the 2 km variants are spelled with a trailing -2: 400GBASE-DR4-2, 800GBASE-DR8-2, 1.6TBASE-DR8-2. All of 1.6T's standardised optical PMDs are DR: there is no WDM 1.6T PHY among the 802.3dj objectives.",
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
          "A WDM PMD carries every lane as a different wavelength on a single fibre pair. That needs a multiplexer and demultiplexer and tighter wavelength control, so the optics cost more — and it needs only two strands no matter how many lanes the name implies.\n\nThis family also covers the longer reaches. FR is the shorter of the two traditionally, LR longer, and ER longer still.\n\nWorth noting for the 1.6T column: there is no WDM 1.6T PHY in the 802.3dj objectives. At 1.6T the standardised optical options are parallel only.",
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
      "The medium is not really a sublayer — it is the thing the sublayers above are compensating for. Every decision you have read about on the way down this stack exists because of some property of a piece of glass or copper.\n\nThe practical question at these rates is rarely 'will it work' and more often 'how many strands does it take, and do I already have them'. That arithmetic is covered under the PMD pages.\n\nFibre types, loss and dispersion budgets, and copper insertion loss are not yet researched here.",
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
      "AUI is where most 800G and 1.6T confusion lives, because the electrical lane count and the optical lane count need not match — and the AUI name tells you the electrical one.\n\nThe naming is arithmetic: the suffix is the number of electrical lanes. **1.6TAUI-16** is sixteen lanes at 100G each; **1.6TAUI-8** is eight lanes at 200G each. Same rate, same prefix, different SerDes generation. An 800G port might be 800GAUI-8 into a module that is optically 800GBASE-DR8, or 800GAUI-4 into one that is 800GBASE-DR4 — and reading a part number correctly means knowing which number you are looking at.\n\nEvery AUI comes in two flavours with different budgets: **C2C** (chip to chip, across a board) and **C2M** (chip to module, ending at a connector). The error budget is tight: each AUI is allowed **1 × 10⁻⁵** at 100G per lane, against 2.4 × 10⁻⁴ for the whole optical link.",
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
          "A C2C channel runs between two devices on a board, and both ends are under one designer's control. A C2M channel runs from a host device to a pluggable module and stops at a connector — so the host is designed by one company, the module by another, and neither has seen the other's half.\n\nThat difference is the whole reason the two are specified separately. C2M needs the budget explicitly split at the connector, with compliance points defined either side, so a compliant host and a compliant module interoperate without either vendor testing against the other. In 802.3dj the C2M specifications live in Annex 176D.\n\nThe practical consequence for anyone debugging: a C2M problem is a shared-boundary problem, and the first useful question is which side of the connector owns the loss.",
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
          "COM is the modern way an electrical channel is qualified. It is a figure of merit in dB computed from the channel's scattering parameters together with the specified behaviour of a reference transmitter and receiver — including the transmitter's equaliser and the receiver's equalisation and sensitivity. A channel passes if its COM exceeds a threshold, which in practice sits in the **2 to 3 dB** range, with the exact value given by the relevant specification.\n\nIt was introduced in **802.3bj** in 2014 and is specified in **Annex 93A**. Unusually for a standard, the reference implementation is published as code, which is what made it stick: everyone computes the same number the same way.\n\nWhat COM replaced is the interesting part.",
        params: { all: [["What it is", "a figure of merit in dB"], ["Computed from", "channel S-parameters plus reference TX and RX behaviour"], ["Pass criterion", "COM above a threshold, typically 2 to 3 dB"], ["Introduced in", "802.3bj, 2014"], ["Specified in", "Annex 93A"], ["dj backplane use", "Annex 178A"], ["Statistical basis", "linear time-invariant assumptions"]] },
        sections: [
          {
            id: "aui-budget-why", name: "Why it replaced hard limits",
            body:
              "The older approach set rigid frequency-domain limits — insertion loss, insertion loss deviation, crosstalk — each with its own hard pass/fail line. The problem was that those limits could not trade against one another. A channel with unusually low loss can comfortably tolerate more crosstalk, but under hard limits it fails the crosstalk line anyway. The result was systematic overdesign: channels built to satisfy every limit independently rather than to work.\n\nCOM makes the trade explicit by rolling the impairments into one statistical calculation. It also folds in things the old frequency-domain parameters ignored entirely: losses inside the IC, package reflections, IC-related jitter, and a lumped noise term for everything else. And because the reference transmitter and receiver equalisation are specified as part of the algorithm, two vendors computing COM on the same channel get the same answer — which the old approach never guaranteed, since it left reference equalisation undefined.",
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
          "On an electrical link, the receiver is the only party that knows what the channel did to the signal. Link training is the mechanism by which it tells the transmitter to adjust — a negotiation over the link itself, before data flows, in which the receiver requests changes to the transmitter's equaliser coefficients and the transmitter reports back.\n\nThis is distinct from autonegotiation. Autonegotiation selects *what* to run; training tunes *how well* it runs, and does not change the rate or the PHY type.\n\nIn 802.3dj, electrical link training is specified in **Annex 176A**, and **precoding** is one of the options a session can negotiate — which fits the pattern from the PMA pages, where precoding is mandatory to implement and optional to use. Training is where that option actually gets exercised.\n\nThe detailed state machines and frame formats are not researched here.",
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
    id: "retimer", name: "Retimed or linear", alias: "module DSP versus linear drive", zone: "signal", written: true, group: "iface",
    clause: { all: "industry practice; not an IEEE distinction" },
    face: { all: "DSP, LPO or LRO" },
    summary: "Whether the module re-clocks the signal or just amplifies it.",
    intro:
      "A **retimed** module contains a DSP that recovers the data, cleans it up and re-transmits it. A **linear** module does not: it amplifies, and leaves the equalisation work to the host ASIC's SerDes. The optical and electrical specifications do not change; what changes is which side of the connector does the signal processing.\n\nThis is industry terminology, not IEEE terminology. There is no clause that defines LPO. But it matters to this page because it decides where the burden lands — and the AUI and COM pages are where that burden is measured.\n\nThe motivation is power. A retimed 800G module can draw around 17 W; fill a 64-port switch with them and the optics alone exceed a kilowatt before the switch ASIC draws anything. Removing the DSP is reported to cut module power by roughly 40 to 50 percent, with typical figures around 8 to 12 W against 18 to 22 W retimed. These are vendor figures, not specification values.",
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
          "Removing the DSP saves power and removes the latency that retiming adds, which is why linear optics get attention in AI fabrics where both matter.\n\nThe costs are real and they land on the host. Without a module DSP, the host board's signal integrity has to be good enough on its own, so the electrical channel requirements tighten. Reach is reduced. And because performance now depends on the pairing of a specific host with a specific module rather than on each independently meeting a spec, **interoperability becomes a qualification exercise** — exactly the property that C2M specifications were designed to avoid.\n\nThe common industry guidance is to stay retimed beyond a few hundred metres, in multi-vendor environments where every pairing cannot be qualified, and anywhere dispersion management matters. There is also a view that at 200G per lane, linear receive-only designs may prove more deployable than fully linear ones.",
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
    id: "form", name: "Form factors", alias: "QSFP-DD, OSFP, OSFP-XD", zone: "signal", written: true, group: "iface",
    clause: { all: "MSA, not IEEE 802.3" },
    face: { "400G": "QSFP-DD, OSFP", "800G": "QSFP-DD, OSFP", "1.6T": "OSFP-XD, OSFP1600" },
    summary: "Mechanical and thermal envelopes, defined outside IEEE.",
    intro:
      "Form factors are **MSA** territory, not 802.3. IEEE defines the PMD and the electrical interface; the multi-source agreement groups define the cage, the connector, the thermal envelope and the management interface. IEEE liaises with them — there is correspondence on record between the task force and the MSA groups — but you will not find OSFP in the standard.\n\nThey belong on this page anyway, because the mechanical envelope constrains what the standard can assume. A form factor decides how many electrical lanes reach the module and how many watts it may dissipate, and those two numbers bound which PMDs are physically deployable.\n\nThe rule connecting them is simple: the lane count in the AUI name has to be a number of lanes the cage actually carries.",
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
          "OSFP carries **eight** electrical lanes. OSFP-XD doubles that to **sixteen**, which is what lets it reach 1.6T with 16 lanes of 100G — and leaves headroom for 3.2T later with 16 lanes of 200G. The two are deliberately **not** mechanically compatible, and the XD cages carry keying features specifically to stop someone inserting an OSFP module into an XD port.\n\nThat gives 1.6T more than one home, and the choice is about thermal headroom and ecosystem rather than bandwidth. A 1.6T module can be eight lanes of 200G in an OSFP-class cage, or sixteen lanes of 100G in OSFP-XD. A QSFP-DD-lineage option exists too, and is attractive where port density and reuse of the existing QSFP ecosystem matter more than power headroom.\n\nThis is the practical reason the AUI page insists that the electrical lane count and the optical lane count are separate facts. 1.6TAUI-8 and 1.6TAUI-16 are not two ways of saying the same thing — they are two different cages, two different SerDes generations, and two different procurement decisions.",
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
      "MACsec is drawn to one side deliberately. It is a sublayer above the MAC, not a stage in the PHY pipeline, and putting it in the main column would teach the wrong layering.\n\nIt is also a different standard from a different working group: IEEE 802.1AE, not 802.3. It provides confidentiality, integrity and authenticity on a point-to-point link, frame by frame, and it is a link-layer mechanism rather than an end-to-end one — each hop decrypts and re-encrypts.\n\nIts relevance to this page is arithmetic. MACsec makes every frame bigger, and frame size is what determines how much of your headline rate becomes payload.",
    params: { all: [["Standard", "IEEE 802.1AE"], ["Position", "above the MAC"], ["Scope", "point to point, per hop"], ["Adds", "a SecTAG before the payload and an ICV after it"], ["Key agreement", "MKA, defined in 802.1X"]] },
    subs: [
      {
        id: "macsec-frame", name: "What encryption adds to a frame", alias: "SecTAG and ICV", dir: "both", written: true,
        clause: { all: "IEEE 802.1AE" },
        summary: "Between 16 and 32 extra octets per frame.",
        intro:
          "MACsec inserts a **SecTAG** — a protocol header identifying the key in use and providing replay protection — and appends an **integrity check value** after the payload.\n\nNeither field is a fixed size. The SecTAG is 8 to 16 octets: 16 when the optional secure channel identifier is encoded, 8 when it is omitted. The ICV is 8 to 16 octets depending on the cipher suite, and is 16 for the common GCM-AES suites. So the overhead per frame runs from about 16 octets at the lean end to **32 octets** in the usual configuration.\n\nThat is a fixed cost per frame, not per octet, which means it hurts small frames far more than large ones. On a stream of 64-octet frames, 32 extra octets is a very large proportional addition; on 1500-octet frames it is close to noise. If you have read the goodput page under the MAC, this is the same argument with a different constant.",
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
    id: "ptp", name: "Time synchronisation", alias: "Clause 90 TimeSync, cross-cutting", zone: "framing", written: true, group: "aside",
    clause: { "400G": "Clause 90", "800G": "Clause 90", "1.6T": "Clause 90, with 175.6 and 177.7 (draft)" },
    face: { all: "a reference point" },
    summary: "Not a block. A timestamping reference point inside the PHY.",
    intro:
      "Time sync is not a sublayer. It defines a point in the PHY at which timestamps are taken, and requires known and bounded latency between that point and the medium. Each sublayer that adds delay has to report it.\n\nOne confirmed detail shows how this bites at 1.6T. Clause 175.6 requires the 1.6TBASE-R PCS to report transmit and receive path data delays as if the measurement point sits **at the start of the set of four interleaved FEC codewords**, with maximum and minimum values in nanoseconds and optionally sub-nanoseconds. The Inner FEC has its own delay figures and needed its own TimeSync MDIO registers added during ballot — a concrete example of a new sublayer creating new timing obligations.",
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
          "Timestamping needs a known reference point and a known delay from that point to the wire. So each sublayer is required to report its transmit and receive **path data delay**, with maximum and minimum values, and the mechanism for that reporting is described in Clause 90.7.\n\nThe maximum and minimum matter more than any single figure. A large but perfectly known delay can be subtracted out. A delay that varies between the two bounds cannot, and the spread is what limits achievable accuracy — which is why a sublayer with low but uncertain latency can be worse for timing than one with high, stable latency.\n\n1.6T shows how this ripples. Clause 175.6 requires the PCS to report its delays as though measured at the start of the set of interleaved FEC codewords, in nanoseconds and optionally sub-nanoseconds. And because 802.3dj adds an **Inner FEC** — a new sublayer in the path — that sublayer needed its own delay figures and its own TimeSync MDIO registers, which were added during ballot. Every new block in the stack creates a new timing obligation.",
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
    id: "autoneg", name: "Autoneg and link training", alias: "copper and backplane, not optics", zone: "signal", written: true, group: "aside",
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

const CORE = ["mac", "rs", "pcs", "fec", "pma", "pmd", "medium"];
const IFACE = ["aui", "retimer", "form"];
const ASIDE = ["macsec", "ptp", "autoneg"];

/* ===========================================================================
   STEPPER  —  the hero. The payload visibly transforms at each stage.
   =========================================================================== */
/* pcs: PCS lane count. null where the sources used for this page do not
   confirm it — the UI must then fall back to physical lanes and say so. */
const LANES = {
  "400G": { pcs: 16, phys: 4, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
  "800G": { pcs: 32, phys: 8, laneRate: "106.25 Gb/s", baud: "53.125 GBd" },
  "1.6T": { pcs: null, phys: 8, laneRate: "212.5 Gb/s", baud: "106.25 GBd" },
};

const STAGES = [
  {
    id: "frame", block: "mac", title: "A frame leaves the MAC",
    shape: "octets",
    note: "The MAC hands down octets: addresses, type, payload, and a CRC-32 at the end. Nothing here depends on the rate.",
    count: (r) => "64 octets minimum",
  },
  {
    id: "encode", block: "pcs", title: "Coded into 66-bit blocks",
    shape: "block66",
    note: "Each 64 bits gains a two-bit sync header. 01 for data, 10 for control. The stream is now self-describing and costs 3.125 percent to be so.",
    count: () => "66 bits per block, 3.125 percent overhead",
  },
  {
    id: "transcode", block: "pcs", title: "Four blocks become one",
    shape: "block257",
    note: "Four 66-bit blocks are transcoded into a single 257-bit block. Overhead falls to 0.39 percent, and the room recovered is what pays for parity.",
    count: () => "264 bits in, 257 out",
  },
  {
    id: "scramble", block: "pcs", title: "Scrambled",
    shape: "scrambled",
    note: "Combined with a self-synchronous shift register so the line has transitions and no DC imbalance. The data is unchanged in content and unrecognisable in appearance.",
    count: () => "x^58 + x^39 + 1",
  },
  {
    id: "am", block: "pcs", title: "Alignment markers inserted",
    shape: "marker",
    note: "One marker per lane, periodically. Common part for boundary and presence, unique part for identity, plus per-lane error monitoring.",
    count: (r) => (LANES[r].pcs ? LANES[r].pcs + " lanes to identify" : "one marker per lane"),
  },
  {
    id: "fec", block: "fec", title: "Parity appended",
    shape: "codeword",
    note: "A group of 40 transcoded blocks becomes two 5140-bit messages; each gains 30 parity symbols. The decoder can repair fifteen damaged symbols per codeword.",
    count: (r) => (r === "1.6T" ? "RS(544,514) outer, plus an inner code" : "RS(544,514), corrects 15 symbols"),
  },
  {
    id: "stripe", block: "fec", title: "Striped across lanes",
    shape: "lanes",
    note: "Two codewords are interleaved ten bits at a time, then dealt one symbol per lane. How they are mapped decides whether a channel burst costs three symbols or thirty.",
    count: (r) => (r === "1.6T"
      ? "symbol multiplexed in the PMA (Clause 176)"
      : LANES[r].pcs + " PCS lanes, bit multiplexed below"),
  },
  {
    id: "serialise", block: "pma", title: "Mapped onto physical lanes",
    shape: "phys",
    note: "The PMA folds the logical lanes onto however many physical lanes this variant has. This is the step that lets one PCS serve four-lane and eight-lane interfaces alike.",
    count: (r) => LANES[r].phys + " physical lanes at " + LANES[r].laneRate,
  },
  {
    id: "pam4", block: "pmd", title: "Sent as PAM4 symbols",
    shape: "pam4",
    note: "Two bits per symbol, four amplitude levels. Half the baud rate of NRZ for the same throughput, at the cost of roughly a third of the eye opening per level.",
    count: (r) => LANES[r].baud + " per lane",
  },
];

/* deterministic pseudo-random for the scrambled look, so it does not flicker */
function prand(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function StageArt({ stage, rate }) {
  const W = 620, H = 150;
  const s = stage.shape;
  const cells = [];

  if (s === "octets") {
    for (let i = 0; i < 12; i++)
      cells.push(<rect key={i} x={20 + i * 48} y={55} width={42} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={20} y={124} fill={C.faint} fontSize="11" fontFamily={C.mono}>octets from the MAC</text>);
  }

  if (s === "block66") {
    cells.push(<rect key="h1" x={20} y={55} width={26} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    cells.push(<rect key="h2" x={48} y={55} width={26} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    for (let i = 0; i < 8; i++)
      cells.push(<rect key={i} x={82 + i * 66} y={55} width={60} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={20} y={46} fill={C.signal} fontSize="11" fontFamily={C.mono}>sync header</text>);
    cells.push(<text key="l2" x={82} y={46} fill={C.faint} fontSize="11" fontFamily={C.mono}>64 bits of payload</text>);
  }

  if (s === "block257") {
    for (let g = 0; g < 4; g++) {
      cells.push(<rect key={"g" + g} x={20 + g * 60} y={38} width={54} height={24} rx={2} fill={C.ink3} stroke={C.rule} />);
      cells.push(<rect key={"gh" + g} x={20 + g * 60} y={38} width={8} height={24} fill={C.signalDim} />);
    }
    cells.push(<text key="lt" x={272} y={54} fill={C.faint} fontSize="11" fontFamily={C.mono}>4 x 66 bits</text>);
    cells.push(<path key="ar" d="M 130 70 L 130 84" stroke={C.signal} strokeWidth="1.4" />);
    cells.push(<polygon key="ah" points="126,82 134,82 130,90" fill={C.signal} />);
    cells.push(<rect key="out" x={20} y={96} width={8} height={30} fill={C.signal} />);
    cells.push(<rect key="out2" x={30} y={96} width={330} height={30} rx={2} fill={C.ink3} stroke={C.signal} />);
    cells.push(<text key="lo" x={372} y={116} fill={C.signal} fontSize="11" fontFamily={C.mono}>1 x 257 bits</text>);
  }

  if (s === "scrambled") {
    for (let i = 0; i < 40; i++) {
      const v = prand(i);
      cells.push(<rect key={i} x={20 + i * 15} y={55} width={12} height={40} rx={1}
        fill={v > 0.5 ? C.ink3 : "#233240"} stroke={C.rule} strokeWidth="0.6" />);
    }
    cells.push(<text key="l" x={20} y={124} fill={C.faint} fontSize="11" fontFamily={C.mono}>same content, no recognisable pattern</text>);
  }

  if (s === "marker") {
    cells.push(<rect key="am" x={20} y={55} width={120} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    cells.push(<text key="amt" x={30} y={80} fill={C.signal} fontSize="11" fontFamily={C.mono}>AM</text>);
    cells.push(<rect key="cm" x={62} y={61} width={34} height={28} rx={2} fill="none" stroke={C.signalDim} strokeDasharray="2 2" />);
    cells.push(<rect key="um" x={100} y={61} width={34} height={28} rx={2} fill="none" stroke={C.signalDim} strokeDasharray="2 2" />);
    for (let i = 0; i < 7; i++)
      cells.push(<rect key={i} x={150 + i * 66} y={55} width={60} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={62} y={110} fill={C.faint} fontSize="10" fontFamily={C.mono}>common</text>);
    cells.push(<text key="l2" x={100} y={124} fill={C.faint} fontSize="10" fontFamily={C.mono}>unique</text>);
  }

  if (s === "codeword") {
    cells.push(<rect key="m" x={20} y={55} width={430} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="mt" x={32} y={80} fill={C.dim} fontSize="12" fontFamily={C.mono}>514 message symbols</text>);
    for (let i = 0; i < 10; i++)
      cells.push(<rect key={"p" + i} x={456 + i * 15} y={55} width={12} height={40} rx={1} fill={C.signalWash} stroke={C.signal} strokeWidth="0.8" />);
    cells.push(<text key="pt" x={456} y={124} fill={C.signal} fontSize="11" fontFamily={C.mono}>30 parity symbols</text>);
    cells.push(<text key="st" x={20} y={46} fill={C.faint} fontSize="10" fontFamily={C.mono}>one symbol = 10 bits; damage is counted in symbols</text>);
  }

  if (s === "lanes" || s === "phys") {
    const n = s === "lanes" ? LANES[rate].pcs : LANES[rate].phys;
    const rows = Math.min(n, 16);
    const rh = Math.max(6, Math.floor(110 / rows) - 2);
    for (let i = 0; i < rows; i++) {
      const y = 28 + i * (rh + 2);
      cells.push(<rect key={"l" + i} x={70} y={y} width={470} height={rh} rx={1}
        fill={i % 2 ? C.ink3 : "#1d2b38"} stroke={C.rule} strokeWidth="0.5" />);
      if (s === "phys")
        cells.push(<rect key={"s" + i} x={70} y={y} width={470} height={rh} rx={1} fill={C.signalWash} stroke={C.signalDim} strokeWidth="0.5" />);
    }
    cells.push(<text key="t" x={20} y={34} fill={C.faint} fontSize="10" fontFamily={C.mono}>lane 0</text>);
    cells.push(<text key="t2" x={20} y={28 + (rows - 1) * (rh + 2) + rh} fill={C.faint} fontSize="10" fontFamily={C.mono}>{"lane " + (rows - 1)}</text>);
    cells.push(<text key="t3" x={548} y={78} fill={s === "phys" ? C.signal : C.dim} fontSize="11" fontFamily={C.mono}>{n}</text>);
  }

  if (s === "pam4") {
    const levels = [40, 68, 96, 124];
    const seq = [0, 2, 3, 1, 2, 0, 1, 3, 3, 2, 0, 1, 1, 3, 2, 0];
    let d = "M 20 " + levels[seq[0]];
    seq.forEach((v, i) => {
      const x1 = 20 + (i + 1) * 37;
      d += " L " + x1 + " " + levels[v];
      if (i < seq.length - 1) d += " L " + x1 + " " + levels[seq[i + 1]];
    });
    levels.forEach((y, i) => {
      cells.push(<line key={"g" + i} x1={20} y1={y} x2={612} y2={y} stroke={C.ruleSoft} strokeWidth="0.8" strokeDasharray="2 4" />);
      cells.push(<text key={"gt" + i} x={0} y={y + 4} fill={C.faint} fontSize="10" fontFamily={C.mono}>{3 - i}</text>);
    });
    cells.push(<path key="w" d={d} stroke={C.signal} strokeWidth="1.6" fill="none" />);
    cells.push(<text key="l" x={20} y={144} fill={C.faint} fontSize="10" fontFamily={C.mono}>four levels, two bits per symbol</text>);
  }

  return (
    <svg viewBox={"0 0 " + W + " " + H} style={SVG_STYLE}>
      {cells}
    </svg>
  );
}

function Stepper({ rate, onExit }) {
  const [i, setI] = useState(0);
  const st = STAGES[i];
  const blockName = DATA[st.block] ? DATA[st.block].name : "";

  return (
    <div style={{ border: "1px solid " + C.signalDim, borderRadius: 8, background: C.ink2, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "14px 18px 0" }}>
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.signal }}>{(i + 1) + " / " + STAGES.length}</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>{st.title}</div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.faint, marginLeft: "auto" }}>{blockName + "  ·  " + rate}</div>
      </div>

      <div style={{ padding: "8px 18px 0" }}>
        <StageArt stage={st} rate={rate} />
      </div>

      <div style={{ padding: "4px 18px 0", fontFamily: C.mono, fontSize: 12, color: C.signal }}>{st.count(rate)}</div>
      <div style={{ padding: "8px 18px 16px", fontSize: 14.5, color: C.dim, maxWidth: "70ch", lineHeight: 1.6 }}>{st.note}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px 16px", flexWrap: "wrap" }}>
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} style={btn(i === 0)}>Back</button>
        <button onClick={() => setI(Math.min(STAGES.length - 1, i + 1))} disabled={i === STAGES.length - 1} style={btn(i === STAGES.length - 1, true)}>
          {i === STAGES.length - 1 ? "At the medium" : "Next"}
        </button>
        <button onClick={onExit} style={{ ...btn(false), marginLeft: "auto" }}>Back to the stack</button>
      </div>

      <div style={{ display: "flex", borderTop: "1px solid " + C.rule }}>
        {STAGES.map((s, k) => (
          <button key={s.id} onClick={() => setI(k)} title={s.title}
            style={{
              flex: 1, height: 6, border: 0, padding: 0, cursor: "pointer",
              background: k <= i ? C.signal : C.rule,
              opacity: k <= i ? 1 : 0.6,
            }} />
        ))}
      </div>
    </div>
  );
}

function btn(disabled, primary) {
  return {
    font: "inherit", fontSize: 13.5, cursor: disabled ? "default" : "pointer",
    padding: "7px 16px", borderRadius: 5,
    border: "1px solid " + (primary && !disabled ? C.signal : C.rule),
    background: primary && !disabled ? C.signal : "transparent",
    color: disabled ? C.faint : primary ? "#221704" : C.text,
    fontWeight: primary ? 600 : 400,
    opacity: disabled ? 0.5 : 1,
  };
}

/* ===========================================================================
   RATE-KEYED ACCESSORS
   ---------------------------------------------------------------------------
   Any field may be given per rate, or as "all" for a rate-independent value.
   =========================================================================== */
function pick(map, rate) {
  if (!map) return null;
  if (map[rate] !== undefined) return map[rate];
  if (map.all !== undefined) return map.all;
  return null;
}

/* lane count annotated on the connectors between sublayers */
function laneLabel(id, rate) {
  const L = LANES[rate];
  if (!L) return null;
  if (id === "pcs" || id === "fec") return L.pcs ? L.pcs + " PCS lanes" : null;
  if (id === "pma" || id === "pmd") return L.phys + " physical lanes";
  return null;
}

/* ===========================================================================
   DIAGRAMS
   ---------------------------------------------------------------------------
   Declared in VISUALS, keyed by node id, and rendered in the panel beside the
   text they belong to. A page gets a diagram only if a picture says something
   the prose cannot; most pages have none, and that is the intended state.

   types: bitfield | symbols | lanes | fold | skew | states | curve | wave
          | spans | compare
   Any numeric field may be keyed by rate.
   =========================================================================== */

const VISUALS = {
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

function Diagram({ spec, rate, nested, constrain }) {
  if (!spec) return null;

  const R = (v) => (v && typeof v === "object" && !Array.isArray(v))
    ? (v[rate] !== undefined ? v[rate] : v.all) : v;

  const caption = spec.captionByRate
    ? (spec.captionByRate[rate] !== undefined ? spec.captionByRate[rate] : spec.caption)
    : spec.caption;

  if (spec.type === "compare") {
    const render = (constrain) => (
      <div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.dim, margin: "0 0 4px" }}>{spec.labels[0]}</div>
        <Diagram spec={spec.a} rate={rate} nested constrain={constrain} />
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.signal, margin: "14px 0 4px" }}>{spec.labels[1]}</div>
        <Diagram spec={spec.b} rate={rate} nested constrain={constrain} />
      </div>
    );
    if (nested) return render(constrain !== false);
    return <Figure title={spec.title} caption={caption} render={render} />;
  }

  const W = 700, X0 = 26, SPAN = 648;
  let H = 150;
  const g = [];

  /* ------------------------------------------------------------- bitfield */
  if (spec.type === "bitfield") {
    const total = spec.fields.reduce((a, f) => a + f.w, 0);
    const compact = spec.compact;
    const y = spec.ruler ? 46 : 26, bh = compact ? 34 : 48;
    let x = X0;

    if (spec.ruler) {
      g.push(<line key="rl" x1={X0} y1={y - 12} x2={X0 + SPAN} y2={y - 12} stroke={C.ruleSoft} strokeWidth="0.8" />);
      let acc = 0;
      spec.fields.forEach((f, i) => {
        const px = X0 + (acc / total) * SPAN;
        g.push(<line key={"rt" + i} x1={px} y1={y - 16} x2={px} y2={y - 8} stroke={C.rule} strokeWidth="0.8" />);
        if (i === 0 || (f.w / total) * SPAN > 40)
          g.push(<text key={"rx" + i} x={px + 3} y={y - 19} fill={C.faint} fontSize="10" fontFamily={C.mono}>{acc}</text>);
        acc += f.w;
      });
      g.push(<text key="rend" x={X0 + SPAN} y={y - 19} textAnchor="end" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>{total + " bits"}</text>);
    }

    spec.fields.forEach((f, i) => {
      const w = (f.w / total) * SPAN;
      const fill = f.accent ? C.signalWash : f.alt ? "#1c2536" : C.ink3;
      const stroke = f.accent ? C.signal : f.alt ? "#42586d" : C.rule;
      g.push(<rect key={"r" + i} x={x} y={y} width={Math.max(w - 1.5, 1)} height={bh} rx={2} fill={fill} stroke={stroke} strokeWidth="1" />);
      if (w > 44) {
        g.push(<text key={"t" + i} x={x + w / 2} y={y + (f.note && !compact ? bh / 2 : bh / 2 + 4)} textAnchor="middle"
          fill={f.accent ? C.signal : C.dim} fontSize="11" fontFamily={C.mono}>{f.label}</text>);
        if (f.note && !compact)
          g.push(<text key={"n" + i} x={x + w / 2} y={y + bh / 2 + 15} textAnchor="middle" fill={C.faint} fontSize="10" fontFamily={C.mono}>{f.note}</text>);
      } else {
        const ly = i % 2 === 0 ? y + bh + 17 : y + bh + 32;
        g.push(<line key={"l" + i} x1={x + w / 2} y1={y + bh + 2} x2={x + w / 2} y2={ly - 9} stroke={C.rule} strokeWidth="0.7" />);
        g.push(<text key={"t" + i} x={x + w / 2} y={ly} textAnchor="middle"
          fill={f.accent ? C.signal : C.faint} fontSize="10.5" fontFamily={C.mono}>{f.label}</text>);
      }
      x += w;
    });
    H = (spec.ruler ? 46 : 26) + (compact ? 34 : 48) + 44;
  }

  /* -------------------------------------------------------------- symbols */
  if (spec.type === "symbols") {
    const n = R(spec.n) || 24;
    const dam = spec.damaged || [];
    const parityFrom = spec.parityFrom;
    const cw = SPAN / n;
    const y = 44, bh = 44;
    for (let i = 0; i < n; i++) {
      const isDam = dam.indexOf(i) >= 0;
      const isPar = parityFrom !== undefined && i >= parityFrom;
      g.push(<rect key={i} x={X0 + i * cw} y={y} width={cw - 2} height={bh} rx={1.5}
        fill={isDam ? "#2b1a18" : isPar ? C.signalWash : C.ink3}
        stroke={isDam ? C.bad : isPar ? C.signal : C.rule} strokeWidth={isDam ? 1.3 : 0.9} />);
      if (isDam) g.push(<text key={"x" + i} x={X0 + i * cw + (cw - 2) / 2} y={y + bh / 2 + 4}
        textAnchor="middle" fill={C.bad} fontSize="11" fontFamily={C.mono}>{"\u00d7"}</text>);
      if (i % 4 === 0) g.push(<text key={"i" + i} x={X0 + i * cw + 2} y={y - 6} fill={C.faint} fontSize="10" fontFamily={C.mono}>{i}</text>);
    }
    if (parityFrom !== undefined) {
      g.push(<line key="pd" x1={X0 + parityFrom * cw - 1} y1={y - 2} x2={X0 + parityFrom * cw - 1} y2={y + bh + 2} stroke={C.signal} strokeWidth="1.2" />);
      g.push(<text key="pt" x={X0 + parityFrom * cw + 4} y={y + bh + 16} fill={C.signal} fontSize="10" fontFamily={C.mono}>30 parity</text>);
      g.push(<text key="mt" x={X0} y={y + bh + 16} fill={C.dim} fontSize="10" fontFamily={C.mono}>514 message</text>);
    }
    if (spec.unit)
      g.push(<text key="ut" x={X0} y={y + bh + 16} fill={C.faint} fontSize="10" fontFamily={C.mono}>{spec.unit}</text>);

    /* the fifteen-symbol budget, drawn as a meter */
    if (spec.budget) {
      const my = y + bh + 26, mw = 13, used = dam.length;
      for (let k = 0; k < 15; k++) {
        g.push(<rect key={"m" + k} x={X0 + k * (mw + 3)} y={my} width={mw} height={10} rx={1.5}
          fill={k < used ? (used > 15 ? C.bad : C.signal) : "transparent"}
          stroke={k < used ? (used > 15 ? C.bad : C.signal) : C.rule} strokeWidth="0.9" />);
      }
      g.push(<text key="mtx" x={X0 + 15 * (mw + 3) + 10} y={my + 9} fill={used > 15 ? C.bad : C.good} fontSize="11" fontFamily={C.mono}>
        {used > 15 ? used + " damaged, 15 correctable — codeword lost" : used + " of 15 spent"}</text>);
      H = my + 34;
    } else {
      H = y + bh + 34;
    }
    if (spec.scale)
      g.push(<text key="sc" x={X0 + SPAN} y={y - 6} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>
        {"1 cell = " + spec.scale + " symbols"}</text>);
  }

  /* ---------------------------------------------------------------- lanes */
  if (spec.type === "lanes") {
    const n = R(spec.n) || 8;
    const fail = spec.fail || [];
    const rh = Math.max(9, Math.min(17, Math.floor(190 / n)));
    const top = 30, LX = 96, LW = 540;
    const order = spec.shuffled ? shuffleOrder(n) : null;
    for (let i = 0; i < n; i++) {
      const y = top + i * (rh + 3);
      const bad = fail.indexOf(i) >= 0;
      g.push(<rect key={"b" + i} x={LX} y={y} width={LW} height={rh} rx={1.5}
        fill={bad ? "#2b1a18" : i % 2 ? C.ink3 : "#1d2b38"}
        stroke={bad ? C.bad : C.rule} strokeWidth={bad ? 1.2 : 0.7} />);
      if (spec.mapping) {
        /* round-robin: lane i carries units i, i+n, i+2n ... */
        for (let k = 0; k < 6; k++) {
          const unit = i + k * n;
          const cx = LX + 6 + k * 88;
          g.push(<rect key={"u" + i + "_" + k} x={cx} y={y + 1.5} width={46} height={rh - 3} rx={1.5}
            fill={C.signalWash} stroke={C.signalDim} strokeWidth="0.7" />);
          if (rh >= 12)
            g.push(<text key={"ut" + i + "_" + k} x={cx + 23} y={y + rh - 4} textAnchor="middle"
              fill={C.signal} fontSize="10" fontFamily={C.mono}>{unit}</text>);
        }
      }
      const label = order ? "phys " + i : "lane " + i;
      g.push(<text key={"t" + i} x={LX - 8} y={y + rh - 2} textAnchor="end" fill={bad ? C.bad : C.faint} fontSize="10" fontFamily={C.mono}>{label}</text>);
      if (order)
        g.push(<text key={"o" + i} x={LX + LW + 8} y={y + rh - 2} fill={C.signal} fontSize="10" fontFamily={C.mono}>{"carries logical " + order[i]}</text>);
      if (bad)
        g.push(<text key={"f" + i} x={LX + LW + 8} y={y + rh - 2} fill={C.bad} fontSize="10" fontFamily={C.mono}>no lock</text>);
    }
    H = top + n * (rh + 3) + 20;
  }

  /* ----------------------------------------------------------------- fold */
  if (spec.type === "fold") {
    const lg = R(spec.logical), ph = R(spec.physical);
    const top = 34, rh = Math.max(8, Math.min(14, Math.floor(150 / lg)));
    const LX = 90, LW = 190, PX = 430, PW = 190;
    const per = lg / ph;
    for (let i = 0; i < lg; i++) {
      const y = top + i * (rh + 3);
      g.push(<rect key={"l" + i} x={LX} y={y} width={LW} height={rh} rx={1.5} fill={C.ink3} stroke={C.rule} strokeWidth="0.7" />);
    }
    const phh = (lg * (rh + 3)) / ph - 3;
    for (let j = 0; j < ph; j++) {
      const y = top + j * (phh + 3);
      g.push(<rect key={"p" + j} x={PX} y={y} width={PW} height={phh} rx={2} fill={C.signalWash} stroke={C.signal} strokeWidth="0.9" />);
      g.push(<text key={"pt" + j} x={PX + PW + 8} y={y + phh / 2 + 3} fill={C.signal} fontSize="10" fontFamily={C.mono}>{"phys " + j}</text>);
      for (let k = 0; k < per; k++) {
        const li = j * per + k;
        const ly = top + li * (rh + 3) + rh / 2;
        g.push(<line key={"c" + j + "_" + k} x1={LX + LW + 2} y1={ly} x2={PX - 2} y2={y + phh / 2}
          stroke={C.signalDim} strokeWidth="0.7" />);
      }
    }
    g.push(<text key="ll" x={LX} y={top - 10} fill={C.dim} fontSize="10" fontFamily={C.mono}>{lg + " logical lanes"}</text>);
    g.push(<text key="pl" x={PX} y={top - 10} fill={C.signal} fontSize="10" fontFamily={C.mono}>{ph + " physical lanes"}</text>);
    g.push(<text key="rl" x={LX} y={top + lg * (rh + 3) + 16} fill={C.faint} fontSize="10.5" fontFamily={C.mono}>{lg + " / " + ph + " = " + (lg / ph) + " logical lanes per physical lane"}</text>);
    H = top + lg * (rh + 3) + 30;
  }

  /* ----------------------------------------------------------------- skew */
  if (spec.type === "skew") {
    const n = 6, off = [0, 34, 12, 58, 22, 44];
    const rh = 16, top = 46, BASE = 150;
    for (let i = 0; i < n; i++) {
      const y = top + i * (rh + 9);
      g.push(<rect key={"b" + i} x={BASE + off[i]} y={y} width={400} height={rh} rx={2} fill={C.ink3} stroke={C.rule} strokeWidth="0.8" />);
      g.push(<rect key={"m" + i} x={BASE + off[i]} y={y} width={26} height={rh} rx={2} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
      g.push(<text key={"t" + i} x={BASE - 46} y={y + rh - 3} textAnchor="end" fill={C.faint} fontSize="10.5" fontFamily={C.mono}>{"lane " + i}</text>);
      g.push(<text key={"o" + i} x={BASE - 8} y={y + rh - 3} textAnchor="end" fill={off[i] ? C.signal : C.good} fontSize="10.5" fontFamily={C.mono}>
        {off[i] ? "+" + off[i] : "ref"}</text>);
      if (spec.showBuffer && off[i] > 0) {
        g.push(<line key={"d" + i} x1={BASE} y1={y + rh / 2} x2={BASE + off[i]} y2={y + rh / 2} stroke={C.signalDim} strokeWidth="1" strokeDasharray="2 3" />);
      }
    }
    g.push(<line key="ref" x1={BASE} y1={top - 10} x2={BASE} y2={top + n * (rh + 9)} stroke={C.signal} strokeWidth="1" strokeDasharray="3 3" />);
    g.push(<text key="rt" x={BASE + 4} y={top - 16} fill={C.signal} fontSize="10" fontFamily={C.mono}>markers should be simultaneous here</text>);
    g.push(<text key="ax" x={BASE - 8} y={top - 16} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>offset</text>);
    if (spec.showBuffer)
      g.push(<text key="bt" x={BASE} y={top + n * (rh + 9) + 18} fill={C.faint} fontSize="10.5" fontFamily={C.mono}>dashed span is the delay each lane must be held by</text>);
    H = top + n * (rh + 9) + 30;
  }

  /* --------------------------------------------------------------- states */
  if (spec.type === "states") {
    const nodes = spec.nodes;
    const gapx = 24;
    const bw = Math.min(150, (SPAN - (nodes.length - 1) * gapx) / nodes.length);
    const y = 40, bh = 46;
    nodes.forEach((s, i) => {
      const x = X0 + i * (bw + gapx);
      const last = i === nodes.length - 1;
      g.push(<rect key={"r" + i} x={x} y={y} width={bw} height={bh} rx={4}
        fill={last ? C.signalWash : C.ink3} stroke={last ? C.signal : C.rule} strokeWidth="1" />);
      const words = s.split(" ");
      const mid = Math.ceil(words.length / 2);
      const l1 = words.length > 2 ? words.slice(0, mid).join(" ") : s;
      const l2 = words.length > 2 ? words.slice(mid).join(" ") : "";
      g.push(<text key={"t" + i} x={x + bw / 2} y={y + (l2 ? 20 : 27)} textAnchor="middle" fill={last ? C.signal : C.text} fontSize="11">{l1}</text>);
      if (l2) g.push(<text key={"t2" + i} x={x + bw / 2} y={y + 34} textAnchor="middle" fill={last ? C.signal : C.text} fontSize="11">{l2}</text>);
      if (!last) {
        g.push(<line key={"l" + i} x1={x + bw + 3} y1={y + bh / 2} x2={x + bw + gapx - 7} y2={y + bh / 2} stroke={C.rule} strokeWidth="1" />);
        g.push(<polygon key={"a" + i} points={(x + bw + gapx - 7) + "," + (y + bh / 2 - 4) + " " + (x + bw + gapx - 7) + "," + (y + bh / 2 + 4) + " " + (x + bw + gapx - 1) + "," + (y + bh / 2)} fill={C.rule} />);
      }
    });
    if (spec.loop) {
      const from = X0 + spec.loop[0] * (bw + gapx) + bw / 2;
      const to = X0 + spec.loop[1] * (bw + gapx) + bw / 2;
      const ly = y + bh + 26;
      g.push(<path key="lp" d={"M " + from + " " + (y + bh) + " L " + from + " " + ly + " L " + to + " " + ly + " L " + to + " " + (y + bh + 6)}
        stroke={C.bad} strokeWidth="1.1" fill="none" />);
      g.push(<polygon key="lph" points={(to - 4) + "," + (y + bh + 8) + " " + (to + 4) + "," + (y + bh + 8) + " " + to + "," + (y + bh)} fill={C.bad} />);
      if (spec.loopLabel)
        g.push(<text key="lpt" x={(from + to) / 2} y={ly + 14} textAnchor="middle" fill={C.bad} fontSize="10" fontFamily={C.mono}>{spec.loopLabel}</text>);
      H = ly + 28;
    } else {
      H = y + bh + 26;
    }
  }

  /* ------------------------------------------------------------------ eye */
  if (spec.type === "eye") {
    const levels = [44, 84, 124, 164];
    const L = 120, Rt = 600;
    levels.forEach((y, i) => {
      g.push(<line key={"lv" + i} x1={60} y1={y} x2={650} y2={y} stroke={C.ruleSoft} strokeWidth="0.8" strokeDasharray="2 5" />);
      g.push(<text key={"lt" + i} x={52} y={y + 4} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>{3 - i}</text>);
    });
    for (let i = 0; i < 3; i++) {
      const top = levels[i], bot = levels[i + 1];
      const cy = (top + bot) / 2, ry = (bot - top) / 2 - 5;
      g.push(<ellipse key={"e" + i} cx={(L + Rt) / 2} cy={cy} rx={(Rt - L) / 2} ry={ry}
        fill="none" stroke={C.signal} strokeWidth="1.5" />);
    }
    g.push(<line key="ul" x1={L} y1={34} x2={L} y2={176} stroke={C.rule} strokeWidth="0.8" />);
    g.push(<line key="ur" x1={Rt} y1={34} x2={Rt} y2={176} stroke={C.rule} strokeWidth="0.8" />);
    g.push(<text key="ut" x={(L + Rt) / 2} y={28} textAnchor="middle" fill={C.faint} fontSize="10" fontFamily={C.mono}>one unit interval</text>);
    if (spec.windows) {
      [0.45, 0.55].forEach((u, i) => {
        const x = L + u * (Rt - L);
        g.push(<line key={"w" + i} x1={x} y1={34} x2={x} y2={176} stroke={C.bad} strokeWidth="1.2" strokeDasharray="3 3" />);
        g.push(<text key={"wt" + i} x={x} y={i === 0 ? 194 : 206} textAnchor="middle" fill={C.bad} fontSize="10" fontFamily={C.mono}>{u + " UI"}</text>);
      });
      g.push(<text key="wl" x={Rt + 16} y={108} fill={C.bad} fontSize="10" fontFamily={C.mono}>histograms</text>);
    }
    H = spec.windows ? 216 : 190;
  }

  /* ---------------------------------------------------------------- curve */
  if (spec.type === "curve") {
    const L = 96, Rt = 620, T = 34, B = 196;
    const decades = ["1e-13", "1e-11", "1e-9", "1e-7", "1e-5", "1e-3"];
    decades.forEach((d, i) => {
      const y = T + ((B - T) / (decades.length - 1)) * i;
      g.push(<line key={"gl" + i} x1={L} y1={y} x2={Rt} y2={y} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
      g.push(<text key={"gt" + i} x={L - 8} y={y + 3.5} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>{d}</text>);
    });
    g.push(<line key="ax" x1={L} y1={B} x2={Rt} y2={B} stroke={C.rule} strokeWidth="1" />);
    g.push(<line key="ay" x1={L} y1={T} x2={L} y2={B} stroke={C.rule} strokeWidth="1" />);

    let d = "";
    const pts = 70;
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const x = L + t * (Rt - L);
      const k = 1 / (1 + Math.exp(-(t - 0.66) * 30));
      const yy = T + 6 + (1 - k) * (B - T - 14);
      d += (i === 0 ? "M " : " L ") + x.toFixed(1) + " " + yy.toFixed(1);
    }
    g.push(<path key="c" d={d} stroke={C.signal} strokeWidth="1.9" fill="none" />);

    const cliffX = L + 0.66 * (Rt - L);
    const opX = L + 0.42 * (Rt - L);
    g.push(<line key="cl" x1={cliffX} y1={T} x2={cliffX} y2={B} stroke={C.bad} strokeWidth="1" strokeDasharray="3 3" />);
    g.push(<text key="ct" x={cliffX + 6} y={T + 12} fill={C.bad} fontSize="10.5" fontFamily={C.mono}>the cliff</text>);
    g.push(<circle key="op" cx={opX} cy={T + 10} r={4} fill={C.good} />);
    g.push(<text key="opt" x={opX - 8} y={T + 13} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>operating point</text>);
    g.push(<line key="mg" x1={opX + 8} y1={T + 24} x2={cliffX - 3} y2={T + 24} stroke={C.good} strokeWidth="0.9" />);
    g.push(<text key="mgt" x={(opX + cliffX) / 2} y={T + 38} textAnchor="middle" fill={C.good} fontSize="10.5" fontFamily={C.mono}>margin lives here, measured pre-FEC</text>);
    g.push(<text key="xl" x={Rt} y={B + 20} textAnchor="end" fill={C.faint} fontSize="10.5" fontFamily={C.mono}>pre-FEC BER, worsening to the right</text>);
    g.push(<text key="yl" x={L - 8} y={T - 12} textAnchor="end" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>post-FEC BER</text>);
    H = 224;
  }

  /* ----------------------------------------------------------------- wave */
  if (spec.type === "wave") {
    const bits = [];
    if (spec.pattern === "runs") {
      const runs = [12, 9, 11, 8, 10];
      let v = 1;
      runs.forEach((r) => { for (let i = 0; i < r; i++) bits.push(v); v = v ? 0 : 1; });
    } else {
      for (let i = 0; i < 50; i++) bits.push(prand(i * 7.3) > 0.5 ? 1 : 0);
    }
    const hi = 40, lo = 86, bw = SPAN / bits.length;
    let d = "M " + X0 + " " + (bits[0] ? hi : lo);
    let trans = 0;
    bits.forEach((b, i) => {
      const x1 = X0 + (i + 1) * bw;
      d += " L " + x1 + " " + (b ? hi : lo);
      if (i < bits.length - 1 && bits[i + 1] !== b) { d += " L " + x1 + " " + (bits[i + 1] ? hi : lo); trans++; }
    });
    g.push(<line key="h" x1={X0} y1={hi} x2={X0 + SPAN} y2={hi} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
    g.push(<line key="l" x1={X0} y1={lo} x2={X0 + SPAN} y2={lo} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
    g.push(<path key="w" d={d} stroke={spec.pattern === "runs" ? C.dim : C.signal} strokeWidth="1.7" fill="none" />);
    g.push(<text key="t" x={X0} y={112} fill={spec.pattern === "runs" ? C.bad : C.good} fontSize="10" fontFamily={C.mono}>
      {trans + " transitions in " + bits.length + " bit periods"}</text>);
    H = 126;
  }

  /* ---------------------------------------------------------------- spans */
  if (spec.type === "spans") {
    const segs = [
      { label: "host electrical", w: 1 },
      { label: "optical channel", w: 1.6 },
      { label: "far-end electrical", w: 1 },
    ];
    const total = segs.reduce((a, s) => a + s.w, 0);
    const top = 40, sh = 40;
    let x = X0;
    segs.forEach((s, i) => {
      const w = (s.w / total) * SPAN;
      g.push(<rect key={"s" + i} x={x} y={top} width={w - 3} height={sh} rx={3}
        fill={i === 1 ? "#14231f" : C.ink3} stroke={i === 1 ? "#2a5045" : C.rule} strokeWidth="1" />);
      g.push(<text key={"st" + i} x={x + w / 2} y={top + 25} textAnchor="middle" fill={C.dim} fontSize="11">{s.label}</text>);
      x += w;
    });

    const iy = top + sh + 16, oy = iy + 26;
    if (spec.mode === "concatenated") {
      const ox = (segs[0].w / total) * SPAN;
      const ow = (segs[1].w / total) * SPAN;
      g.push(<rect key="in" x={X0 + ox} y={iy} width={ow - 3} height={14} rx={3} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
      g.push(<text key="int" x={X0 + ox + ow / 2} y={iy + 11} textAnchor="middle" fill={C.signal} fontSize="10.5" fontFamily={C.mono}>inner code</text>);
      g.push(<rect key="out" x={X0} y={oy} width={SPAN - 3} height={14} rx={3} fill="#1c2536" stroke="#42586d" strokeWidth="1" />);
      g.push(<text key="outt" x={X0 + SPAN / 2} y={oy + 11} textAnchor="middle" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>outer Reed-Solomon, end to end</text>);
    } else {
      let sx = X0;
      segs.forEach((s, i) => {
        const w = (s.w / total) * SPAN;
        g.push(<rect key={"sg" + i} x={sx} y={iy} width={w - 3} height={14} rx={3} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
        g.push(<text key={"sgt" + i} x={sx + w / 2} y={iy + 11} textAnchor="middle" fill={C.signal} fontSize="10.5" fontFamily={C.mono}>corrected here</text>);
        if (i < segs.length - 1)
          g.push(<text key={"re" + i} x={sx + w - 3} y={oy + 11} textAnchor="middle" fill={C.bad} fontSize="10.5" fontFamily={C.mono}>re-encoded</text>);
        sx += w;
      });
    }
    H = oy + 30;
  }

  const render = (c) => (
    <svg viewBox={"0 0 " + W + " " + H}
      style={c === false ? { width: "100%", height: "auto", display: "block" } : SVG_STYLE}>{g}</svg>
  );

  if (nested) return render(constrain !== false);

  return <Figure title={spec.title} caption={caption} render={render} />;
}

/* ---------------------------------------------------------------------------
   Figure — title, graphic, caption, and an enlarge affordance. Narrow columns
   scale SVG type down with them, so every diagram can be reopened at window
   width where the labels are legible again.
   --------------------------------------------------------------------------- */
function Figure({ title, caption, render }) {
  const [big, setBig] = useState(false);

  return (
    <figure style={{ margin: "20px 0 6px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        {title ? <div style={{ fontSize: 12.5, color: C.dim, fontWeight: 600 }}>{title}</div> : null}
        <button onClick={() => setBig(true)}
          style={{
            font: "inherit", fontFamily: C.mono, fontSize: 10.5, marginLeft: "auto", cursor: "pointer",
            background: "transparent", border: "1px solid " + C.rule, borderRadius: 3,
            color: C.faint, padding: "2px 8px",
          }}>enlarge</button>
      </div>
      {render(true)}
      {caption ? <Note text={caption} /> : null}

      {big ? (
        <div onClick={() => setBig(false)} role="dialog" aria-label={title || "diagram"}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60,
            background: "rgba(5,9,14,0.94)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: "32px 28px", cursor: "zoom-out",
          }}>
          <div style={{ width: "100%", maxWidth: 1500 }}>
            {title ? <div style={{ fontSize: 15, color: C.text, fontWeight: 600, marginBottom: 14 }}>{title}</div> : null}
            {render(false)}
            {caption ? (
              <p style={{ margin: "14px 0 0", fontSize: 13.5, color: C.dim, maxWidth: "80ch", lineHeight: 1.6 }}>{caption}</p>
            ) : null}
            <div style={{ marginTop: 18, fontFamily: C.mono, fontSize: 11, color: C.faint }}>click anywhere to close</div>
          </div>
        </div>
      ) : null}
    </figure>
  );
}

function Note({ text }) {
  return (
    <figcaption style={{ margin: "8px 0 0", fontSize: 12.5, color: C.faint, maxWidth: "70ch", lineHeight: 1.55 }}>{text}</figcaption>
  );
}

/* a fixed, non-identity arrival order, so the reorder diagram is stable */
function shuffleOrder(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((i * 7 + 3) % n);
  return out;
}

/* ===========================================================================
   CANVAS  —  the stack as an instrument
   ---------------------------------------------------------------------------
   Three columns: adjacent group, the core stack in its zone bands, and the
   electrical/module group. Zone names sit rotated in the gutter between the
   left column and the bands, which is what stops them colliding.
   =========================================================================== */
function StackCanvas({ rate, dir, onOpen, complete }) {
  const order = dir === "tx" ? CORE : CORE.slice().reverse();

  const ASIDE_X = 8, ASIDE_W = 168;
  const GUTTER_X = 190;
  const BAND_X = 204, BAND_W = 282;
  const BX = 218, BW = 254, BH = 62, GAP = 30;
  const IFACE_X = 506, IFACE_W = 180;
  const W = 700, TOP = 48;

  const yOf = {};
  order.forEach((id, i) => { yOf[id] = TOP + i * (BH + GAP); });
  const colBottom = TOP + order.length * (BH + GAP) - GAP;

  const bands = Object.keys(ZONES).map((z) => {
    const ys = order.filter((id) => DATA[id].zone === z && CORE.indexOf(id) >= 0).map((id) => yOf[id]);
    if (!ys.length) return null;
    return { z, top: Math.min.apply(null, ys) - 9, bot: Math.max.apply(null, ys) + BH + 9 };
  }).filter(Boolean);

  const asideTop = TOP + 16;
  const ifaceTop = yOf["pma"] !== undefined ? yOf["pma"] : TOP;
  const H = Math.max(colBottom, asideTop + ASIDE.length * 42, ifaceTop + IFACE.length * 42) + 26;

  return (
    <svg viewBox={"0 0 " + W + " " + H} style={SVG_STYLE}>
      {bands.map((b) => (
        <g key={b.z}>
          <rect x={BAND_X} y={b.top} width={BAND_W} height={b.bot - b.top} rx={6}
            fill={ZONES[b.z].fill} stroke={ZONES[b.z].hue} strokeWidth="1" />
          <text x={GUTTER_X} y={(b.top + b.bot) / 2} fill={C.faint} fontSize="10" fontFamily={C.mono}
            textAnchor="middle" transform={"rotate(-90 " + GUTTER_X + " " + ((b.top + b.bot) / 2) + ")"}>
            {ZONES[b.z].label}
          </text>
        </g>
      ))}

      <text x={BX} y={30} fill={C.faint} fontSize="11" fontFamily={C.mono}>
        {dir === "tx" ? "transmit — MAC to medium" : "receive — medium to MAC"}
      </text>

      {order.slice(0, -1).map((id, i) => {
        const y = yOf[id] + BH;
        const x = BX + BW / 2;
        const ll = laneLabel(order[i + 1], rate);
        return (
          <g key={"c" + id}>
            <line x1={x} y1={y} x2={x} y2={y + GAP - 7} stroke={C.rule} strokeWidth="1" />
            <polygon points={(x - 4) + "," + (y + GAP - 8) + " " + (x + 4) + "," + (y + GAP - 8) + " " + x + "," + (y + GAP)} fill={C.rule} />
            {ll ? (
              <g>
                <line x1={x + 4} y1={y + GAP / 2} x2={x + 14} y2={y + GAP / 2} stroke={C.ruleSoft} strokeWidth="0.8" />
                <text x={x + 19} y={y + GAP / 2 + 4} fill={C.dim} fontSize="10.5" fontFamily={C.mono}>{ll}</text>
              </g>
            ) : null}
          </g>
        );
      })}

      {order.map((id) => {
        const n = DATA[id];
        const y = yOf[id];
        const face = pick(n.face, rate);
        const cl = pick(n.clause, rate) || "";
        const isDraft = /draft/i.test(cl);
        return (
          <g key={id} onClick={() => onOpen(id)} style={{ cursor: "pointer" }} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
            <rect x={BX} y={y} width={BW} height={BH} rx={4} fill={C.ink3} stroke={ZONES[n.zone].hue} strokeWidth="1.2" />
            <text x={BX + 14} y={y + 25} fill={C.text} fontSize="15" fontWeight="600">{n.name}</text>
            <text x={BX + 14} y={y + 44} fill={C.faint} fontSize="10" fontFamily={C.mono}>{cl}</text>
            {face ? (
              <text x={BX + BW - 14} y={y + 25} textAnchor="end" fill={isDraft ? C.signal : C.dim} fontSize="11.5" fontFamily={C.mono}>{face}</text>
            ) : null}
            {complete(id) ? (
              <text x={BX + BW - 14} y={y + 44} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>read</text>
            ) : null}
          </g>
        );
      })}

      <text x={ASIDE_X} y={TOP + 2} fill={C.faint} fontSize="10" fontFamily={C.mono}>adjacent + cross-cutting</text>
      {ASIDE.map((id, i) => {
        const y = asideTop + i * 42;
        return (
          <g key={id} onClick={() => onOpen(id)} style={{ cursor: "pointer" }} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
            <rect x={ASIDE_X} y={y} width={ASIDE_W} height={34} rx={4} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={ASIDE_X + 11} y={y + 22} fill={C.dim} fontSize="12.5">{DATA[id].name}</text>
          </g>
        );
      })}

      <text x={IFACE_X} y={ifaceTop - 12} fill={C.faint} fontSize="10" fontFamily={C.mono}>electrical + modules</text>
      {IFACE.map((id, i) => {
        const y = ifaceTop + i * 42;
        return (
          <g key={id} onClick={() => onOpen(id)} style={{ cursor: "pointer" }} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
            <rect x={IFACE_X} y={y} width={IFACE_W} height={34} rx={4} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={IFACE_X + 11} y={y + 22} fill={C.dim} fontSize="12.5">{DATA[id].name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   DrillCanvas — one component for every level below the stack. If the node
   has children they are drawn as a chain; if it is a leaf, the canvas is the
   diagram. Same interaction at every depth.
   --------------------------------------------------------------------------- */
function DrillCanvas({ node, kids, rate, dir, visited, onPick, zone, litId }) {
  const hue = ZONES[zone] ? ZONES[zone].hue : C.rule;
  const BX = 122, BW = 456, BH = 54, GAP = 16, TOP = 62;
  const H = TOP + Math.max(kids.length, 1) * (BH + GAP) + 8;

  return (
    <svg viewBox={"0 0 700 " + H} style={SVG_STYLE}>
      <text x={BX} y={26} fill={C.text} fontSize="17" fontWeight="600">{node.name}</text>
      <text x={BX} y={46} fill={C.faint} fontSize="11" fontFamily={C.mono}>
        {(pick(node.clause, rate) ? pick(node.clause, rate) + "   \u00b7   " : "") + (dir === "tx" ? "transmit" : "receive") + "   \u00b7   " + rate}
      </text>

      {!kids.length ? (
        <text x={BX} y={TOP + 24} fill={C.faint} fontSize="12" fontFamily={C.mono}>
          {"Nothing in the " + (dir === "tx" ? "transmit" : "receive") + " direction here."}
        </text>
      ) : null}

      {kids.slice(0, -1).map((s, i) => {
        const y = TOP + i * (BH + GAP) + BH;
        const x = BX + BW / 2;
        return (
          <g key={"c" + s.id}>
            <line x1={x} y1={y} x2={x} y2={y + GAP - 6} stroke={C.rule} strokeWidth="1" />
            <polygon points={(x - 3.5) + "," + (y + GAP - 7) + " " + (x + 3.5) + "," + (y + GAP - 7) + " " + x + "," + (y + GAP)} fill={C.rule} />
          </g>
        );
      })}

      {kids.map((s, i) => {
        const y = TOP + i * (BH + GAP);
        const lit = litId === s.id;
        const grandkids = (s.subs || s.sections || []).length;
        const tag = s.written === false ? "outline" : grandkids ? grandkids + " inside" : "page";
        return (
          <g key={s.id} onClick={() => onPick(s.id)} style={{ cursor: "pointer" }} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(s.id); } }}>
            <rect x={BX} y={y} width={BW} height={BH} rx={4}
              fill={lit ? C.signalWash : C.ink3} stroke={lit ? C.signal : hue} strokeWidth={lit ? 1.8 : 1.1} />
            <text x={BX + 14} y={y + 23} fill={lit ? C.signal : C.text} fontSize="14">{s.name}</text>
            <text x={BX + 14} y={y + 41} fill={C.faint} fontSize="10" fontFamily={C.mono}>
              {(s.dir && s.dir !== "both" ? s.dir.toUpperCase() + "  \u00b7  " : "") + tag}
            </text>
            {visited.has(s.id) ? (
              <text x={BX + BW - 14} y={y + 33} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>read</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* ===========================================================================
   PANEL PIECES
   =========================================================================== */
function Prose({ text, terms }) {
  const [open, setOpen] = useState(null);
  const paras = (text || "").split("\n\n");
  return (
    <div>
      {paras.map((p, pi) => {
        const bits = p.split(/(\[\[[^\]]+\]\])/g);
        return (
          <div key={pi}>
            <p style={{ margin: "0 0 14px", maxWidth: "68ch", lineHeight: 1.65 }}>
              {bits.map((b, bi) => {
                const m = b.match(/^\[\[([^\]]+)\]\]$/);
                if (m && terms && terms[m[1]]) {
                  const key = m[1];
                  return (
                    <button key={bi} onClick={() => setOpen(open === key ? null : key)}
                      style={{
                        font: "inherit", background: "none", border: 0, padding: 0, cursor: "pointer",
                        color: open === key ? C.signal : C.text,
                        borderBottom: "1px dashed " + (open === key ? C.signal : C.signalDim),
                      }}>{key}</button>
                  );
                }
                return <span key={bi}>{b}</span>;
              })}
            </p>
            {bits.some((b) => { const m = b.match(/^\[\[([^\]]+)\]\]$/); return m && m[1] === open; }) && open ? (
              <div style={{
                margin: "-6px 0 16px", padding: "10px 14px", background: C.ink2,
                borderLeft: "2px solid " + C.signal, fontSize: 13.5, maxWidth: "64ch", lineHeight: 1.6,
              }}>
                <span style={{ fontFamily: C.mono, fontSize: 12.5, color: C.signal, fontWeight: 600 }}>{open}</span>
                <span style={{ color: C.dim }}>{"  —  " + terms[open]}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Params({ node, rate }) {
  const rows = pick(node.params, rate);
  if (!rows || !rows.length) return null;
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "66ch", fontSize: 13.5 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ padding: "7px 12px 7px 0", borderBottom: "1px solid " + C.ruleSoft, color: C.dim, width: "46%", verticalAlign: "top" }}>{r[0]}</td>
            <td style={{ padding: "7px 0", borderBottom: "1px solid " + C.ruleSoft, fontFamily: C.mono, fontSize: 12.5, verticalAlign: "top" }}>
              {r[1]}
              {r[2] && r[2].draft ? (
                <span style={{ marginLeft: 8, fontSize: 10, color: C.signal, border: "1px solid " + C.signalDim, borderRadius: 3, padding: "1px 5px" }}>draft</span>
              ) : null}
              {r[2] && r[2].industry ? (
                <span title="Industry or MSA source, not IEEE 802.3"
                  style={{ marginLeft: 8, fontSize: 10, color: "#7f93a6", border: "1px solid " + C.rule, borderRadius: 3, padding: "1px 5px" }}>industry</span>
              ) : null}
              {r[2] && r[2].inferred ? (
                <span title="Inferred from related clause material, not read directly from clause text"
                  style={{ marginLeft: 8, fontSize: 10, color: C.dim, border: "1px solid " + C.rule, borderRadius: 3, padding: "1px 5px" }}>inferred</span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Quiz({ items }) {
  const [picked, setPicked] = useState({});
  return (
    <div>
      {items.map((q, qi) => {
        const chosen = picked[qi];
        return (
          <div key={qi} style={{ border: "1px solid " + C.rule, borderRadius: 6, padding: "15px 17px", marginBottom: 12, maxWidth: "68ch" }}>
            <p style={{ margin: "0 0 12px", fontWeight: 500, lineHeight: 1.55 }}>{(qi + 1) + ". " + q.q}</p>
            {q.opts.map((o, oi) => {
              let border = C.rule, color = C.text;
              if (chosen !== undefined) {
                if (oi === q.a) { border = C.good; color = C.good; }
                else if (oi === chosen) { border = C.bad; color = C.bad; }
              }
              return (
                <button key={oi} onClick={() => chosen === undefined && setPicked({ ...picked, [qi]: oi })}
                  style={{
                    font: "inherit", display: "block", width: "100%", textAlign: "left", fontSize: 14,
                    background: C.ink2, border: "1px solid " + border, color, borderRadius: 4,
                    padding: "9px 12px", marginBottom: 7, cursor: chosen === undefined ? "pointer" : "default",
                  }}>{o}</button>
              );
            })}
            {chosen !== undefined ? (
              <p style={{ fontSize: 13.5, color: C.dim, margin: "10px 0 0", borderTop: "1px solid " + C.ruleSoft, paddingTop: 10, lineHeight: 1.6 }}>
                <span style={{ color: chosen === q.a ? C.good : C.bad }}>{chosen === q.a ? "Correct. " : "Not this one. "}</span>
                {q.why}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Heading({ children }) {
  return (
    <h3 style={{
      fontSize: 12.5, fontWeight: 600, color: C.dim, margin: "26px 0 10px",
      paddingBottom: 5, borderBottom: "1px solid " + C.ruleSoft,
    }}>{children}</h3>
  );
}

/* ===========================================================================
   TREE HELPERS
   ---------------------------------------------------------------------------
   Level 2 children live in .subs and level 3 in .sections. Both are walked
   through one accessor so navigation code never has to know the depth.
   =========================================================================== */
function rawKids(node) {
  if (!node) return [];
  return node.subs || node.sections || [];
}

function kidsOf(node, dir) {
  return rawKids(node).filter((s) => {
    const d = s.dir || "both";
    return d === "both" || d === dir;
  });
}

function nodeAt(path) {
  if (!path.length) return null;
  let n = DATA[path[0]];
  for (let i = 1; i < path.length && n; i++) {
    n = rawKids(n).find((s) => s.id === path[i]);
  }
  return n || null;
}

function descendantIds(node) {
  const out = [];
  (function walk(n) {
    rawKids(n).forEach((s) => { out.push(s.id); walk(s); });
  })(node);
  return out;
}

const TRACKABLE = (function () {
  let n = 0;
  Object.keys(DATA).forEach((k) => { n += descendantIds(DATA[k]).length; });
  return n;
})();

/* ===========================================================================
   APP
   =========================================================================== */
export default function EthernetStack() {
  const [rate, setRate] = useState("400G");
  const [dir, setDir] = useState("tx");
  const [path, setPath] = useState([]);
  const [visited, setVisited] = useState(() => new Set());
  const [stepping, setStepping] = useState(false);

  const node = useMemo(() => nodeAt(path), [path]);
  const kids = useMemo(() => (node ? kidsOf(node, dir) : []), [node, dir]);
  const zone = path.length ? (DATA[path[0]].zone || "coding") : "coding";

  /* The canvas is a map, never a content surface. At a leaf it keeps showing
     the sibling chain with the current page lit, so you never lose your place. */
  const atLeaf = !!node && kids.length === 0 && path.length > 1;
  const canvasNode = atLeaf ? nodeAt(path.slice(0, -1)) : node;
  const canvasKids = canvasNode ? kidsOf(canvasNode, dir) : [];
  const litId = atLeaf ? node.id : null;

  const complete = (id) => {
    const ids = descendantIds(DATA[id]);
    return ids.length > 0 && ids.every((x) => visited.has(x));
  };

  const markRead = (id) => setVisited((prev) => {
    const n = new Set(prev); n.add(id); return n;
  });

  const openTop = (id) => { setPath([id]); setStepping(false); };
  const push = (id) => { markRead(id); setPath(path.concat(id)); };
  const upTo = (i) => setPath(path.slice(0, i));

  /* a node selected in one direction may not exist in the other */
  const changeDir = (d) => {
    setDir(d);
    let p = path.slice();
    while (p.length > 1) {
      const n = nodeAt(p);
      if (n && n.dir && n.dir !== "both" && n.dir !== d) p = p.slice(0, -1);
      else break;
    }
    if (p.length !== path.length) setPath(p);
  };

  const seg = (values, current, onPick) => (
    <div style={{ display: "flex", border: "1px solid " + C.rule, borderRadius: 5, overflow: "hidden" }}>
      {values.map((v, i) => (
        <button key={v.value} onClick={() => onPick(v.value)} aria-pressed={v.value === current}
          style={{
            font: "inherit", fontFamily: C.mono, fontSize: 13, cursor: "pointer",
            background: v.value === current ? C.signal : "transparent",
            color: v.value === current ? "#221704" : C.dim,
            fontWeight: v.value === current ? 600 : 400,
            border: 0, borderRight: i < values.length - 1 ? "1px solid " + C.rule : 0,
            padding: "6px 13px",
          }}>{v.label}</button>
      ))}
    </div>
  );

  /* ------------------------------------------------------------- the panel */
  let panel;

  if (!node) {
    const meta = RATE_META[rate];
    panel = (
      <div>
        <h2 style={{ fontSize: 23, margin: "0 0 14px", fontWeight: 600, letterSpacing: "-0.015em" }}>Start anywhere</h2>
        <p style={{ margin: "0 0 14px", maxWidth: "68ch", lineHeight: 1.65 }}>
          {"You are looking at " + rate + " in the " + (dir === "tx" ? "transmit" : "receive") +
            " direction. The block structure barely changes between 400G, 800G and 1.6T. What changes is the arithmetic, so switch rates and watch the lane counts, clause numbers and parameters on the block faces move."}
        </p>
        <p style={{ margin: "0 0 14px", maxWidth: "68ch", lineHeight: 1.65 }}>
          The banded column is the PHY data path in order. The group on the left is not part of that path: MACsec sits above the MAC,
          time sync is a reference point rather than a stage, and autonegotiation barely applies to optical links. They are drawn
          aside so the layering stays honest.
        </p>
        <p style={{ margin: "0 0 14px", maxWidth: "68ch", lineHeight: 1.65 }}>
          Clicking drills in, at every level, until there is nothing left inside. At that point the canvas becomes the diagram.
        </p>
        <Heading>This rate</Heading>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "66ch", fontSize: 13.5 }}>
          <tbody>
            {[["Standard", meta.std], ["Typical lanes", meta.lanes], ["Status", meta.draft ? "draft, numbers may move" : "published"]].map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px 12px 7px 0", borderBottom: "1px solid " + C.ruleSoft, color: C.dim, width: "46%" }}>{r[0]}</td>
                <td style={{ padding: "7px 0", borderBottom: "1px solid " + C.ruleSoft, fontFamily: C.mono, fontSize: 12.5 }}>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Heading>Written so far</Heading>
        <p style={{ margin: 0, maxWidth: "68ch", lineHeight: 1.65, color: C.dim }}>
          PCS and RS-FEC are complete to three levels, across all rates and both directions, with diagrams and self-checks.
          Every other block is navigable but its pages are outlines.
        </p>
      </div>
    );
  } else {
    const cl = pick(node.clause, rate);
    const draft = cl ? /draft/i.test(cl) : false;
    const isTop = path.length === 1;
    panel = (
      <div>
        <h2 style={{ fontSize: isTop ? 23 : 21, margin: "0 0 2px", fontWeight: 600, letterSpacing: "-0.015em" }}>{node.name}</h2>
        {node.alias ? <p style={{ color: C.dim, fontSize: 13.5, margin: "0 0 14px" }}>{node.alias}</p> : null}
        {cl ? (
          <span style={{
            fontFamily: C.mono, fontSize: 11, color: draft ? C.signal : C.faint,
            border: "1px solid " + (draft ? C.signalDim : C.rule),
            borderRadius: 3, padding: "2px 7px", display: "inline-block", marginBottom: 16,
          }}>{cl}</span>
        ) : null}

        {node.written === false ? (
          <div style={{ border: "1px dashed " + C.rule, borderRadius: 5, padding: "16px 18px", color: C.dim, fontSize: 14, maxWidth: "64ch", marginBottom: 18, lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>Outline. </strong>
            {(node.summary || "") + (rawKids(node).length ? " The pages inside are titled and navigable but not written." : " Not written yet.")}
          </div>
        ) : null}

        {node.intro || node.body ? <Prose text={node.intro || node.body} terms={node.terms} /> : null}

        {VISUALS[node.id] ? (
          <div style={{ borderTop: "1px solid " + C.ruleSoft, marginTop: 20, paddingTop: 4 }}>
            <Diagram spec={VISUALS[node.id]} rate={rate} />
          </div>
        ) : null}

        {pick(node.params, rate) ? (<><Heading>{"At " + rate}</Heading><Params node={node} rate={rate} /></>) : null}

        {kids.length ? (
          <>
            <Heading>{isTop ? "Inside — " + (dir === "tx" ? "transmit" : "receive") : "Inside"}</Heading>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {kids.map((s) => (
                <li key={s.id} style={{ borderBottom: "1px solid " + C.ruleSoft }}>
                  <button onClick={() => push(s.id)}
                    style={{
                      font: "inherit", textAlign: "left", width: "100%", background: "none", border: 0,
                      color: C.text, padding: "12px 4px", cursor: "pointer", display: "flex", gap: 10, alignItems: "baseline",
                    }}>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: visited.has(s.id) ? C.good : C.rule, width: 12 }}>
                      {visited.has(s.id) ? "\u2713" : "\u00b7"}
                    </span>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: C.faint, fontSize: 12.5, flex: 1 }}>{s.summary || ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {node.quiz ? (<><Heading>Check yourself</Heading><Quiz items={node.quiz} /></>) : null}
      </div>
    );
  }

  /* --------------------------------------------------------- breadcrumb */
  const crumbs = [{ label: "the stack", go: path.length ? () => setPath([]) : null }];
  path.forEach((id, i) => {
    const n = nodeAt(path.slice(0, i + 1));
    const last = i === path.length - 1;
    crumbs.push({ label: n ? n.name : id, go: last ? null : () => upTo(i + 1) });
  });

  return (
    <div style={{ background: C.ink, color: C.text, fontFamily: C.sans, minHeight: "100vh", fontSize: 16 }}>
      <header style={{
        borderBottom: "1px solid " + C.rule, background: C.ink2,
        padding: "16px 24px 14px", display: "flex", flexWrap: "wrap", gap: "18px 28px", alignItems: "flex-end",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Ethernet Onboarding</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.dim, maxWidth: "54ch" }}>
            by Mishat  ·  400G, 800G and 1.6T, one sublayer at a time
          </p>
        </div>
        <div style={{ display: "flex", gap: 18, marginLeft: "auto", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 5 }}>MAC data rate</div>
            {seg(RATES.map((r) => ({ label: r, value: r })), rate, setRate)}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 5 }}>Direction</div>
            {seg([{ label: "TX", value: "tx" }, { label: "RX", value: "rx" }], dir, changeDir)}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 5 }}>Follow a frame</div>
            <button onClick={() => setStepping(!stepping)}
              style={{
                font: "inherit", fontSize: 13, padding: "6px 14px", borderRadius: 5, cursor: "pointer",
                border: "1px solid " + C.signalDim, background: stepping ? C.signal : "transparent",
                color: stepping ? "#221704" : C.signal, fontWeight: stepping ? 600 : 400,
              }}>{stepping ? "Close" : "Step through"}</button>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 5 }}>Read</div>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.faint, paddingTop: 6 }}>{visited.size + " / " + TRACKABLE}</div>
          </div>
        </div>
      </header>

      <main style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 0 }}>
        <section style={{ flex: "1 1 480px", minWidth: 340, maxWidth: 760, padding: "22px 26px 40px", borderRight: "1px solid " + C.rule }}>
          {stepping ? (
            <Stepper rate={rate} onExit={() => setStepping(false)} />
          ) : (
            <>
              <nav style={{ display: "flex", gap: 7, flexWrap: "wrap", fontFamily: C.mono, fontSize: 12, color: C.faint, minHeight: 24, marginBottom: 14 }}>
                {crumbs.map((c, i) => (
                  <span key={i} style={{ display: "flex", gap: 7 }}>
                    {i > 0 ? <span style={{ color: C.rule }}>/</span> : null}
                    {c.go ? (
                      <button onClick={c.go} style={{ font: "inherit", background: "none", border: 0, color: C.signal, cursor: "pointer", padding: 0 }}>{c.label}</button>
                    ) : (
                      <span style={{ color: C.dim }}>{c.label}</span>
                    )}
                  </span>
                ))}
              </nav>
              {node ? (
                <DrillCanvas node={canvasNode} kids={canvasKids} rate={rate} dir={dir} visited={visited}
                  onPick={(id) => { markRead(id); setPath(path.slice(0, atLeaf ? -1 : path.length).concat(id)); }}
                  zone={zone} litId={litId} />
              ) : (
                <StackCanvas rate={rate} dir={dir} onOpen={openTop} complete={complete} />
              )}
            </>
          )}
        </section>

        <section style={{ flex: "1 1 480px", minWidth: 320, maxWidth: 760, padding: "22px 26px 60px" }}>
          {panel}
        </section>
      </main>

      <footer style={{ borderTop: "1px solid " + C.rule, padding: "14px 24px 34px", fontSize: 12, color: C.faint, maxWidth: "94ch", lineHeight: 1.6 }}>
        400G follows IEEE 802.3 Clause 119 and its PMD clauses; 800G follows 802.3df; 1.6T follows 802.3dj, still in draft at the time
        of writing, so anything marked draft may have moved. Content lives in the DATA object and diagrams in the VISUALS map, both
        near the top of this file.
      </footer>
    </div>
  );
}
