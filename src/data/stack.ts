// Lesson content and rate-specific reference data.
// Source base: research-brief.md, docs/prose-review/2026-09-17-assessment.md,
// and docs/prose-review/2026-09-18-outline-research.md.
/* eslint-disable */
import type { Rate, Dir, StackNode } from "../types";

export const RATES: Rate[] = ["400G", "800G", "1.6T"];

export const RATE_META: Record<Rate, { std: string; lanes: string; draft: boolean }> = {
  "400G": { std: "IEEE Std 802.3, Clause 119", lanes: "4 x 100G; 2 x 200G in P802.3dj", draft: false },
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
    summary: "Builds and checks Ethernet frames, independent of PHY lane layout.",
    intro:
      "The MAC, or Media Access Control sublayer, handles Ethernet frames. On transmit it adds the frame check sequence and controls the spacing between packets. On receive it checks the frame and reports whether it is valid. Its interface carries data and control information; it does not expose the optical wavelengths or physical lane layout below it.\n\nThe basic address, length/type, data and FCS fields are shared across Ethernet rates. Moving from 400G to 800G therefore changes the timing and the PHY implementation without requiring a new basic frame format. Clause 4 still needs rate-specific MAC parameters when a new speed is added.\n\nThe [[inter-packet gap]] connects this framing role to the next block. Frames can end at different byte positions on the parallel MII, while the next packet's Start character has an alignment requirement. The Reconciliation Sublayer adjusts idles between packets to meet that requirement while preserving the specified average gap.",
    terms: {
      "inter-packet gap": "The spacing between Ethernet packets. MAC transmission uses a minimum of 96 bit times; the RS can adjust individual gaps within specified rules to meet Start alignment while preserving the required average.",
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
        summary: "Where the MAC frame begins, which fields it carries, and what the FCS checks.",
        intro:
          "The MAC frame begins at the destination address and ends at the frame check sequence (FCS). The preamble and start-of-frame delimiter (SFD) precede it. Together, these form the Ethernet packet described by Clause 3.\n\nIn a basic untagged frame, destination and source addresses are followed by the length/type field, client data, any required padding, and the FCS. A length/type value of 1500 or less specifies the client-data length, excluding pad. A value of 1536 or greater is an EtherType identifying the carried protocol. Values between those ranges have no defined length/type interpretation. VLAN tags add fields after the source address. The table below gives the field sizes.\n\nThe FCS is a CRC-32 calculated from the destination address through the last data or pad octet, including any tags. Preamble, SFD and the FCS itself are excluded. The receiving MAC rejects a frame with an invalid FCS. This provides strong error detection, although some corrupted bit patterns can still produce a valid CRC.",
        params: { all: [["Preamble", "7 octets, before the MAC frame"], ["Start of frame delimiter", "1 octet, before the MAC frame"], ["Destination address", "6 octets"], ["Source address", "6 octets"], ["Length / type", "2 octets; length ≤ 1500, EtherType ≥ 1536"], ["Payload + pad", "46 to 1500 octets, basic untagged frame"], ["FCS", "4 octets, CRC-32"], ["FCS coverage", "destination address through data and pad, including tags"], ["Minimum frame", "64 octets, destination address through FCS"]] },
        sections: [
          {
            id: "mac-frame-min", name: "Why 64 octets",
            body:
              "An Ethernet MAC frame must be at least 64 octets long, measured from the destination address through the FCS. For a basic untagged frame, the addresses and length/type field occupy 14 octets and the FCS occupies four. That leaves at least 46 octets for client data and pad. If the client supplies fewer than 46, the MAC adds padding.\n\nThe minimum originated in half-duplex Ethernet. Devices shared a medium and used CSMA/CD, or carrier sense multiple access with collision detection. A sender had to keep transmitting long enough to detect a collision within the network's allowed propagation time. Modern full-duplex links do not use collision detection, but retain the 64-octet minimum as part of the Ethernet MAC specification.",
            params: { all: [["Minimum MAC frame", "64 octets, destination address through FCS"], ["Origin", "half-duplex collision detection"], ["Modern full-duplex links", "retain the minimum; do not use collision detection"], ["Basic untagged data + pad", "at least 46 octets"]] },
          },
        ],
      },

      {
        id: "mac-ipg", name: "Inter-packet gap", alias: "the 12-octet rule", dir: "tx", written: true,
        clause: { all: "Clause 4.4.2" },
        summary: "An average minimum of 12 octets between frames.",
        intro:
          "The inter-packet gap is idle time between the end of one packet and the beginning of the next. The MAC's transmit timing uses a 96-bit-time gap, equivalent to 12 octet times. At 400 Gb/s, 96 bit times take 0.24 ns; at 800 Gb/s they take 0.12 ns. The same octet-time rule therefore occupies less time as the rate increases.\n\nThe gap contributes to packet transmission time even though it carries no frame data. Use the 12-octet average when calculating sustained throughput at the rates covered here. Individual gaps at the MII can vary under the RS alignment rules, and received gaps can also be affected by clock tolerance. The Deficit idle count lesson explains the transmit alignment mechanism.",
        params: { all: [["MAC transmit gap", "96 bit times = 12 octet times"], ["RS alignment", "individual gaps can vary under the applicable rules"], ["Received gap", "can also change with clock tolerance"], ["Throughput calculation", "use the specified average gap"]] },
      },

      {
        id: "mac-rate", name: "Data rate versus goodput", alias: "where the headline number goes", dir: "both", written: true,
        clause: { all: "Clause 4" },
        summary: "Calculate the share of MAC-rate transmission time available to client data.",
        intro:
          "Goodput is the rate of useful data delivered to the receiver. It is lower than the MAC data rate because frame headers, the FCS, preamble/SFD and the inter-packet gap all take transmission time. The examples here use basic untagged frames and a 12-octet average gap.\n\nA minimum-size frame occupies 64 + 8 + 12 = 84 octet times. Its client-data-and-pad field occupies 46 of those, giving 46 / 84 ≈ 55 percent. If some of that field is pad, the useful-data fraction is lower. With 1500 octets of client data, the total is 1500 + 14 + 4 + 8 + 12 = 1538 octet times, giving about 97.5 percent before any higher-layer headers are counted.\n\nPHY coding and FEC add overhead below the MAC. The specified lane signaling rates account for that overhead so the PHY can sustain the nominal MAC rate. For example, a 100G-class PAM4 lane carries 106.25 Gb/s rather than exactly 100 Gb/s. Tags, MACsec and application protocols introduce additional overhead beyond these examples.",
        params: { all: [["64-octet frame occupies", "84 octet times, including preamble/SFD and average gap"], ["Payload fraction", "46 / 84, about 55 percent"], ["Assumption for 46 octets", "client data; padding reduces the useful share"], ["1500-octet client data occupies", "1538 octet times, basic untagged example"], ["Payload fraction", "about 97.5 percent"], ["PHY overhead", "accounted for in the specified serial signaling rate"]] },
        quiz: [
          {
            q: "Why does a 400G link never deliver 400 Gb/s of payload?",
            opts: ["FEC steals bandwidth from the MAC", "Preamble, gap, header and FCS all occupy wire time", "The PCS drops frames", "Clock tolerance reduces it"],
            a: 1,
            why: "MAC-rate transmission time includes frame headers, FCS, preamble/SFD and idle spacing. PHY coding and FEC overhead are accounted for in the specified serial signaling rates.",
          },
        ],
      },

      {
        id: "mac-flow", name: "Flow control", alias: "PAUSE and PFC", dir: "both", written: true,
        clause: { all: "Clause 31, Annex 31A, 31B; IEEE 802.1Qbb" },
        summary: "Ask the peer to pause transmission before receive buffers overflow.",
        intro:
          "If data arrives faster than a receiver can drain its buffers, the receiver can send a PAUSE control frame to its link partner. The partner then suspends ordinary data transmission for the requested interval. This can prevent buffer overflow when PAUSE is enabled and enough buffer headroom remains for data already in flight.\n\nPAUSE uses a 64-octet MAC control frame with a 16-bit duration field. The duration is measured in quanta: one quantum is 512 bit times at the current MAC rate. A zero duration releases the pause early. Clause 31 and Annexes 31A and 31B define the mechanism introduced by IEEE 802.3x.\n\nPAUSE acts on the link's ordinary data traffic as a whole. Congestion in one queue can therefore delay unrelated traffic. Priority Flow Control, described below, allows selected priorities to be paused instead. Neither mechanism removes the need to size buffers or manage congestion elsewhere in the network.",
        params: { all: [["Defined in", "Clause 31, Annex 31A, Annex 31B"], ["Introduced by", "802.3x, 1997"], ["Frame", "64-octet MAC control frame"], ["EtherType", "0x8808"], ["Duration field", "16 bits, in quanta"], ["One quantum", "512 bit times at the current MAC speed"], ["Duration zero", "release the pause"], ["Scope", "ordinary data transmission toward the requesting peer"]] },
        sections: [
          {
            id: "mac-flow-quanta", name: "Quanta, and why max pause shrinks",
            body:
              "A pause quantum is 512 bit times. To convert a requested pause to seconds, multiply the field value by 512 and divide by the MAC rate in bits per second.\n\nThe largest field value is 65,535. Its maximum duration is approximately 84 microseconds at 400G, 42 microseconds at 800G, and 21 microseconds at 1.6T. The field width stays the same; the bit time gets shorter.\n\nA receiver can issue another PAUSE request if it still needs the peer to wait, or send a zero duration to resume early. The requested duration and refresh policy depend on the implementation's buffer-management strategy.",
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
              "Priority Flow Control (PFC) lets a receiver pause selected priorities while other priorities continue transmitting. It was introduced by IEEE 802.1Qbb and is now part of IEEE 802.1Q. Like PAUSE, it uses a 64-octet MAC control frame.\n\nThe PFC frame contains a class-enable vector and eight two-octet pause-time fields, one for each priority. The vector selects which priorities' timers are updated by the frame. For example, a request can pause priority 3 while leaving priority 0 running.\n\nPFC can help prevent congestion drops for selected traffic in a network designed and configured for it. It does not by itself guarantee lossless delivery: buffer headroom, propagation delay and congestion behavior still matter. It operates through MAC control, alongside the PHY data path shown in this application.",
            params: { all: [["Standard", "IEEE 802.1Q; introduced by 802.1Qbb"], ["Frame", "64-octet MAC control frame"], ["Priorities", "8"], ["Class enable field", "2 octets; eight enable bits and eight reserved bits"], ["Pause-time fields", "eight 2-octet values in quanta"], ["Purpose", "control congestion drops for selected priorities"]] },
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
              "A receiver needs to request a pause before its buffer is full. Data continues arriving while the control frame reaches the peer and the peer responds, so the receiver must reserve space for that data. This reserved space is called headroom.\n\nThe response interval includes control-frame transmission, propagation, PHY processing and the peer's response delay. It must also allow for a data frame that is already being transmitted. As a first sizing estimate, multiply the incoming data rate by the response interval, then account for the implementation's additional requirements.\n\nFor scale, 100 ns at 400 Gb/s corresponds to 5000 octets. Even a short additional delay can therefore change the buffer headroom needed at high rates.",
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
      "The Reconciliation Sublayer (RS) connects the MAC service to the data-and-control representation used by the MII and PCS. On transmit it represents packet boundaries and idle periods with control characters. On receive it interprets the information coming back from the PHY.\n\nThe parallel interface has defined positions for the Start character. Because frames can end at different byte positions, the next Start may require idle adjustment. The [[deficit idle count]] tracks those adjustments so alignment does not reduce the specified average inter-packet gap.\n\nThe RS also handles Local Fault and Remote Fault signalling. These let one endpoint report a receive-path failure to its peer over the opposite direction of the link.",
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
          "A media independent interface (MII) represents data in parallel byte lanes. Each byte position has a control flag that distinguishes an ordinary data octet from a control character. Here, a byte lane means a position within the parallel word; it is different from a PCS lane or a physical serial lane.\n\nStart and Terminate mark packet boundaries, while Idle represents the gap between packets. Ordered sets carry signalling such as faults and contain a defined sequence of control and data characters. Terminate can occur at different byte positions, but Start must use a position permitted by the relevant MII specification.\n\nThe RS adjusts idles to meet that Start-alignment rule. The PCS below the interface then encodes groups of eight interface octets and their control information into 66-bit blocks. This is where the parallel byte representation becomes a coded block stream.",
        params: { all: [["Carries", "octets plus data/control flags"], ["Control characters", "Idle, Start, Terminate, error and sequence indications"], ["Ordered sets", "defined sequences containing control and data characters"], ["Terminate", "different byte positions permitted"], ["Start", "position defined by the relevant MII"], ["PCS grouping", "eight octets and their control information per 66-bit block"]] },
        quiz: [
          {
            q: "Why does the RS adjust idles between packets?",
            opts: ["Terminate is higher priority", "Frame lengths vary, while Start has a defined alignment requirement", "Start is not a control character", "The FCS needs a seed exchange"],
            a: 1,
            why: "The idle gap permits Start alignment without changing the frame data. Permitted Start positions are specified for the relevant MII.",
          },
        ],
      },

      {
        id: "rs-adapt", name: "Deficit idle count", alias: "keeping Start aligned without losing bandwidth", dir: "tx", written: true,
        clause: { all: "Clause 46.3.1.4, and equivalents at higher rates" },
        summary: "Insert or delete idles to align Start, and keep a running tally.",
        intro:
          "The RS must place the next packet's Start character at a permitted MII position. It can adjust the number of idles in the gap to do this. Adding idles increases transmission time; deleting them shortens the gap. Deficit idle count (DIC) keeps track of the adjustments so the specified average gap is preserved.\n\nDeleting idles increases the deficit. Adding idles reduces it. A bounded counter prevents the RS from repeatedly shortening gaps without compensating for the deletions.\n\nThe original 10 Gb/s RS uses a counter from zero to three and can shorten a nominal 12-octet gap to nine octets. Those numbers are a 10G example, not the bounds for every rate. Higher-rate interfaces have their own alignment rules and DIC definitions; use the relevant RS clause for the selected rate.",
        params: { all: [["Incremented when", "idle characters are deleted"], ["Decremented when", "idle characters are inserted"], ["Bounds in the 10G example", "0 to 3"], ["10G example gap", "nominal 12 octets can become 9"], ["Higher rates", "use the relevant RS alignment and DIC definition"], ["Preserved", "the specified average gap"]] },
        sections: [
          {
            id: "rs-adapt-why", name: "Why not just always insert",
            body:
              "One way to align Start would be to add idles whenever the next permitted byte position is farther away. That would satisfy alignment, but repeated additions would increase the average gap and reduce throughput.\n\nDIC permits some gaps to be shortened and tracks the resulting deficit. Later idle additions compensate for those deletions. The bounded accounting lets the RS satisfy Start alignment while maintaining the required average spacing. It does not promise a 12-octet gap over every arbitrary short group of frames.",
            params: { all: [["Repeated insertion", "increases average transmission time"], ["Uncompensated deletion", "can violate the average gap"], ["Deficit counter", "tracks bounded idle adjustments"]] },
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
              "Idle adjustment can serve two different purposes. Start alignment places a packet at a permitted byte position on the local MII. Clock compensation accommodates a frequency difference between independently clocked parts of the link.\n\nEven clocks within specification can run at slightly different rates. The receive path may therefore need to add or remove idle time to cross between clock domains without changing frame data. The units and rules depend on the relevant interface and coding scheme.\n\nWhen measuring packet spacing, identify the observation point. A gap measured after receive-side clock compensation need not equal the gap originally produced by the transmitting MAC or RS.",
            params: { all: [["Alignment", "meets the local MII Start-position rule"], ["Clock compensation", "accommodates clock-frequency differences"], ["Implementation", "units and rules depend on the interface"], ["Measurement", "identify the transmit or receive observation point"]] },
          },
        ],
      },

      {
        id: "rs-fault", name: "Local and remote fault", alias: "LF and RF", dir: "both", written: true,
        clause: { "400G": "Clause 81.3.4", "800G": "Clause 81.3.4", "1.6T": "Clause 174 (draft)" },
        summary: "How a broken receive direction is reported back to the far end.",
        intro:
          "An Ethernet link has two directions. One endpoint can lose its receive path while the opposite direction still carries data. Local Fault and Remote Fault signalling allow that endpoint to tell its peer that reception has failed.\n\nWhen the PHY indicates Local Fault to the RS, the RS stops transmitting MAC data and sends Remote Fault toward the peer. The peer receiving Remote Fault stops its own MAC data transmission and sends idles. This behavior helps both endpoints recognize that the link is unavailable.\n\nLocal Fault means a problem was detected in the local receive direction. Remote Fault means the peer reports a problem receiving from this endpoint. These names describe where the fault is observed, not which component caused it. Clause 81.3.4 defines the behavior for the relevant higher-rate interfaces and supports bidirectional operation; the 1.6T interface is described in the draft material referenced here.",
        params: {
          "400G": [["Specified in", "Clause 81.3.4, following Clause 46"], ["Local fault means", "a fault on my receive path"], ["Remote fault means", "the far end cannot receive from me"], ["On local fault, the RS", "stops MAC data, transmits remote fault"], ["On remote fault, the RS", "stops frames, sends only idles"], ["Unidirectional operation", "not supported"], ["Status exposed via", "MDIO registers, Clause 45"]],
          "800G": [["Specified in", "Clause 81.3.4"]],
          "1.6T": [["Specified in", "Clause 174", { draft: true }]],
        },
        sections: [
          {
            id: "rs-fault-limits", name: "What it cannot tell you",
            body:
              "Local Fault and Remote Fault identify an affected direction, but do not identify the failed component. A Local Fault can result from a problem in the local receiver, the connecting medium, or the peer's transmit path.\n\nFor example, the peer's optical transmitter could fail while its receiver continues receiving correctly. This endpoint would see Local Fault even though the initiating failure occurred at the peer. The opposite situation, a failure in this endpoint's receiver, can produce the same indication.\n\nUse per-sublayer status, available through management such as Clause 45 MDIO, together with signal and error measurements to narrow the cause. A fault indication is a starting point for diagnosis, not proof that the failed hardware is local or remote.",
            params: { all: [["Resolution of LF/RF", "affected link direction"], ["Cannot identify", "the initiating failed component"], ["Local fault can originate in", "local receive hardware, medium or peer transmit path"], ["Localisation tools", "per-sublayer MDIO status and signal/error measurements"]] },
            quiz: [
              {
                q: "You see Local Fault. What can you conclude from that indication alone?",
                opts: ["Your own transmitter has failed", "A problem was detected in your receive direction; the component is not identified",
                       "The link is fine", "Both ends have failed"],
                a: 1,
                why: "The name identifies the observation direction. The cause can be local receive hardware, the medium, or the peer's transmit path.",
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
      "The Physical Coding Sublayer (PCS) converts MII data and control characters into a coded stream that the receiver can reconstruct. For 400GBASE-R, the transmit sequence is 64B/66B encoding, 256B/257B transcoding, scrambling, alignment-marker insertion, distribution into FEC messages, RS-FEC encoding, and distribution onto [[PCS lanes]]. The receive path reverses these operations after recovering and aligning the lanes.\n\nPCS lanes are logical streams. The PMA maps them onto a supported physical interface, so the PCS lane count can differ from the number of electrical or optical lanes. For example, the 400GBASE-R PCS uses 16 logical lanes even when the physical interface uses four lanes.\n\n800GBASE-R uses two flows with processing derived from the 400G PCS. The referenced 1.6T draft also uses two flows, but its details should not be inferred by simply doubling every 800G value. The 1.6T lane count remains unconfirmed in this application's source set.\n\nAt these rates, [[RS-FEC]] is specified as part of the PCS. This map draws it separately to make its role easier to study. The separate box does not imply an additional IEEE sublayer boundary between PCS processing and its RS-FEC functions.",
    terms: {
      "PCS lanes":
        "A logical stream produced by a particular PCS definition. A compatible PMA maps logical lanes onto its specified interface. PCS lanes, MII byte positions and physical serial lanes are different kinds of lane.",
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
        summary: "Encode eight interface octets and control information into 66-bit blocks.",
        intro:
          "64B/66B encoding turns eight MII octets and their data/control information into a 66-bit block. A two-bit sync header identifies the block category: 01 for data and 10 for control. A control block also carries a block-type field that specifies how its remaining bits should be interpreted.\n\nThe extra two bits give an overhead of 2 / 64 = 3.125 percent relative to the uncoded data. In the PCS designs covered here, four 66-bit blocks are subsequently transcoded into 257 bits. That reduces the coding overhead before Reed-Solomon parity is added.\n\nHeaders 00 and 11 are invalid for normal transmitted blocks. In designs that acquire block lock from sync headers, repeated legality checks help locate the block boundary. The higher-rate receive pipeline also uses alignment markers and FEC, so sync-header checking should not be treated as its only alignment mechanism.",
        terms: { "baud rate": "Symbols per second on the line, as distinct from bits per second. PAM4 carries two bits per symbol, so a 106.25 Gb/s lane runs at 53.125 GBd." },
        params: { all: [["Block", "66 bits"], ["Payload", "64 bits"], ["Overhead", "3.125 percent"], ["Data header", "01"], ["Control header", "10"], ["Illegal", "00 and 11"]] },
        sections: [
          {
            id: "pcs-6466-struct", name: "Block structure",
            body:
              "A 66-bit block has a two-bit sync header followed by a 64-bit payload. For a data block, that payload is eight data octets. For a control block, the first payload octet is the block-type field; the remaining bits represent data and control according to that type.\n\nThe sync header is not a checksum. Some bit errors turn a legal header into an illegal one, but others change one legal header into the other. Error correction and the receive validity checks are therefore needed in addition to header legality.",
            params: { all: [["Bits 1-2", "sync header"], ["Bits 3-66", "payload, 8 octets"], ["Control block", "first payload octet is block type"], ["Header protection", "none; legality-checked"]] },
          },
          {
            id: "pcs-6466-control", name: "Control blocks and ordered sets",
            body:
              "The MII carries more than frame data. It also carries Idle, Start, Terminate, error indications and ordered sets for signalling. A 64B/66B control block represents defined combinations of these characters, sometimes together with data octets. Its block-type field tells the receiver which combination is present.\n\nAfter a detected uncorrectable FEC event, the receive PCS produces error indications rather than treating the affected blocks as valid data. The coding and decoding rules define how those indications reach the interface above the PCS.",
            params: { all: [["Carried as", "control blocks, header 10"], ["Examples", "idle, error, start, terminate, ordered sets"], ["Selector", "block type field"], ["Used by", "fault signalling and error marking"]] },
          },
          {
            id: "pcs-6466-lock", name: "Illegal headers and block lock",
            body:
              "A sync-header-based block-lock process tests a candidate boundary by checking successive two-bit headers. At a wrong boundary, the tested pairs can resemble random data, producing many 00 and 11 values. The process shifts the candidate boundary until enough legal headers meet the lock criteria.\n\nRepeated failure to acquire or retain lock is evidence that the receiver cannot reliably interpret the stream. Check the configured rate and coding, signal presence, and error measurements. Illegal headers alone do not uniquely identify the cause; poor signal quality can also prevent lock.",
            params: { all: [["Hunt", "test candidate sync-header boundaries"], ["Illegal normal headers", "00 and 11"], ["Declares", "block lock when specified criteria are met"], ["Checks after failure", "signal, coding, configuration and error measurements"]] },
            quiz: [
              {
                q: "During block-lock acquisition, what does a high rate of illegal headers suggest?",
                opts: ["It proves FEC has failed", "The candidate block boundary may be wrong", "It proves the scrambler is misconfigured", "It identifies a failed fibre"],
                a: 1,
                why: "At a wrong boundary the tested bit pairs can resemble random data. Poor signal quality can also cause violations, so this is evidence rather than a unique diagnosis.",
              },
            ],
          },
        ],
        quiz: [
          {
            q: "Why does the 400G PCS transcode the 66-bit blocks before FEC encoding?",
            opts: ["Encoders cannot run that fast", "FEC needs overhead too, and the total must fit the baud rate", "Control blocks become ambiguous", "It breaks the scrambler"],
            a: 1,
            why: "Transcoding reduces coding overhead while preserving data and control information, allowing Reed-Solomon parity within the selected serial-rate overhead budget.",
          },
        ],
      },

      /* ---------------- 256B/257B ---------------- */
      {
        id: "pcs-257", name: "256B/257B transcoding", alias: "making room for FEC", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.2", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Four 66-bit blocks compressed into one 257-bit block.",
        intro:
          "256B/257B transcoding combines four 66-bit blocks into one 257-bit block. The input occupies 264 bits, including eight sync-header bits. The transcoder uses a more compact representation of the data/control information while preserving the contents needed to reconstruct those four blocks.\n\nFor an all-data group, one leading bit identifies the group and the remaining 256 bits carry the data. Coding overhead falls from 2 / 64 = 3.125 percent to 1 / 256 ≈ 0.39 percent. This leaves more of the specified line-rate overhead available for FEC parity.\n\nThe operation is reversible. After FEC decoding and descrambling, the receiver reconstructs the original 66-bit blocks. In the 400G chain, the resulting 257-bit units also provide a convenient size for FEC-message and alignment-marker-group accounting.",
        params: { all: [["Input", "4 x 66 bits = 264"], ["Output", "257 bits"], ["Overhead before", "3.125 percent"], ["Overhead after", "0.39 percent"], ["Reversible", "exactly"]] },
        sections: [
          {
            id: "pcs-257-lead", name: "The leading bit",
            body:
              "The leading bit identifies whether all four source blocks were data blocks. In the all-data case, the other 256 bits are simply the four 64-bit payloads placed in sequence.\n\nIf a control block is present, the receiver uses the control-case representation instead. The leading bit distinguishes these cases; it does not check the block for errors.",
            params: { all: [["Leading bit", "distinguishes all-data and control-containing groups"], ["All-data representation", "four 64-bit payloads plus the indicator"], ["Error protection", "the indicator is not a checksum"]] },
          },
          {
            id: "pcs-257-control", name: "When control blocks are present",
            body:
              "When a group contains control blocks, the transcoder must preserve their positions and types as well as any accompanying data. It encodes that information using the defined control-case format.\n\nThe receiver uses the format to reconstruct all four 66-bit blocks, including their headers and control information. A mixture of data and control blocks, or a group of idles, is supported by the same transcoding process.",
            params: { all: [["Flagged", "which of the four were control"], ["Relocated", "block type fields"], ["Reconstruction", "exact, unambiguous"], ["Works for", "any mix of data and control"]] },
          },
          {
            id: "pcs-257-order", name: "Transcode before scramble",
            body:
              "For the 200GBASE-R and 400GBASE-R chain in Clause 119, transcoding comes before scrambling. This differs from the 100G RS-FEC chain introduced by IEEE 802.3bj, which scrambles before transcoding. Check the rate and PCS definition when comparing diagrams.\n\nOn receive, the Clause 119 chain performs FEC decoding, removes the alignment-marker group, descrambles, and reverses the transcode. If erroneous data reaches the descrambler, its error propagation can affect a subsequent 257-bit block. The receive error-marking rules account for that extension.",
            params: { all: [["200G and 400G onward", "transcode, then scramble"], ["100G era (802.3bj)", "scramble, then transcode"], ["Reason", "simpler transcoder"]] },
          },
        ],
        quiz: [
          {
            q: "What is the recovered overhead spent on?",
            opts: ["Higher goodput", "Reed-Solomon parity", "Alignment markers", "Larger inter-packet gaps"],
            a: 1,
            why: "In this PCS, reducing coding overhead provides room for FEC parity within the specified serial rate. It does not remove MAC framing overhead.",
          },
        ],
      },

      /* ---------------- scrambler ---------------- */
      {
        id: "pcs-scramble", name: "Scrambling", alias: "self-synchronous scrambler", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.3", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Reduces repetitive patterns and improves the stream's transition statistics.",
        intro:
          "A receiver needs enough signal transitions to recover timing. Long repetitive patterns can also concentrate energy at particular frequencies and create low-frequency imbalance. Scrambling reduces those patterns by combining the data with a sequence generated from earlier bits.\n\nThe Clause 119 scrambler uses x⁵⁸ + x³⁹ + 1 and operates on the transcoded stream before alignment markers are inserted. It is self-synchronous: the receiver reconstructs the needed state from received bits, without negotiating a seed.\n\nScrambling improves the stream's statistics. It does not guarantee an exact balance of zeros and ones, or a fixed maximum run length. [[baseline wander]] is one receiver impairment that sustained low-frequency imbalance can contribute to.",
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
              "The scrambler includes the leading control/data indicator as well as the other bits of each 257-bit block. During a long run of all-data groups, that indicator would otherwise repeat at a regular interval.\n\nScrambling the entire block reduces the periodic structure that the repeated indicator could introduce. The receiver descrambles before interpreting the transcoded format, so the indicator is recovered along with the data.",
            params: { all: [["Nature", "flag bit, not payload"], ["Problem", "constant through all-data runs"], ["If omitted", "reduced randomness, periodic content"], ["Decision", "scramble it"]] },
          },
          {
            id: "pcs-scramble-mult", name: "Error multiplication",
            body:
              "A self-synchronous descrambler uses earlier received bits in its calculation. An erroneous input bit can therefore affect the current output and later outputs at the polynomial's delay positions. This is error multiplication, and the affected bits need not form a contiguous burst.\n\nIn the Clause 119 receive chain, FEC decoding happens before descrambling. Corrected errors do not reach the descrambler, but residual errors can propagate. That is why the applicable stateless-decoder rules extend error marking into the next transcoded block after a detected uncorrectable event.",
            params: { all: [["Cause", "earlier received bits affect later descrambler outputs"], ["Effect", "one residual error can create several separated output errors"], ["FEC position", "decoding precedes descrambling in Clause 119"], ["Consequence", "applicable error marking accounts for extension"]] },
          },
        ],
        quiz: [
          {
            q: "Why use a self-synchronous scrambler rather than one needing a seed exchange?",
            opts: ["Better randomisation", "The receiver converges with no handshake", "It avoids error multiplication", "FEC requires it"],
            a: 1,
            why: "The receiver reconstructs the required state from received data. Residual errors can multiply during descrambling, which the receive error-marking rules must account for.",
          },
        ],
      },

      /* ---------------- alignment markers ---------------- */
      {
        id: "pcs-am", name: "Alignment markers", alias: "AM insertion", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.4", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Per-lane fingerprints for identification, deskew and monitoring.",
        intro:
          "Logical lanes may reach the receiver with different delays and in a different order. Alignment markers provide a recurring reference that lets the receiver identify each PCS lane and line up corresponding positions before rebuilding codewords.\n\nIn 400GBASE-R, each lane's marker is a 120-bit field with common and lane-specific elements. The 16 markers are inserted together as an [[alignment marker group]] before FEC encoding and lane distribution. After distribution, the receiver can search for the markers independently on each logical lane.\n\nThe common elements help locate the recurring pattern; the lane-specific elements identify the logical lane. Once the markers are found, the receiver measures relative delay and uses buffering to remove it. The table distinguishes the verified 400G structure from details not confirmed for 1.6T.",
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
              "Marker elements serve two roles. Common elements have the same defined pattern across lanes and give the receiver a recognizable alignment reference. Lane-specific elements distinguish one logical lane from another.\n\nThe receiver checks these patterns repeatedly at the expected interval. It uses the lane identity to restore logical order and the relative marker positions to measure skew. Marker-lock rules allow specified mismatches because the search occurs before FEC correction.",
            params: { all: [["Common elements", "boundary and lane presence"], ["Unique elements", "which lane this is"], ["Field size", "120 bits per lane at 400G"]] },
          },
          {
            id: "pcs-am-group", name: "The marker group",
            body:
              "The 400G alignment-marker group contains 16 markers of 120 bits each, a 133-bit pad, and a three-bit status field. The total is 16 × 120 + 133 + 3 = 2056 bits, equivalent to eight 257-bit blocks. The group is positioned at the start of a pair of FEC messages.\n\nIt is inserted after scrambling, so the marker pattern remains recognizable on receive. It does not use the normal transcoded-data format. The pad uses a free-running PRBS9 sequence with polynomial x⁹ + x⁵ + 1 and a nonzero seed; the receiver does not interpret the pad as frame data.\n\nIdle deletion or suppression makes room for the group in the fixed-rate stream. Marker insertion therefore does not require an increase in signaling rate.",
            params: { all: [["Composition", "16 markers + 133-bit pad + 3-bit status"], ["Size", "eight 257-bit blocks"], ["Pad", "PRBS9, x^9 + x^5 + 1, any non-zero seed"], ["Scrambling", "none"], ["Aligned to", "the start of two FEC messages"], ["Room made by", "deleting idles"]] },
          },
          {
            id: "pcs-am-period", name: "How often markers appear",
            body:
              "For 400GBASE-R, successive alignment-marker groups begin 163,840 × 257-bit units apart. A FEC message contains the equivalent of 20 such units, so that interval corresponds to 163,840 / 20 = 8192 codewords across the interleaved stream. It includes the marker group itself.\n\nThe corresponding 200GBASE-R interval is 81,920 units, or 4096 codewords. These are Clause 119 values; the 1.6T marker interval is not confirmed in this application's source set.\n\nThe 400G high-symbol-error-rate indicator also uses an 8192-codeword observation window. Sharing an interval does not require implementations to use the same physical counter.",
            params: {
              "400G": [["Period", "163,840 x 257-bit blocks"], ["In codewords", "8192"], ["200GbE period", "81,920 blocks = 4096 codewords"], ["Also used as", "the hi_ser measurement window"]],
              "800G": [["Window", "8192 codewords per 400G flow, results OR'd"]],
              "1.6T": [["Marker interval", "not confirmed in this source set", { draft: true }]],
            },
          },
          {
            id: "pcs-am-monitor", name: "Per-lane monitoring",
            body:
              "Marker processing gives the receiver visibility into individual logical lanes. It can report which lanes have acquired marker lock and use the defined monitoring information to help identify an error concentration. This is more useful for diagnosis than a single link-up or link-down indication.\n\nAlignment-marker lock is acquired before FEC correction. The lock process must therefore tolerate the specified level of marker errors. Interpret marker status alongside corrected-symbol, codeword and physical-interface measurements; a logical lane is not always a separate fibre.",
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
            why: "Idle deletion or suppression provides room for the group while keeping the specified signaling rate. The markers occupy stream space that would otherwise be idle.",
          },
        ],
      },

      /* ---------------- distribution ---------------- */
      {
        id: "pcs-dist", name: "Pre-FEC distribution", alias: "splitting into FEC messages and lanes", dir: "tx", written: true,
        clause: { "400G": "Clause 119.2.4.5", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Distribute data into FEC messages, then encoded symbols onto PCS lanes.",
        intro:
          "There are two distributions in the 400G chain. Before FEC encoding, the scrambled stream with inserted markers is split into messages. After encoding, the codewords are interleaved and their symbols are distributed onto PCS lanes.\n\nAt 400G, 40 × 257-bit blocks provide 10,280 bits. A 10-bit round-robin distribution splits them into two 5140-bit messages, mA and mB. Each message becomes a Reed-Solomon codeword with 544 ten-bit symbols. The encoded symbols are then interleaved and distributed onto 16 PCS lanes.\n\nThe table gives the rate-specific arrangement. The 800G PCS has two flows; the 400G two-message example should not be read as a total codeword count for 800G or 1.6T.",
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
              "Start with 40 transcoded blocks: 40 × 257 = 10,280 bits. Distributing ten bits at a time between mA and mB gives 5140 bits in each message.\n\nEach message contains 514 ten-bit symbols, which is the message length required by RS(544,514). It is also equal in length to 20 × 257 bits. That equality describes its size; the round-robin distribution does not simply hand 20 intact transcoded blocks to each message.\n\nThe encoder adds 30 symbols of parity to each message. Each output codeword is therefore 544 × 10 = 5440 bits.",
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
              "After encoding, codewords A and B are interleaved in ten-bit symbols. The interleaved stream is distributed one symbol at a time across the 400G PCS lanes in ascending lane order. The defined mapping lets the receiver reverse that distribution and reconstruct both codewords.\n\nA channel error burst can affect symbols from more than one codeword, depending on this mapping and the PMA multiplexing below it. Correction capacity belongs to each codeword separately, so the distribution of errors matters as well as their total number.",
            params: { all: [["Interleave", "10-bit basis, two codewords"], ["Distribution", "one symbol per lane, ascending"], ["Effect", "lane damage is split across both codewords"]] },
          },
          {
            id: "pcs-dist-div", name: "Why the lane count divides",
            body:
              "The 400GBASE-R PCS produces 16 logical lanes. A compatible PMA can multiplex them onto a supported interface with fewer serial lanes, such as four 100G-class lanes. The logical lane count is therefore different from the physical interface width.\n\nThe lane structure was chosen to support the intended PMA mappings. Divisibility makes those mappings convenient, but it does not establish that every mathematical ratio has a standardized PMA or PMD. Use the specified interface combinations when selecting a PHY.",
            params: {
              "400G": [["PCS lanes", "16"], ["Purpose", "support specified interface widths through PMA mappings"], ["Selection", "use the defined mapping, not any mathematically possible divisor"]],
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
          "Before reconstructing FEC codewords, the receiver has to find the alignment markers and bring corresponding lane positions together. For 400GBASE-R, each of the 16 logical PCS lanes has an independent marker-lock process.\n\nRepeated detection of the expected marker pattern establishes alignment; the unique elements identify the lane. The receiver then measures offsets and delays earlier-arriving lanes in buffers until corresponding positions line up. This buffering is called deskew.\n\nMarker acquisition happens before FEC correction, so an exact bit-for-bit match cannot be required on every occurrence. The PCS specifies the matching and repetition criteria needed to acquire and retain lock despite errors.",
        params: {
          "400G": [["Lock processes", "16, one per lane, independent"], ["Uses", "common elements, then unique elements"], ["Runs", "before FEC correction"], ["Tolerates", "some errored bits in the marker"]],
          "800G": [["Markers", "32"], ["Lock", "per lane, independent"]],
          "1.6T": [["Detail", "not yet confirmed", { draft: true }]],
        },
        sections: [
          {
            id: "pcs-lock-debug", name: "Reading the failure",
            body:
              "If one logical lane repeatedly fails to lock while others remain stable, inspect the paths and mappings associated with that lane. Possible causes include signal quality, a connector or trace problem, a lane-specific configuration issue, or an incorrect mapping. Several logical lanes may share a physical lane, so check the PMA mapping before identifying a fibre.\n\nIf all lanes fail, first check common causes such as signal presence, rate, coding and interface configuration. This comparison helps prioritize checks; it does not prove a particular component has failed. Use marker status together with per-lane error and signal measurements.",
            params: { all: [["One lane fails", "prioritize its signal paths, mapping and lane-specific configuration"], ["All lanes fail", "check common signal, rate and configuration causes"], ["Interpretation", "diagnostic clues, not proven root causes"]] },
            quiz: [
              {
                q: "Fifteen of sixteen lanes achieve lock. Where do you look?",
                opts: ["PCS configuration", "The failing lane's physical path", "The far-end MAC", "The scrambler polynomial"],
                a: 1,
                why: "A lane-specific failure helps prioritize checks of the associated paths and mappings. Configuration and signal quality can both be lane-specific; the indication is not proof of a failed fibre.",
              },
            ],
          },
          {
            id: "pcs-lock-buffer", name: "The deskew buffer",
            body:
              "A deskew buffer holds data from earlier-arriving lanes while the receiver waits for the corresponding data on the latest lane. The receiver needs enough capacity to cover the permitted skew and its variation. At a given lane rate, a longer delay allowance requires more stored bits.\n\nBuffering costs implementation area and can add latency. The specification defines the required tolerance, while the implementation chooses how to meet it. The Skew and the skew budget lesson shows the cumulative allowances along an example 400G path.",
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
          "The receiver uses the lane identities in the alignment markers to restore logical lane order. This allows the receive PCS to reconstruct the transmitted stream even when a supported physical mapping changes which input carries a logical lane. It does not mean that arbitrary fibre wiring is valid for every PMD.\n\nAfter marker acquisition, deskew and lane ordering, the receiver reverses the symbol distribution and interleaving. The reconstructed codewords can then be passed to the Reed-Solomon decoder. FEC needs the correct symbol order before it can determine and correct errors.",
        params: { all: [["Input", "deskewed, identified lanes"], ["Output", "reassembled codewords"], ["Enables", "arbitrary physical lane order"], ["Order", "align, deskew, reorder, de-interleave, decode"]] },
        sections: [
          {
            id: "pcs-reorder-fail", name: "Why failure here is loud",
            body:
              "An incorrect lane order places symbols in the wrong codeword positions. A persistent mapping error will generally cause widespread decode failures rather than a small increase in random errors.\n\nCheck lane identities and the configured mapping when marker lock is present but decoding fails heavily. The symptom alone is not conclusive: severe signal errors, transient alignment loss and other configuration problems can also produce many uncorrectable codewords.",
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
          "After the lanes are aligned and the codewords reconstructed, RS-FEC corrects errors within its capacity. The PCS then removes alignment markers, descrambles the data, reverses 256B/257B transcoding, and decodes the 66-bit blocks back into MII data and control information.\n\nA detected uncorrectable codeword requires a different path. The PCS marks the affected output as erroneous so the MAC can reject the associated frames. The scope of that marking is defined by the relevant PCS and decoder rules; it is not simply a request to pass the remaining bits upward unchanged.",
        params: { all: [["After FEC decoding", "remove markers, descramble, reverse transcode, decode"], ["On detected uncorrectable", "applicable blocks marked EBLOCK_R"], ["Error representation", "can use sync header 11"], ["Upstream effect", "error indication for frame rejection"]] },
        sections: [
          {
            id: "pcs-decode-eblock", name: "How an uncorrectable codeword is marked",
            body:
              "In the Clause 119 two-codeword arrangement, if either interleaved codeword is detected as uncorrectable, the PCS marks all reconstructed 66-bit blocks belonging to both codewords as error blocks. This is the specified marking scope, even though the decoder processes the codewords separately.\n\nEBLOCK_R is the defined error-block representation. Setting the sync header to 11 is one way to produce it. On decoding, the indication is propagated toward the MAC so the affected data is not treated as a valid frame.\n\nThe applicable stateless-decoder rules also account for descrambler error extension by marking the following 257-bit block, which becomes four 66-bit blocks. These rules have evolved in the referenced 802.3df/dj material; apply the definition for the relevant PCS and revision rather than assuming every rate has the same marking scope.",
            params: { all: [["Clause 119 pair", "mark both codewords' reconstructed blocks"], ["Representation", "EBLOCK_R; can use sync header 11"], ["Applicable extension", "next 257-bit block = four 66-bit blocks"], ["Check", "PCS, decoder definition and specification revision"]] },
            quiz: [
              {
                q: "In the Clause 119 pair, one codeword is detected as uncorrectable. What gets marked?",
                opts: ["Only the failed codeword", "Both codewords' blocks", "Only the parity symbols", "The whole alignment marker period"],
                a: 1,
                why: "Clause 119 specifies marking both codewords' reconstructed blocks. Interleaving does not prevent the decoder from evaluating each codeword separately.",
              },
              {
                q: "Why do the applicable stateless-decoder rules extend marking into the next 257-bit block?",
                opts: ["To pad the codeword", "Descrambler error propagation contaminates the next transcoded block", "To trigger a link reset", "Because the FEC parity spans them"],
                a: 1,
                why: "Self-synchronous descrambling carries the error forward into the next 257-bit block, which expands into four 66-bit blocks.",
              },
            ],
          },
          {
            id: "pcs-decode-principle", name: "Propagating detected errors",
            body:
              "When the PHY detects damage it cannot correct, it must propagate an error indication rather than silently present the affected data as good. The receiving MAC can then reject invalid frames using those indications and its frame checks. Losing a frame lets higher layers recover; accepting wrong data as valid can be harder to detect.\n\nThis is the purpose of the PCS error-marking rules. It is a reliability requirement, not a guarantee that undetected corruption is mathematically impossible. FEC miscorrection and CRC collisions remain part of the error-detection analysis.",
            params: { all: [["Detected unrecoverable errors", "propagate an indication for rejection"], ["Residual risks", "FEC miscorrection and CRC collisions"], ["MAC checks", "frame validity and FCS"], ["Related", "decoder detection expectation, under FEC"]] },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ FEC */
  fec: {
    id: "fec", name: "RS-FEC", alias: "KP4; applicable optical paths add inner FEC", zone: "coding", written: true,
    clause: { "400G": "Clause 119", "800G": "Clause 172", "1.6T": "Clause 175, plus Clause 177 Inner FEC (draft)" },
    face: { "400G": "RS(544,514)", "800G": "RS(544,514)", "1.6T": "outer + inner" },
    summary: "Adds parity so the receiver can correct errors before reconstructing frames.",
    intro:
      "Forward error correction (FEC) adds parity at the transmitter so the receiver can repair some channel errors without retransmission. It is a required part of the BASE-R PHY designs covered here. Their error budgets are specified with FEC present.\n\nThe outer code is [[RS(544,514)]], commonly called KP4. Each codeword has 514 message symbols and 30 parity symbols, with ten bits per symbol. The decoder is required to correct any combination of up to 15 erroneous symbols in a codeword. More errors exceed that guaranteed correction capacity.\n\nSome 200G-per-lane optical paths in the referenced P802.3dj architecture add an inner code around the optical segment. This [[concatenated FEC]] works with the outer Reed-Solomon code. The need and arrangement depend on the PHY and its operating mode, rather than on the aggregate MAC rate alone. Start with Codeword anatomy, then use the interleaving and decoding lessons to follow how errors consume correction capacity.",
    terms: {
      "RS(544,514)": "544 ten-bit symbols per codeword, 514 message and 30 parity, correcting up to 15 symbol errors. Known industrially as KP4.",
      "concatenated FEC": "An outer code protects a broader path while an inner code protects a segment within it. Residual inner-code errors are presented to the outer decoder.",
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
        ["Inner", "Hamming(128,120) on applicable 200G/lane optical paths", { draft: true }],
        ["Inner FEC clause", "177", { draft: true }],
        ["Referenced optical arrangement", "concatenated (Type 2); check PMD and mode", { draft: true }],
      ],
    },
    subs: [
      {
        id: "fec-cw", name: "Codeword anatomy", alias: "what RS(544,514) is", dir: "both", written: true,
        clause: { "400G": "Clause 119", "800G": "Clause 172", "1.6T": "Clause 175 (draft)" },
        summary: "Symbols, parity, and correction capacity.",
        intro:
          "RS(544,514) describes a codeword of 544 symbols containing 514 message symbols. Each symbol is ten bits, so a codeword occupies 5440 bits: 5140 bits of message and 300 bits of parity. The 30 parity symbols support correction of any combination of up to 15 symbol errors.\n\nA symbol counts as erroneous if any of its ten bits is wrong. One wrong bit and several wrong bits within the same symbol both consume one symbol of correction capacity. To assess a burst, count how many symbols it touches within each codeword, rather than only counting erroneous bits.",
        params: { all: [["Codeword", "544 symbols, 5,440 bits"], ["Message", "514 symbols, 5,140 bits"], ["Parity", "30 symbols"], ["Symbol", "10 bits, GF(2^10)"], ["Corrects", "t = 15 symbols"], ["Counted in", "symbols, never bits"]] },
        sections: [
          {
            id: "fec-cw-gf", name: "Symbols and GF(2^10)",
            body:
              "The ten-bit symbols are elements of GF(2¹⁰), a finite field with 1024 elements. A conventional Reed-Solomon construction over this field can have up to 1023 symbols; the Ethernet code uses a shortened length of 544. The field arithmetic lets the decoder use the parity relationships to locate and correct erroneous symbols.\n\nThe message length also fits the PCS accounting: 514 × 10 = 5140 bits, equal in length to 20 × 257 bits. This size relationship connects the Reed-Solomon message to the transcoded stream. It does not imply that the code operates on 257-bit symbols.",
            params: { all: [["Field", "GF(2^10)"], ["Elements", "1,024"], ["Max codeword", "1,023 symbols"], ["Used", "544"], ["Construction rule", "message = whole number of 257-bit blocks"], ["Construction rule", "codeword spreads evenly over 4, 8, 16 lanes"]] },
          },
          {
            id: "fec-cw-budget", name: "The fifteen-symbol budget",
            body:
              "Assume 40 erroneous bits lie within four complete ten-bit symbols in one codeword. They consume four of its 15 guaranteed correctable symbol errors. If 40 erroneous bits instead touch 20 different symbols in that codeword, they exceed the guaranteed correction capacity.\n\nThe bit-error count is the same, but the decoder sees a different symbol-error count. Interleaving and PMA multiplexing affect where a channel burst lands. Also check codeword boundaries: each codeword has its own 15-symbol capacity. Beyond that limit, successful correction is not guaranteed and the decoder must detect failures as required by its specification.",
            params: { all: [["Correction unit", "ten-bit symbol"], ["40 erroneous bits in four symbols", "four symbol errors"], ["40 erroneous bits touching twenty symbols", "twenty symbol errors, beyond guaranteed capacity"], ["Guaranteed capacity", "up to 15 erroneous symbols per codeword"]] },
            quiz: [{"q":"Forty erroneous bits touch twenty symbols in one RS(544,514) codeword. What follows?","opts":["They are guaranteed correctable","They exceed the guaranteed 15-symbol correction capacity","Only the bit count matters","Parity is unaffected"],"a":1,"why":"Twenty erroneous symbols exceed the guaranteed capacity. Beyond fifteen, successful correction is not guaranteed; the outcome and failure detection depend on the error pattern and decoder requirements."}],
          },
          {
            id: "fec-cw-mttfpa", name: "Detection, not just correction",
            body:
              "A decoder can report that it could not correct a codeword, or it can miscorrect: choose a different valid codeword and output wrong message data. Reported failures can be marked for rejection. Miscorrection is harder to handle because the output appears valid to the next stage.\n\nClause 119 requires correction of any combination of up to t = 15 symbol errors and indication of uncorrected codewords. It states that the probability of failing to indicate a codeword with t + 1 errors as uncorrected is not expected to exceed 10⁻¹⁶, with that expectation also applying to larger error counts. This is a decoder mis-detection expectation under the clause's conditions, not a universal probability for a corrupted Ethernet frame to be accepted.\n\nThe MAC's FCS supplies another error check, but is not an absolute guarantee against silent corruption. Both decoder detection and frame validation contribute to the link's reliability.",
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
          "Interleaving specifies how symbols from different codewords are mixed before transmission. In the 400G PCS, two codewords are interleaved in ten-bit symbols and distributed onto logical lanes. The receiver reverses that mapping before decoding.\n\nThe PMA then maps logical lanes onto the serial interface. Bit multiplexing and symbol multiplexing use different units, which changes how a burst on one serial lane is spread across Reed-Solomon symbols and codewords. Since correction capacity is counted per codeword, the error distribution can change performance even when the total number of wrong bits stays the same.\n\nThe 200G-per-lane PMA in the referenced Clause 176 material uses symbol multiplexing. It is a PMA mapping choice, separate from the Reed-Solomon encoder and its message length.",
        params: {
          "400G": [["Codewords", "2, interleaved on a 10-bit basis"], ["To lanes", "one 10-bit symbol at a time, ascending"], ["Below", "bit multiplexing in the PMA"]],
          "800G": [["Codewords", "4"], ["Below", "32:8 restricted bit-level multiplexing (Clause 173)"]],
          "1.6T": [["Below", "Clause 176 symbol-multiplexing PMA", { draft: true }], ["Adopted", "March 2023, for 200G/lane AUIs and PMDs", { draft: true }]],
        },
        sections: [
          {
            id: "fec-il-tension", name: "Two opposing pressures",
            body:
              "Interleaving can spread a short error event between codewords, leaving fewer erroneous symbols in each. Preserving symbol boundaries can also keep several erroneous bits within one Reed-Solomon symbol. Both effects matter, and the complete PCS/PMA mapping determines which occurs for a particular burst.\n\nThis does not make a failed physical lane correctable. A persistent lane failure can damage far more symbols than the code can repair. For the Clause 119 interleaved pair, a detected uncorrectable codeword also causes both codewords' reconstructed blocks to be marked bad under the PCS rules.",
            params: {"all":[["Spread","a short event can affect fewer symbols per codeword"],["Concentrate","preserving symbol boundaries can reduce the symbol-error count"],["Clause 119 pair","a detected uncorrectable codeword causes both partners' blocks to be marked"]]},
          },
          {
            id: "fec-il-sym", name: "Symbol multiplexing at 200G per lane",
            body:
              "Bit multiplexing takes individual bits from several input lanes in turn. After receive demultiplexing, a serial burst can therefore touch many different Reed-Solomon symbols. Symbol multiplexing preserves larger symbol-aligned units, so the same type of burst can be concentrated into fewer erroneous symbols.\n\nTask-force comparisons for 200G-per-lane links found burst-error penalties increasing with the bit-multiplexing ratio under the studied channel and receiver models. That motivated the symbol-multiplexing PMA in Clause 176. It is the relevant PMA definition and signaling generation, not simply a change in the total Ethernet rate, that selects this mapping.",
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
          "The Reed-Solomon decoder receives a reconstructed codeword and evaluates its parity relationships. If no more than 15 symbols are erroneous, it must locate and correct them. For larger error counts, correction is not guaranteed and failure detection becomes essential.\n\nDecode performance depends on the distribution of errors among symbols and codewords. Many isolated events can be corrected, while a concentrated burst can overwhelm a codeword at the same average bit error ratio (BER).\n\nAs channel quality deteriorates, the uncorrectable-codeword rate can rise sharply. This is often called the FEC cliff. Pre-FEC measurements and corrected-error distributions help estimate margin before post-FEC frame loss becomes visible.",
        params: {
          "400G": [["Pre-FEC BER limit", "< 2.4 x 10^-4"], ["Gives FLR", "< 1.7 x 10^-12, 64-octet frames, min IPG"], ["Complete PHY allowance", "6.2 x 10^-11"], ["Measured over", "8192 codewords (one AM period)"]],
          "800G": [["FLR", "3.4 x 10^-12"], ["hi_ser window", "8192 codewords per 400G flow, OR'd"]],
          "1.6T": [["hi_ser window", "8192 codewords", { draft: true }]],
        },
        sections: [
          {
            id: "fec-dec-budget", name: "The error budget, split up",
            body:
              "For the referenced 100G-per-lane end-to-end architecture, the total pre-FEC BER allowance is up to 2.8 × 10⁻⁴. The optical PMD link has an allocation of 2.4 × 10⁻⁴, with 1 × 10⁻⁵ allocated to each specified AUI contribution. Identify the applicable reference configuration and observation points before adding interface contributions.\n\nThese are design allocations for that architecture, not interchangeable pass/fail numbers for every PHY. An average BER alone also does not describe error burstiness, which affects FEC performance. The referenced 200G-per-lane optical arrangements have different requirements and may include inner FEC.",
            params: {"all":[["Referenced total pre-FEC allocation","2.8 x 10^-4 or lower"],["Optical PMD allocation","2.4 x 10^-4"],["Specified AUI contribution","1 x 10^-5"],["Scope","the referenced 100G-per-lane end-to-end architecture"]]},
            quiz: [{"q":"Can the optical PMD's BER allocation be used as the pass limit for an AUI?","opts":["Yes, all segments share one limit","No, use the allocation for that interface and reference configuration","Yes, if the MAC rate is unchanged","Only when no frames are lost"],"a":1,"why":"The reference architecture assigns different contributions to optical and electrical segments. The applicable specification defines the observation point and limit; a shared outer code does not make those limits interchangeable."}],
          },
          {
            id: "fec-dec-cliff", name: "Why the cliff matters",
            body:
              "A receiver can correct errors continuously while reporting no lost frames. That does not reveal how much additional degradation it could tolerate. As the error distribution moves beyond the decoder's capacity, frame loss can increase rapidly.\n\nUse pre-FEC BER, corrected-symbol and codeword counts, and the distribution of errors per codeword to assess margin. Signal-quality and lane-status measurements provide additional context. A finite observation with zero post-FEC errors establishes only that no errors were seen during that interval.",
            params: {"all":[["Post-FEC frame loss","can rise sharply as errors exceed correction capacity"],["Zero observed loss","does not establish spare margin"],["Useful measurements","pre-FEC BER, corrected-error distributions, signal and lane status"]]},
            quiz: [{"q":"A link reports zero frame loss during a measurement. What does that establish?","opts":["It has healthy margin","No losses were observed in that interval, but spare margin is not established","It is exactly at the BER target","FEC is disabled"],"a":1,"why":"FEC can repair errors while leaving no post-FEC loss. Use pre-FEC and corrected-error measurements, with signal and lane status, to assess how much degradation the link might tolerate."}],
          },
          {
            id: "fec-dec-monitor", name: "Counters and hi_ser",
            body:
              "Corrected-codeword counts show how often FEC repairs data. Uncorrected-codeword counts show detected failures. Symbol-error counts and histogram bins show how heavily codewords are loaded with errors, which can reveal a changing distribution even when frame loss remains low. The available counters and their definitions depend on the PHY.\n\nFor 400GBASE-R, the high-symbol-error-rate indicator, hi_ser, uses an 8192-codeword window. The referenced 800G design evaluates the corresponding window per 400G-equivalent flow and combines the indications. Read counter units, observation intervals and reset behavior before comparing measurements.",
            params: { all: [["Counters", "corrected CW, uncorrected CW, symbol errors"], ["Bins", "codewords by symbol-error count"], ["hi_ser window (400G)", "8192 codewords"], ["Convenient because", "that equals one AM period"], ["800G", "per flow, results OR'd"]] },
          },
        ],
      },

      {
        id: "fec-concat", name: "Concatenated FEC", alias: "inner and outer codes on applicable optical paths", dir: "both", written: true,
        clause: { "400G": "not applicable", "800G": "not applicable at 100G/lane", "1.6T": "Clause 177 (draft)" },
        summary: "The P802.3dj inner-plus-outer arrangement.",
        intro:
          "An optical link can include an electrical AUI from the host to a module, an optical segment, and an electrical AUI at the receiving end. FEC architectures differ in which parts of this path each code protects. The task-force material uses three useful categories.\n\nType 1, end-to-end, has one code spanning the path. Type 2, concatenated, keeps that outer code and adds an inner code around the optical segment. Type 3, terminated or segmented, decodes and re-encodes at segment boundaries, allowing each segment to use its own correction.\n\nThe referenced 100G-per-lane BASE-R optical architecture uses end-to-end Reed-Solomon FEC. The Clause 177 inner-code arrangement in P802.3dj adds protection for applicable 200G-per-lane optical PHYs. Check the specific PMD and operating mode; 200G electrical lanes alone do not imply an inner optical code.",
        params: {"1.6T":[["Referenced inner code","Hamming(128,120)",{"draft":true}],["Inner input","120 bits = 12 RS symbols",{"draft":true}],["Placement","applicable 200G-per-lane optical PHYs and modes",{"draft":true}],["Clause","177",{"draft":true}]],"800G":[["Referenced 100G-per-lane architecture","Type 1, end-to-end"],["200G-per-lane optical paths","check the PMD and inner-FEC mode",{"draft":true}]],"400G":[["Referenced 100G-per-lane architecture","end-to-end RS(544,514)"],["200G-per-lane optical paths","check the PMD and inner-FEC mode",{"draft":true}]]},
        sections: [
          {
            id: "fec-cc-inner", name: "The inner code",
            body:
              "The referenced inner code is extended Hamming(128,120): 120 input bits become a 128-bit codeword. It is formed from Hamming(127,120) with an additional parity bit. The short code adds protection around the optical segment while the outer Reed-Solomon code continues to protect the broader path.\n\nThe Clause 177 material describes soft-decision decoding. Instead of supplying only a hard decision among four PAM4 levels, the receive interface supplies finer-resolution information about the received symbol. The decoder uses that information to choose the most likely codeword; the resolution and implementation are not defined by a single universal bit width.\n\nInner-code performance affects the error distribution seen by the outer decoder. Interleaving is therefore part of the arrangement, rather than an optional detail that can be omitted from its analysis.",
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
              "The inner code's 120-bit input contains twelve ten-bit Reed-Solomon symbols. The referenced convolutional interleaver arranges for them to come from twelve different outer codewords.\n\nIf a single inner codeword leaves its entire input payload wrong, that event can damage one symbol in each of those twelve outer codewords, rather than twelve symbols in one. This reduces the concentration of that event at the outer decoder. It does not guarantee recovery: other inner failures or electrical-channel errors can consume the remaining capacity.\n\nFollow the mapping at each point. Keeping a serial burst within fewer RS symbols and spreading one inner-code failure across outer codewords address different error patterns in different parts of the path.",
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
              "Segmented FEC decodes data at an intermediate boundary and then encodes it for the next segment. Each decoder sees its own segment's errors, and each termination adds processing delay. If residual wrong data is re-encoded, the next decoder may receive a valid codeword carrying that wrong data. Detected failures therefore need defined error propagation across the boundary.\n\nConcatenated FEC keeps an outer code over the broader path while an inner code protects a segment within it. The outer decoder can correct residual inner-code errors that fit within its capacity.\n\nWhen reading a block diagram, locate every encoder and decoder and trace the span protected by each code. Two FEC blocks in a diagram do not by themselves establish whether the architecture is segmented or concatenated.",
            params: { all: [["End-to-end (Type 1)", "one FEC over AUIs and PMD"], ["Concatenated (Type 2)", "outer over everything, inner over the PMD link"], ["Terminated (Type 3)", "separate FECs, re-encoded at boundaries"], ["Terminated hazard", "uncorrected errors re-encoded as clean"]] },
            quiz: [{"q":"Why does an intermediate FEC termination need defined error propagation?","opts":["It always reduces reach","Residual wrong data can be re-encoded into a valid next-segment codeword","Alignment markers cannot cross it","It doubles the lane count"],"a":1,"why":"Re-encoding residual wrong data does not expose the earlier damage to the next decoder's parity checks. Detected failures must be signalled across the boundary according to the architecture's rules."}],
          },
        ],
      },

      {
        id: "fec-degrade", name: "FEC degrade signalling", alias: "monitoring and notification", dir: "both", written: true,
        clause: { "400G": "119.2.5.3; Clause 45", "800G": "172.2.5.3; Clause 45", "1.6T": "PCS-specific monitoring; check P802.3dj revision (draft)" },
        summary: "Detect a rising FEC error load without confusing it with link failure.",
        intro:
          "A link can deliver valid frames while its FEC decoder is correcting an increasing number of errors. Degrade monitoring watches that error load, rather than waiting for detected uncorrectable codewords. It can warn of a deteriorating channel, but it cannot predict when the next failure will occur.\n\nThe monitor counts RS symbol errors over a configured number of codewords. In the referenced 800G implementation, exceeding the activation threshold asserts the indication. A later complete window with a count below the deactivation threshold clears it. Separating the thresholds provides hysteresis: small fluctuations need not repeatedly raise and clear an alarm. The monitor only evaluates errors while the FEC receiver is aligned and its decoder is active.\n\nMonitoring and signalling are separate functions. The 400GBASE-R mechanism includes alignment-marker status bits for local and remote degrade indications. A local management alarm does not, by itself, prove that the peer receives such a notification; check the selected PCS and implementation. Clause 45 provides management access, not a universal signalling format for every PHY.\n\nA degrade indication is also distinct from hi_ser and from Local Fault or Remote Fault. Those have their own conditions and consequences. When investigating an alarm, record the interval, thresholds, symbol counts and uncorrectable counts together. Comparing only alarm states can hide different configurations.",
        params: { all: [["Measurement", "RS symbol-error count over a codeword window"], ["Configuration", "Enable, interval, activation and deactivation thresholds"], ["Notification", "Local status; peer signalling depends on the PCS"], ["Interpretation", "Error-load warning, not proof of frame loss or remaining margin"]] },
        quiz: [{ q: "FEC degrade is asserted, but frames still have valid FCS values. Is that contradictory?", opts: ["Yes; degrade means the MAC must already be losing every frame.", "No; FEC can still correct errors while the monitored error load exceeds a threshold.", "Yes; degrade is another name for Remote Fault."], a: 1, why: "The monitor observes FEC error load. Its threshold is not the same condition as an uncorrectable codeword or a link fault." }],
      },
    ],
  },

  /* ------------------------------------------------------------------ PMA */
  pma: {
    id: "pma", name: "PMA", alias: "Physical Medium Attachment", zone: "signal", written: true,
    clause: { "400G": "Clause 120", "800G": "Clause 173, or 176 at 200G/lane", "1.6T": "Clause 176 (draft)" },
    face: { "400G": "4 or 8 lanes", "800G": "8 or 4 lanes", "1.6T": "8 or 16 lanes" },
    summary: "Maps PCS lanes onto physical lanes and drives the serial signal.",
    intro:
      "The Physical Medium Attachment (PMA) maps the PCS lane structure onto a specified serial interface. On transmit it multiplexes logical streams as needed. On receive it recovers and demultiplexes them for the PCS. Serial signal processing, including timing recovery and the relevant PAM4 mapping, is also part of the PMA definitions.\n\nThe multiplexing unit matters to FEC. Earlier definitions use bit multiplexing; the referenced 200G-per-lane PMA in Clause 176 uses symbol multiplexing to control how burst errors map into Reed-Solomon symbols. The interface's lane count and generation determine which PMA mapping applies.\n\nThe following lessons separate three ideas: representing data with [[PAM4]] levels, handling channel impairments with equalisation and precoding, and mapping logical lanes to physical lanes. These are related functions, but they solve different problems.",
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
          "PAM4 represents two bits with one of four amplitude levels. NRZ represents one bit with one of two levels. For the same coded bit rate, PAM4 therefore needs half the symbol rate, or baud rate. A 106.25 Gb/s PAM4 lane runs at 53.125 GBd.\n\nWith equally spaced levels over the same peak-to-peak amplitude range, adjacent PAM4 levels are one-third as far apart as the two NRZ levels. The receiver has less separation between decision thresholds. The corresponding idealized noise-margin penalty is 20 log₁₀(3) ≈ 9.5 dB; it is not a complete comparison of every practical NRZ and PAM4 link.\n\nPAM4 reduces the bandwidth needed for a given bit rate, but places stronger demands on signal quality, equalisation and error correction. The actual baud rate also includes the overhead of the selected coding and FEC arrangement. A 200G-class electrical lane and a 200G-class optical lane with inner FEC need not run at the same baud rate.",
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
        id: "pma-gray", name: "Gray coding", alias: "adjacent-level errors change one bit", dir: "both", written: true,
        clause: { "400G": "Clause 120", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Mapping bit pairs to levels so neighbours differ by one bit.",
        intro:
          "Gray coding labels the four PAM4 levels so neighboring levels differ in one bit. One possible low-to-high labeling is 00, 01, 11, 10. This example illustrates the adjacency rule; use the defined mapping for the relevant PMA.\n\nWhen noise causes a nearest-neighbor level decision error, Gray coding produces one wrong bit. A binary labeling can produce two wrong bits for some adjacent-level errors. Gray coding therefore reduces the bit-error impact of those decisions.\n\nReed-Solomon correction is counted in ten-bit symbols, not PAM4 bit pairs. If both wrong bits would fall within one RS symbol, reducing them to one does not change the RS symbol-error count. The effect on FEC depends on the bit-to-symbol mapping and error distribution.",
        params: {"all":[["Mapping","adjacent levels differ in one bit"],["Nearest-neighbor decision error","one bit changes"],["Binary mapping comparison","some adjacent transitions change two bits"],["RS symbol count","depends on which ten-bit symbols those errors touch"]]},
        quiz: [{"q":"What does Gray coding guarantee for a nearest-neighbor PAM4 decision error?","opts":["A larger eye opening","Only one of the two mapped bits changes","No FEC symbol error","Perfect DC balance"],"a":1,"why":"Adjacent levels have labels differing in one bit. This reduces bit damage for those transitions, but does not necessarily halve Reed-Solomon symbol errors: one or two wrong bits within the same ten-bit symbol still count as one erroneous symbol."}],
      },

      {
        id: "pma-eq", name: "Equalisation and error bursts", alias: "CTLE, FFE and DFE error propagation", dir: "rx", written: true,
        clause: { "400G": "Clause 120", "800G": "Clause 173", "1.6T": "Clause 176 (draft)" },
        summary: "Reduce inter-symbol interference and understand DFE error propagation.",
        intro:
          "A channel spreads a transmitted symbol's energy over time, allowing it to interfere with neighboring symbols. Equalisation reduces this inter-symbol interference. CTLE shapes the analog frequency response, FFE applies a weighted feed-forward filter, and DFE subtracts estimated interference from previously decided symbols.\n\nDFE relies on those earlier decisions being correct. A wrong decision can produce an incorrect subtraction and increase the chance of another error. This feedback can turn one initial decision error into a longer error event.\n\nIn a simplified one-tap PAM4 DFE model with coefficient 1, the continuation probability can approach 3/4. That is a model result, not a universal burst probability. Reference-receiver tap constraints, such as those in IEEE 802.3cd, belong to a particular specification and should not be treated as limits on every implementation.\n\nWhen investigating bursts, examine receiver behavior as well as the physical channel. Error propagation can change the error distribution that FEC sees.",
        params: {"all":[["CTLE","analog frequency-response shaping"],["FFE","weighted feed-forward filtering"],["DFE","uses earlier decisions to subtract estimated interference"],["Error propagation","a wrong earlier decision can promote subsequent errors"],["Simplified one-tap model, coefficient 1","continuation probability can approach 3/4"],["Model burst of length L","continuation factor (3/4)^(L-1); not a universal link probability"],["Reference tap constraints","specific to the applicable receiver model, not all implementations"]]},
        quiz: [
          {
            q: "How can DFE turn one decision error into a longer event?",
            opts: ["It removes all noise", "Its subtraction uses earlier decisions, so a wrong decision can promote subsequent errors", "It changes the MAC rate", "It has no feedback"],
            a: 1,
            why: "An incorrect earlier decision gives an incorrect interference estimate. That can increase later error probability; it does not mean every initial error must become a burst.",
          },
          {
            q: "Which possible burst source should not be ruled out just because it is inside the receiver?",
            opts: ["The MAC addresses", "DFE decision-error propagation", "The nominal MAC frame size", "The EtherType"],
            a: 1,
            why: "DFE error propagation is a well-characterised burst source inside the receiver. Channel events and equaliser behaviour produce similar signatures, so the equaliser is not a safe thing to rule out.",
          },
        ],
      },

      {
        id: "pma-precode", name: "Precoding", alias: "1/(1+D) mod 4", dir: "both", written: true,
        clause: { "400G": "Clause 120.5.7.2", "800G": "Clause 173.5.7.2", "1.6T": "Clause 176.9.1.2 (draft)" },
        summary: "A defined PAM4 transformation that can limit DFE error propagation.",
        intro:
          "PAM4 precoding applies the defined 1/(1+D) mod 4 transformation at the transmitter, with the corresponding inverse at the receiver. It changes the relationship between consecutive symbols so some DFE error-propagation patterns produce fewer errors after the inverse operation.\n\nIts benefit depends on the receiver and the error pattern. Precoding can help with long propagated bursts, but can increase the number of errors from isolated events. It should therefore be understood together with the relevant receiver model and FEC mapping.\n\nThe referenced PMA specifications distinguish the capability to implement precoding from whether it is enabled on a link. The applicable clause and configuration or training procedure define that choice. The P802.3dj material includes negotiation of precoding for the relevant electrical interfaces; it is not an option inferred from the optical lane count.",
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
          "Lane multiplexing changes the number of serial streams carrying the data. For example, a PMA can map several lower-rate logical streams onto fewer higher-rate interface lanes. The receive PMA reverses the specified mapping.\n\nBit multiplexing selects individual bits from its input streams. Symbol multiplexing preserves the defined symbol-aligned units. This distinction affects whether a burst on a serial lane spreads across many Reed-Solomon symbols or remains within fewer of them.\n\nClause 173 defines the referenced 800G 32:8 restricted bit-level mapping. Clause 176 defines the symbol-multiplexing PMA used for the relevant 200G-per-lane interfaces, including the referenced 1.6T 16:8 and 16:16 variants. These PMA variants describe mappings; they are not a substitute for a confirmed PCS lane count.",
        params: {
          "400G": [["Scheme", "bit multiplexing"], ["100GbE example", "2:1, Clause 120.5.2"]],
          "800G": [["Scheme", "32:8 restricted bit-level"], ["Clause", "173"]],
          "1.6T": [["Scheme", "symbol multiplexing", { draft: true }], ["Clause", "176", { draft: true }], ["Variants", "16:8 and 16:16", { draft: true }], ["Reason", "bit-mux penalty grows with the ratio", { draft: true }]],
        },
      },

      {
        id: "pma-cdr", name: "Clock and data recovery", alias: "CDR", dir: "both", written: true,
        clause: { all: "PMA receive function; implementation-dependent CDR" },
        summary: "Recover sampling timing before treating a received waveform as data.",
        intro:
          "A serial receive lane does not carry a separate clock conductor alongside its data. The receiver must establish when to sample the waveform. Clock and data recovery, or CDR, estimates that timing from the received signal and keeps the sampling phase aligned as the transmitter's timing changes.\n\nIn a common feedback implementation, a phase detector observes transitions and adjusts a local clock. The timing loop must follow relevant frequency and phase variation without passing excessive jitter into the recovered clock. Loop bandwidth expresses part of that trade-off: slower timing variation can be tracked, while variation above the loop's tracking range is not followed in the same way. Exact behavior depends on the receiver architecture.\n\nFor PAM4, timing recovery and amplitude decisions solve different problems. CDR locates useful sampling times; the decision circuitry distinguishes four signal levels. Equalisation reduces channel distortion so both operations can work. A practical receiver may adapt these functions together rather than implement them as a strictly sequential pipeline.\n\nOne unit interval is one symbol period, not one bit period for PAM4. At 53.125 GBd it is about 18.82 ps; at 106.25 GBd it is about 9.41 ps. These are timing scales, not allowed-jitter limits.\n\nCDR lock only reports a timing condition defined by the implementation. It does not establish PCS alignment, successful FEC decoding or an acceptable error rate. When lock is present but the link is unhealthy, continue checking signal quality, lane mapping and PCS/FEC status.",
        params: { all: [["Recovered quantity", "Sampling frequency and phase"], ["PAM4 unit interval", "1 / symbol rate; two coded bits per symbol"], ["53.125 GBd example", "18.82 ps per symbol"], ["106.25 GBd example", "9.41 ps per symbol"], ["Lock status", "Implementation-specific; not an error-free-data guarantee"]] },
        quiz: [{ q: "The receiver reports CDR lock. What still needs checking?", opts: ["Nothing; lock guarantees correct Ethernet frames.", "Only the MAC address.", "PCS/FEC alignment and error behavior, as well as signal quality."], a: 2, why: "Recovered timing is necessary for serial reception, but it is not a verdict on lane alignment or data integrity." }],
      },
      {
        id: "pma-skew", name: "Skew and the skew budget", alias: "relative lane delay and its allowed variation", dir: "both", written: true,
        clause: { "400G": "Clause 116, 120", "800G": "Clause 116", "1.6T": "Clause 174 (draft)" },
        summary: "Six numbered points along the link, each with an allowance.",
        intro:
          "Skew is the difference in arrival time between lanes carrying corresponding parts of a stream. The receive PCS removes that difference with deskew buffering. To make implementations interoperable, the specification limits how much skew the complete path can introduce.\n\nThe referenced 400G model defines skew points SP1 through SP6 and gives a maximum cumulative skew at each point. A separate allowance covers skew variation, the change in relative delay over time and operating conditions. The table below belongs to that reference model, not to every 400G or higher-rate PHY.\n\nCumulative limits describe the total at a point. To understand a segment's contribution, compare the relevant limits and check the individual sublayer's requirements. Where the summary table and the applicable sublayer clause disagree, the sublayer clause governs.",
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
              "The example limits are cumulative. At SP1 the maximum is 29 ns; at SP3 it is 54 ns. These describe the allowed accumulated skew at those points, rather than a separate 29 ns and 54 ns contribution from two components.\n\nBetween the reference points around the medium, the limits increase from 54 ns to 134 ns, a difference of 80 ns. Different fibre path lengths and propagation delays can contribute to this spread. Use the individual clauses to check how the allowances apply to a particular implementation.\n\nThe PCS receive limit is 180 ns, beyond the 160 ns at SP6. The receiver therefore needs to accommodate skew introduced inside the receiving device as well as skew already present at its input.",
            params: { all: [["Values","cumulative limits in the referenced 400G model"], ["Between SP3 and SP4","134 - 54 = 80 ns"], ["Segment requirements","check the individual sublayer clauses"], ["PCS receive limit","180 ns, including receiving-device skew"]] },
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
              "Skew describes the relative lane delay at a given time. Skew variation describes how that delay changes, for example with temperature or supply conditions.\n\nThe receiver can measure and buffer out an initial offset, but it also needs to tolerate permitted changes after alignment. A buffer sized only for the observed initial skew may be insufficient if the delay later moves.\n\nCheck both the absolute skew allowance and the variation allowance for the selected interface. A small observed offset at link-up does not establish compliance across operating conditions.",
            params: { all: [["Skew", "relative lane delay at a given time"], ["Skew variation", "change in relative delay over time and conditions"], ["Initial measurement", "does not establish behavior across operating conditions"], ["Receiver requirement", "tolerate the specified skew and variation allowances"]] },
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
    summary: "Defines signaling and medium-specific requirements for the selected PHY.",
    intro:
      "The Physical Medium Dependent (PMD) sublayer defines how the signal is transmitted and received over a particular medium. Its requirements depend on the link type, including optical fibre, copper cable or backplane. The PCS can support several PMDs through compatible PMA mappings.\n\nFor the optical families discussed here, parallel optics use a separate path for each lane, while wavelength-division multiplexing (WDM) combines lanes at different wavelengths onto a shared fibre. For example, DR4 uses four fibre pairs; FR4 carries four wavelengths over one pair. Other optical arrangements exist, so read the specific PMD definition rather than extending this rule to every Ethernet name.\n\nThe PHY name identifies a standardized link type, but it is not a complete specification. Confirm reach, fibre type, lane mapping, FEC and the relevant optical or electrical requirements when selecting an interface.",
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
          "A PHY name identifies its nominal rate and a particular medium-dependent link type. In 1.6TBASE-DR8-2, 1.6T is the MAC rate and BASE indicates baseband operation. DR8 identifies the parallel single-mode family with eight optical lanes; the -2 variant has a two-kilometre reach. These are names from the referenced P802.3dj material.\n\nFor this parallel PMD, eight optical lanes use eight fibre pairs, or sixteen strands. That does not establish the electrical lane count between the host and module; the AUI name describes that interface separately.\n\nUseful families include DR for the parallel single-mode examples here, FR/LR/ER for single-mode families with different reaches, SR/VR for multimode, CR for copper cable assemblies, and KR for backplane links. The letters provide a starting point, while the complete name and specification establish the actual reach and arrangement.",
        params: { all: [["Rate prefix", "200G, 400G, 800G, 1.6T"], ["BASE", "baseband"], ["D", "parallel single-mode, one wavelength per fibre"], ["F / L / E", "single-mode at increasing reach"], ["S / V", "multimode, short and very short"], ["C", "copper cable assembly"], ["K", "backplane"], ["Trailing number", "lane count"], ["Trailing -2", "the 2 km variant"]] },
        sections: [
          {
            id: "pmd-naming-break", name: "Where the convention breaks",
            body:
              "A familiar family name does not always imply the same reach at every rate. The referenced 800GBASE-FR4-500 uses four WDM wavelengths over one fibre pair with a 500 m reach, even though FR4 is commonly associated with two kilometres. The -500 suffix distinguishes that variant.\n\nThe P802.3dj material also renamed the two-kilometre single-lane 200G example from FR1 to DR1-2. When comparing older presentations with later draft material, check both the revision and the complete PHY name. Use the specification's reach rather than relying only on the media letters.",
            params: { all: [["Old rule", "DR = 500 m, FR = 2 km"], ["Broken by", "800GBASE-FR4-500, a 500 m WDM PHY"], ["Also confusing", "the 2 km family used three patterns"], ["Ballot resolution", "200GBASE-FR1 renamed 200GBASE-DR1-2"], ["Practical advice", "check the spec, not the letters"]] },
            quiz: [
              {
                q: "What reach does 800GBASE-FR4-500 have?",
                opts: ["2 km, because FR means 2 km", "500 m, as the suffix says", "40 km", "100 m"],
                a: 1,
                why: "The complete name identifies the 500 m variant. A familiar family abbreviation alone is not enough to determine reach.",
              },
            ],
          },
          {
            id: "pmd-naming-fibre", name: "Counting strands",
            body:
              "For the parallel DR examples here, each optical lane uses one strand in each direction. DR4 therefore uses four pairs, or eight strands. DR8 uses eight pairs, or sixteen strands.\n\nFor the WDM FR4 and LR4 examples, four optical wavelengths share one fibre in each direction. Those links use two strands, not eight. The numeral counts optical lanes or wavelengths in that PMD, rather than directly specifying a universal strand count.\n\nWhen planning cabling, check the PMD arrangement, connector and polarity together. Moving from DR4 to DR8 changes the number of paths required; changing from DR4 to FR4 changes how those paths are carried.",
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
        summary: "A reference-receiver measurement of PAM4 optical transmitter penalty.",
        intro:
          "TDECQ, or transmitter and dispersion eye closure quaternary, evaluates a PAM4 optical transmitter against a specified reference-receiver model. It is expressed as a power penalty in dB relative to an ideal signal at the target symbol error ratio. A lower penalty indicates a better result under that test.\n\nThe measurement includes the prescribed waveform processing and reference equalisation. This matters because an equaliser can recover some impairments that make an unprocessed eye diagram look poor. TDECQ therefore gives more information than simply checking whether the waveform fits an eye mask.\n\nTDECQ is not a measured operational bit error ratio or a guarantee of complete link performance. Interpret it with the applicable PMD's optical modulation amplitude, dispersion, receiver and other compliance requirements.",
        params: { all: [["Full name", "transmitter and dispersion eye closure quaternary"], ["Type of metric", "optical power penalty, in dB"], ["Measured against", "target symbol error ratio"], ["Introduced in", "802.3bs; refined in later amendments"], ["Replaces", "eye mask and TDP"], ["Lower is", "better"], ["Not", "a bit error rate"]] },
        sections: [
          {
            id: "pmd-tdecq-how", name: "How it is measured",
            body:
              "The test captures a specified optical pattern and applies the prescribed reference filtering and equalisation. It then evaluates sample distributions at two positions separated by 0.1 unit intervals (UI), where one UI is a symbol period. Older descriptions give nominal positions of 0.45 and 0.55 UI; the allowed timing optimization is defined by the relevant PMD and revision.\n\nThe calculation determines the noise margin consistent with the target symbol error ratio and compares it with an ideal reference derived using the measured outer optical modulation amplitude. Instrument noise and the specified equaliser behavior are part of the method. The result is the penalty reported in dB.\n\nThis is a conceptual overview, not a lab procedure. Pattern, bandwidth, tap constraints, histogram placement and dispersion conditions must come from the applicable measurement clause.",
            params: {"all":[["Sample-position separation","0.1 UI"],["Older nominal positions","0.45 and 0.55 UI; allowed timing optimization is specification-dependent"],["Histograms","sample distributions across the PAM4 levels"],["Error metric","target symbol error ratio, not operational BER"],["Ideal reference","derived using measured outer OMA"],["Receiver model","specified filtering and equalisation"]]},
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
                why: "The tests evaluate the waveform differently. TDECQ includes specified reference processing and equalisation; meeting that metric does not waive other requirements in the applicable PMD specification.",
              },
            ],
          },
        ],
      },

      {
        id: "pmd-dr", name: "Parallel single-mode: DR", alias: "one wavelength per fibre", dir: "both", written: true,
        clause: { "400G": "Clause 124", "800G": "Clause 124", "1.6T": "Clause 180, 182 (draft)" },
        summary: "Parallel single-mode optical lanes, each with its own fibre pair.",
        intro:
          "The DR PMDs discussed here carry each optical lane over its own fibre pair, with one wavelength per fibre. They do not need a WDM multiplexer to combine lanes onto one strand. The tradeoff is more fibre paths and a suitable multi-fibre connection.\n\nDR4 uses eight strands and DR8 uses sixteen. Confirm connector and polarity requirements as well as strand count. A module's electrical AUI may have a different number of lanes from its optical DR interface.\n\nThe referenced 1.6T optical objectives cover DR8 at 500 m and DR8-2 at two kilometres. They do not include a 1.6T WDM PMD. This statement describes the source set used here, rather than predicting all future 1.6T optical standards.",
        params: {
          "400G": [["Type", "400GBASE-DR4"], ["Lanes", "4"], ["Strands", "8"], ["2 km variant", "400GBASE-DR4-2"]],
          "800G": [["Types", "800GBASE-DR8 (100G/lane), 800GBASE-DR4 (200G/lane)"], ["Strands", "16 for DR8, 8 for DR4"], ["2 km variants", "DR8-2, DR4-2"]],
          "1.6T": [["Types", "1.6TBASE-DR8, DR8-2", { draft: true }], ["Lanes", "8 at 200G each", { draft: true }], ["Strands", "16", { draft: true }]],
        },
      },

      {
        id: "pmd-fr", name: "Wavelength multiplexed: FR and LR", alias: "lanes as colours on one fibre pair", dir: "both", written: true,
        clause: { "400G": "Clause 122", "800G": "Clause 183 (draft)", "1.6T": "none defined" },
        summary: "Several optical wavelengths sharing one fibre pair.",
        intro:
          "Wavelength-division multiplexing (WDM) carries several optical lanes at different wavelengths over the same fibre. A multiplexer combines them at the transmitter and a demultiplexer separates them at the receiver. The FR4 and LR4 examples use one fibre pair for four wavelengths.\n\nThis reduces strand count compared with a four-lane parallel interface, but adds wavelength-specific optical requirements. Reach depends on the complete PMD definition: FR, LR and ER identify families, and suffixes can distinguish variants such as FR4-500.\n\nThe referenced P802.3dj 1.6T optical objectives are parallel DR8 and DR8-2. A WDM option shown for another rate should not be assumed to exist at 1.6T.",
        params: {
          "400G": [["802.3bs types", "400GBASE-FR8, LR8"], ["Strands", "2"], ["Lanes carried as", "wavelengths"]],
          "800G": [["dj types", "800GBASE-FR4-500, FR4, LR4", { draft: true }], ["Strands", "2", { draft: true }]],
          "1.6T": [["WDM PHYs", "none among the dj objectives", { draft: true }]],
        },
      },

      {
        id: "pmd-cr", name: "Copper and backplane: CR and KR", alias: "twinax and backplane", dir: "both", written: true,
        clause: { "400G": "Clauses 162 (CR4), 163 (KR4); 178/179 for 200G/lane (draft)", "800G": "Clauses 162 (CR8), 163 (KR8); 178/179 for 200G/lane (draft)", "1.6T": "Clauses 178 (KR8), 179 (CR8), P802.3dj (draft)" },
        summary: "Two electrical media, with different channel definitions and compliance tests.",
        intro:
          "CR connects endpoints through a copper cable assembly, commonly a direct-attach twinax cable. KR connects them through an electrical backplane channel, including its traces and connectors. Neither is twisted-pair BASE-T Ethernet, and neither converts the signal to light.\n\nThe suffix counts lanes in one direction. A 400GBASE-CR4 interface has four transmit lanes and four receive lanes. Its nominal rate is 100 Gb/s per lane; coding overhead makes the serial bit rate higher. The published 800GBASE-CR8 and KR8 designs use eight nominal 100G lanes. The referenced P802.3dj designs use nominal 200G lanes, so 800G needs four and 1.6T needs eight. These are physical interface counts, not PCS lane counts.\n\nA KR channel is not specified simply as a maximum board length. Its electrical behavior includes frequency-dependent insertion loss, reflections and crosstalk. Channel Operating Margin (COM) evaluates a channel with a specified transmitter/receiver model; it is not a direct reading of a running link's FEC margin. CR likewise has cable-assembly requirements beyond length.\n\nFor context, the adopted P802.3dj objectives target at least 1 m of twinax and a backplane die-to-die loss of at most 40 dB at 53.125 GHz. These are project objectives, not a complete compliance test or a promise for arbitrary cables and boards. Use the applicable revision's channel limits and reference planes.\n\nClause 73 selects advertised abilities where applicable; electrical training adapts the selected link. Passing either startup step does not replace channel qualification or error monitoring.",
        params: { all: [["CR medium", "Copper cable assembly"], ["KR medium", "Electrical backplane channel"], ["Published 100G/lane examples", "400G CR4/KR4; 800G CR8/KR8"], ["200G/lane draft examples", "400G CR2/KR2; 800G CR4/KR4; 1.6T CR8/KR8", { draft: true }], ["Qualification", "Selected PMD's channel and transmitter/receiver requirements"]] },
        quiz: [{ q: "Why is a short KR backplane not automatically compliant?", opts: ["Its loss, reflections and crosstalk still have to satisfy the specified electrical requirements.", "KR compliance depends only on its length.", "KR requires an optical power measurement."], a: 0, why: "Length influences the channel, but trace materials, connectors and coupling also determine its electrical response." }],
      },
      {
        id: "pmd-sr", name: "Multimode: SR and VR", alias: "short reach", dir: "both", written: true,
        clause: { "400G": "Clause 167 (SR4/VR4); Clause 138 (SR8)", "800G": "Clause 167, IEEE 802.3df-2024 (SR8/VR8)", "1.6T": "P802.3ds MMF objectives; not a P802.3dj MMF specification (draft)" },
        summary: "Match the complete PMD name and fibre class, not just the short-reach label.",
        intro:
          "The SR and VR interfaces covered here transmit over multimode fibre in the 850 nm wavelength region. Their optical lanes use separate fibres in each direction. VR trades a shorter specified reach for a different optical budget; it is not merely an SR module connected to a shorter cable.\n\nStart with the full PMD name. 400GBASE-SR8 uses eight nominal 50G optical lanes, whereas 400GBASE-SR4 uses four nominal 100G lanes. Both carry a 400G MAC stream. The Clause 167 SR4/VR4 generation uses 53.125 GBd PAM4 on each optical lane; the corresponding 800G SR8/VR8 generation uses eight nominal 100G lanes.\n\nFor this 100G-per-lane generation, the reach targets are 100 m for SR and 50 m for VR on OM4/OM5. The 802.3db baseline gives shorter OM3 reaches: 60 m for SR and 30 m for VR. Fibre type, channel loss and the remaining optical requirements still matter; a length within the reach value is not sufficient by itself. Do not reuse those distances for every interface containing SR in its name.\n\nThe referenced P802.3dj objectives do not define a 1.6T multimode PMD. A separate project, P802.3ds, addresses 200G per wavelength over MMF. Its adopted objectives include 1.6T over eight fibre pairs at reaches of at least 30 m and 50 m. Those are development objectives, not published SR8/VR8 compliance limits.",
        params: {
          "400G": [["Clause 167 examples", "400GBASE-SR4 and VR4: 4 nominal 100G optical lanes"], ["OM4/OM5 reference reach", "SR4: 100 m; VR4: 50 m"], ["Different generation", "400GBASE-SR8: 8 nominal 50G optical lanes"]],
          "800G": [["Clause 167 examples", "800GBASE-SR8 and VR8: 8 nominal 100G optical lanes"], ["OM4/OM5 reference reach", "SR8: 100 m; VR8: 50 m"]],
          "1.6T": [["Separate MMF project", "P802.3ds: 200 Gb/s per wavelength", { draft: true }], ["Adopted 1.6T objectives", "8 MMF pairs; at least 30 m and 50 m reach", { draft: true }], ["Do not infer", "Published reach or channel limits from the 100G/lane generation"]],
        },
        quiz: [{ q: "Do 400GBASE-SR4 and 400GBASE-SR8 use the same optical lane rate?", opts: ["Yes; SR always means the same lane rate.", "No; SR4 uses nominal 100G lanes and SR8 nominal 50G lanes.", "No; SR4 is single-mode and SR8 is multimode."], a: 1, why: "The MAC rate is shared, but these PMDs divide it across different numbers of optical lanes." }],
      },
    ],
  },

  /* --------------------------------------------------------------- medium */
  medium: {
    id: "medium", name: "Medium", alias: "fibre, copper, backplane", zone: "signal", written: true,
    clause: { "400G": "Clause 121-124", "800G": "Clause 124; 802.3df", "1.6T": "Clauses 180-183 (draft)" },
    face: { all: "SMF, MMF, twinax" },
    summary: "The fibre, cable or backplane channel that carries the signal.",
    intro:
      "The medium carries the transmitted signal between endpoints. It can be optical fibre, a copper cable assembly or a backplane channel. It is shown below the PMD because the medium and the PMD requirements must be compatible.\n\nCheck the selected link's fibre or cable type, reach, connector arrangement and channel budget. Optical loss and dispersion, or electrical loss and reflections, influence the received signal and the error distribution. Lane-to-lane delay also affects deskew requirements.\n\nThe lessons below explain how single-mode fibre, multimode fibre and twinax constrain a link. Start with the selected PMD, then check its medium and channel requirements. Example calculations teach the accounting; they do not replace the specification's limits.",
    params: { all: [["Single-mode", "DR, FR, LR, ER classes"], ["Multimode", "SR, VR classes"], ["Twinax copper", "CR"], ["Backplane", "KR"]] },
    subs: [
      {
        id: "medium-smf", name: "Single-mode fibre", alias: "SMF", dir: "both", written: true,
        clause: { all: "Optical channel requirements of the selected PMD" },
        summary: "Check loss and dispersion separately, at the specified wavelengths and reference planes.",
        intro:
          "Single-mode fibre supports one guided spatial mode at the operating wavelength. This avoids the intermodal delay spread of multimode fibre, but it does not make the channel free of loss or dispersion. The selected PMD specifies the fibre characteristics and optical channel over which its transmitter and receiver must work.\n\nChannel insertion loss includes fibre attenuation, mated connector losses and splices between the defined reference planes. Losses in decibels add. As an arithmetic example, assume 2 km of fibre at 0.4 dB/km, two mated connections at 0.3 dB each, and one 0.1 dB splice. The estimated loss is 0.8 + 0.6 + 0.1 = 1.5 dB. These are illustrative assumptions, not standard allowances. Compare a measured channel with the selected PMD's maximum loss, not with this example.\n\nChromatic dispersion is a separate constraint: different wavelengths propagate with different delays, distorting a modulated signal. Its effect depends on fibre length, wavelength and transmitter spectrum. A channel can satisfy a loss limit while failing other optical requirements. Nor should a transmitter's average power be subtracted from an OMA-based receiver limit to invent a channel budget; they are different measurements.\n\nParallel and wavelength-multiplexed PMDs also need different fibre arrangements. Confirm the PMD name, polarity and supported fibre specification before checking reach. The procurement specification for the fibre, the installed channel limits and the transmitter compliance-test channel serve different purposes; one table cannot substitute for all three.",
        params: { all: [["Estimated loss", "Fibre attenuation × length + connection and splice losses"], ["Example only", "2 × 0.4 + 2 × 0.3 + 0.1 = 1.5 dB"], ["Independent checks", "Channel loss, dispersion, length and fibre characteristics"], ["Pass/fail reference", "Selected PMD and its defined optical reference planes"]] },
        quiz: [{ q: "An SMF channel passes its insertion-loss limit. Is that a complete optical qualification?", opts: ["Yes; single-mode fibre has no dispersion.", "Yes; only received average power matters.", "No; dispersion and the other specified channel conditions also need checking."], a: 2, why: "Loss measures attenuation. It does not describe all of the waveform distortion allowed by the PMD." }],
      },
      {
        id: "medium-mmf", name: "Multimode fibre", alias: "MMF", dir: "both", written: true,
        clause: { all: "Selected MMF PMD; fibre modal-bandwidth requirements" },
        summary: "Enough received power does not ensure enough modal bandwidth.",
        intro:
          "Multimode fibre carries light in several spatial modes. Those modes can arrive at different times, spreading a transmitted pulse into neighboring symbol periods. Graded-index fibre reduces that delay spread, but does not eliminate it. This is why an MMF channel needs a bandwidth check as well as a loss check.\n\nModern short-reach links commonly use VCSELs, or vertical-cavity surface-emitting lasers. Their launch conditions excite a subset of the fibre's modes. Effective Modal Bandwidth (EMB) characterizes performance for this kind of laser launch; overfilled-launch bandwidth describes a different launch condition. Do not treat the two figures as interchangeable.\n\nAt 850 nm, the referenced OM3 minimum EMB is 2000 MHz·km; OM4 and OM5 use 4700 MHz·km. The unit is a bandwidth-length product, not the Ethernet data rate. Dividing it by length is not a complete reach calculation: the PMD also accounts for the transmitter, receiver, dispersion and channel loss.\n\nOM5 extends multimode performance specifications across a wider wavelength range for short-wavelength multiplexing. It does not automatically extend the reach of an 850 nm SR interface compared with OM4. Likewise, a patch cord labeled OM4 does not establish the fibre class of an older trunk it connects to.\n\nFor an installed link, identify the entire channel's fibre class, length, connections and polarity, then apply the selected PMD's limits. If received power looks acceptable but errors are high, modal dispersion remains one possible cause; power alone cannot rule it out.",
        params: { all: [["Principal additional impairment", "Differential mode delay and pulse spreading"], ["EMB at 850 nm", "OM3: 2000; OM4/OM5: 4700 MHz·km"], ["OM5 distinction", "Wider specified wavelength range, not automatic extra 850 nm reach"], ["Channel check", "Entire installed path, not just the patch cord"]] },
        quiz: [{ q: "Will replacing an OM4 patch cord with OM5 automatically increase an 850 nm SR link's specified reach?", opts: ["No; OM4 and OM5 share the referenced 850 nm EMB, and the PMD defines reach.", "Yes; a higher OM number always doubles reach.", "Yes; the patch cord determines the entire channel's fibre class."], a: 0, why: "OM5's wider wavelength specification does not by itself change an 850 nm PMD's reach requirements." }],
      },
      {
        id: "medium-twinax", name: "Twinax copper", alias: "direct attach", dir: "both", written: true,
        clause: { "400G": "Clause 162; Clause 179 for 200G/lane (draft)", "800G": "Clause 162; Clause 179 for 200G/lane (draft)", "1.6T": "Clause 179, P802.3dj (draft)" },
        summary: "Qualify the cable assembly's electrical response, not just its length.",
        intro:
          "A twinax lane uses two conductors as a differential pair, with shielding around the pair. A multi-lane direct-attach assembly carries multiple such pairs, including separate paths for the two transmission directions. The connectors and cable terminations are part of the assembly being qualified, not electrically invisible attachments.\n\nInsertion loss describes how much signal is attenuated through the channel and varies with frequency. Longer cable generally increases loss; conductor size, dielectric material and construction also matter. Return loss describes reflections caused by impedance discontinuities. Crosstalk describes coupling from other signal paths. Two cables of equal length can therefore present substantially different channels.\n\nThe relevant frequency scale rises with symbol rate. For 106.25 GBd PAM4, the Nyquist frequency is 53.125 GHz. That does not mean a single loss measurement at that frequency characterizes the cable: compliance uses frequency-dependent limits and other specified measurements.\n\nTraining can adjust transmitter equalisation, but it cannot remove arbitrary cable loss, reflections or coupling. Treat repeated retraining or a rising FEC error load as reasons to examine the assembled channel, not as proof that a different equaliser setting will solve the problem.\n\nA passive DAC and an active electrical cable are also different products. Active cables may contain redrivers or retimers and have host-interface and management requirements of their own. Do not assume that every product sold as direct attach is a passive CR assembly. Check the advertised interface, supported lane generation and vendor qualification alongside the applicable IEEE requirements.",
        params: { all: [["Passive assembly", "Differential pairs, shielding, terminations and connectors"], ["Electrical checks", "Insertion loss, return loss and crosstalk"], ["106.25 GBd frequency scale", "53.125 GHz Nyquist; not a single-point compliance test"], ["Product distinction", "Passive DAC versus active cable with signal-conditioning electronics"]] },
        quiz: [{ q: "Two twinax assemblies have the same length. Must they have the same channel quality?", opts: ["Yes; length is the only relevant property.", "No; construction, terminations and connectors also affect loss, reflections and crosstalk.", "Yes; training cancels every assembly difference."], a: 1, why: "Length is one input to channel behavior. Qualification evaluates the electrical response of the assembly." }],
      },
    ],
  },

  /* ------------------------------------------------- electrical + modules */
  aui: {
    id: "aui", name: "AUI", alias: "Attachment Unit Interface", zone: "signal", written: true, group: "iface",
    clause: { "400G": "Annex 120E, 120F", "800G": "802.3df and dj annexes", "1.6T": "Clause 176, Annex 178B, 176D (draft)" },
    face: { "400G": "400GAUI-8 / -2", "800G": "800GAUI-8 / -4", "1.6T": "1.6TAUI-16 / -8" },
    summary: "The electrical lanes between ASIC and module.",
    intro:
      "An Attachment Unit Interface (AUI) is an electrical interface between PHY components. It can connect chips or a host chip and a module. Its lane count describes the electrical interface, which may differ from the PMD's optical lane count.\n\nFor example, 1.6TAUI-16 carries the nominal 1.6 Tb/s rate over sixteen 100G-class electrical lanes, while 1.6TAUI-8 uses eight 200G-class lanes. Those class labels are shares of the MAC rate; coded serial rates are higher. A module can use a PMA mapping between its AUI and optical interface.\n\nC2C means chip to chip and C2M means chip to module. Their channel definitions and compliance points differ. The next lessons explain those boundaries, channel assessment with COM, and electrical link training.",
    params: {
      "400G": [["dj type", "400GAUI-2 (2 x 200G)", { draft: true }], ["Earlier", "400GAUI-8, 400GAUI-4"], ["Flavours", "C2C and C2M"], ["Error budget", "1 x 10^-5 per AUI at 100G/lane"]],
      "800G": [["802.3df", "800GAUI-8 (8 x 100G)"], ["802.3dj", "800GAUI-4 (4 x 200G)", { draft: true }], ["Flavours", "C2C and C2M"]],
      "1.6T": [["100G per lane", "1.6TAUI-16", { draft: true }], ["200G per lane", "1.6TAUI-8", { draft: true }], ["C2M annex", "176D", { draft: true }], ["Link training annex", "178B", { draft: true }], ["SerDes IA", "OIF CEI-224G", { draft: true }]],
    },
    subs: [
      {
        id: "aui-c2m", name: "Chip to chip, chip to module", alias: "C2C and C2M", dir: "both", written: true,
        clause: { "400G": "Annex 120E, 120F", "800G": "df annexes", "1.6T": "Annex 176D (draft)" },
        summary: "Two channels, two budgets, two sets of compliance points.",
        intro:
          "A chip-to-chip (C2C) interface connects two chips, often across a board. A chip-to-module (C2M) interface connects the host chip to a module through the host board and module connector. These are interface categories, not assumptions about whether the components come from one vendor.\n\nC2M specifications define host and module requirements at reference or compliance points around the connector. This gives each side a measurable target so compatible implementations can interoperate. Annex 176D contains the referenced P802.3dj C2M definition.\n\nWhen diagnosing a C2M channel, identify the measurement point and the portion of the channel under test. Host loss, connector behavior and module response should be compared with their corresponding requirements, rather than combined into an unspecified end-to-end number.",
        params: {"all":[["C2C","chip-to-chip electrical interface"],["C2M","host-to-module electrical interface through a connector"],["Compliance split","defined host and module reference points"],["Referenced dj C2M annex","176D"],["Diagnosis","compare each channel portion with its applicable requirements"]]},
        quiz: [{"q":"Why does a C2M specification define separate host and module compliance points?","opts":["C2M is necessarily faster","To give each side measurable requirements for the connector interface","C2C has no FEC","C2M carries light"],"a":1,"why":"Defined reference points let host and module implementations be assessed against compatible requirements. Their vendors need not be different, and interoperability testing can still be required."}],
      },

      {
        id: "aui-budget", name: "Channel Operating Margin", alias: "COM", dir: "both", written: true,
        clause: { "400G": "Annex 93A", "800G": "Annex 93A", "1.6T": "Annex 178A (draft)" },
        summary: "Assess an electrical channel using a specified transmitter and receiver model.",
        intro:
          "Channel Operating Margin (COM) is a calculated electrical-channel figure of merit in dB. It combines measured or modeled channel scattering parameters with a specified reference transmitter and receiver, including equalisation and noise assumptions.\n\nThe calculation estimates margin against the required error performance under that model. A channel must meet the threshold and other requirements of its applicable specification. Thresholds around two to three dB occur in the referenced examples, but are not a universal COM limit.\n\nCOM was introduced in IEEE 802.3bj and is defined through reference algorithms such as Annex 93A. Use the required algorithm version, settings and channel data when comparing results. A passing COM result is evidence under the reference model, not a measurement of every possible real receiver.",
        params: { all: [["What it is", "a figure of merit in dB"], ["Computed from", "channel S-parameters plus reference TX and RX behaviour"], ["Pass criterion", "COM above a threshold, typically 2 to 3 dB"], ["Introduced in", "802.3bj, 2014"], ["Specified in", "Annex 93A"], ["dj backplane use", "Annex 178A"], ["Statistical basis", "linear time-invariant assumptions"]] },
        sections: [
          {
            id: "aui-budget-why", name: "Why it replaced hard limits",
            body:
              "Independent loss and crosstalk limits assess impairments separately. A channel with low loss may tolerate more crosstalk under a particular receiver model, but that tradeoff is not captured by checking each limit alone.\n\nCOM combines the specified impairments, package effects, equalisation and noise into one calculation. This permits some channel tradeoffs to be evaluated against a common reference model. It does not eliminate all other compliance limits.\n\nReproducibility requires more than using the name COM. Two results are comparable only when the reference algorithm, configuration and channel inputs agree.",
            params: { all: [["Independent limits", "assess each impairment separately"], ["COM model", "combines specified channel, package, noise and equalisation effects"], ["Benefit", "evaluate some impairment tradeoffs under a common model"], ["Reproducibility", "match algorithm version, configuration and channel inputs"], ["Other limits", "still apply where specified"]] },
            quiz: [
              {
                q: "What was the main shortcoming of hard frequency-domain limits?",
                opts: ["They were always too lenient", "They could not express combined impairment tradeoffs under a receiver model",
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
        clause: { "400G": "Clause 72, 802.3ck", "800G": "802.3ck-era training", "1.6T": "Annex 178B (draft)" },
        summary: "The receiver tells the transmitter how to pre-distort.",
        intro:
          "Electrical link training lets the receiver request changes to the peer's transmitter equalisation. The transmitter adjusts defined coefficients and reports its response while the link exchanges training information. This helps adapt the signal to the particular channel.\n\nAutonegotiation and training have different roles. Where supported, autonegotiation selects compatible advertised capabilities and the operating mode. Training then adjusts the transmitter for that mode; it does not independently choose a new Ethernet rate.\n\nThe referenced P802.3dj electrical training procedure is in Annex 178B and includes options such as precoding for the applicable interfaces. Detailed message formats and state machines are outside this lesson. Confirm whether the selected CR, KR or AUI interface supports or requires training.",
        params: {
          "400G": [["Purpose", "tune transmitter equalisation to this channel"], ["Direction of control", "the receiver requests, the transmitter adjusts"], ["Not the same as", "autonegotiation"]],
          "800G": [["Purpose", "as above"]],
          "1.6T": [["Annex", "178B", { draft: true }], ["Applies to", "CR, KR, C2C and C2M", { draft: true }], ["Negotiable option", "precoding", { draft: true }]],
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
    summary: "Compare module retiming with linear transmit and receive paths.",
    intro:
      "A retimed optical module recovers timing and regenerates the signal within the module. A module DSP can also provide equalisation and other processing. Linear pluggable optics (LPO) avoid module retiming on the transmit and receive paths, placing more of the end-to-end signal-processing responsibility on the host and analog optical path.\n\nLinear receive optics (LRO) use a linear receive path while retaining processing on the transmit side. LPO, LRO and retimed describe implementations; they are separate from the Ethernet MAC rate, PMD name and mechanical form factor.\n\nRemoving retiming can reduce module power and processing delay. The result depends on the host, module, reach and operating conditions, so compare specific implementations rather than treating a quoted wattage or percentage saving as a standard requirement. Linear-interface agreements also have their own specifications; an ordinary retimed C2M compliance result should not automatically be applied to an LPO pairing.",
    params: {"all":[["Retimed","module recovers timing and regenerates the signal"],["LPO","linear transmit and receive paths without module retiming"],["LRO","linear receive path with transmit-side processing"],["Power and latency","compare specific implementations and total system requirements"],["Specification basis","linear-interface MSA agreements and applicable optical requirements"]]},
    subs: [
      {
        id: "retimer-lpo", name: "Evaluating a linear link", alias: "host, module and channel requirements", dir: "both", written: true,
        clause: { all: "industry practice" },
        summary: "Check the complete path when comparing power, latency and interoperability.",
        intro:
          "In a linear optical link, the host receiver must handle impairments accumulated through the electrical and optical path without a module receive retimer regenerating the data. The host capabilities, module behavior and channel therefore need to be assessed together.\n\nCompare the selected linear-interface specification and qualification results with the intended host, module, fibre reach and operating conditions. Do not assume a fixed reach reduction or a universal distance at which retiming becomes necessary. Receiver design and the relevant budgets determine what is supported.\n\nA useful comparison includes total system power, latency, pre-FEC error behavior and interoperability evidence. Module power alone can omit additional work performed by the host. LRO offers a different division of processing from fully linear LPO; neither is universally preferable for every 200G-per-lane link.",
        params: {"all":[["Possible benefits","lower module power and processing delay"],["Assessment scope","host, module, electrical channel and optical path"],["Interoperability","use compatible linear-interface specifications and qualification evidence"],["Reach","specific to the implementation and applicable budgets"],["Power comparison","include any additional host processing"]]},
        quiz: [{"q":"What should be checked before using a host and module for LPO?","opts":["Only the connector shape","Their compatible linear-interface requirements and complete-link qualification","Only the module power label","Whether FEC has been removed"],"a":1,"why":"Ordinary retimed-interface compliance is not a substitute for the requirements of a linear link. Linear-interface specifications exist, and qualification must cover the intended host, module, channel and operating conditions."}],
      },
    ],
  },
  form: {
    id: "form", name: "Form Factors", alias: "QSFP-DD, OSFP, OSFP-XD", zone: "signal", written: true, group: "iface",
    clause: { all: "MSA, not IEEE 802.3" },
    face: { "400G": "QSFP-DD, OSFP", "800G": "QSFP-DD, OSFP", "1.6T": "OSFP-XD, OSFP1600" },
    summary: "Mechanical and thermal envelopes, defined outside IEEE.",
    intro:
      "A form factor specifies the physical and electrical module interface: dimensions, connector pinout, lane capacity and related thermal requirements. Multi-source agreement (MSA) groups define pluggable families such as QSFP-DD and OSFP. IEEE 802.3 defines the Ethernet interfaces and PMDs; it does not define these module envelopes.\n\nManagement is specified separately through agreements such as OIF's Common Management Interface Specification (CMIS). A complete module selection therefore involves more than a PHY name: form factor, electrical interface, management support and cooling must also match the host.\n\nThe AUI lane count has to be supported by the host and module connection. The form factor's lane capacity does not by itself tell you the optical lane count, reach or Ethernet rate of a particular module.",
    params: { all: [
      ["Defined by", "MSA groups, plus OIF CMIS for management"],
      ["IEEE role", "liaison only; not in the standard"],
      ["OSFP", "8 electrical lanes", { industry: true }],
      ["OSFP-XD", "16 electrical lanes", { industry: true }],
      ["Constrains", "lane count, power, thermal"],
    ] },
    subs: [
      {
        id: "form-lanes", name: "Lanes and the 1.6T split", alias: "electrical lane capacity and module compatibility", dir: "both", written: true,
        clause: { all: "MSA" },
        summary: "Eight lanes, sixteen lanes, and a compatibility choice.",
        intro:
          "OSFP provides eight high-speed electrical lanes. OSFP-XD provides sixteen and has a different mechanical and electrical interface. The specifications include keying to prevent an incompatible module from being inserted into the wrong port.\n\nAt nominal 200G per electrical lane, eight lanes support a 1.6T interface. Sixteen nominal 100G lanes also support 1.6T, using a wider electrical interface such as OSFP-XD. The OSFP MSA describes sixteen 200G lanes as a path to 3.2T; that arithmetic is form-factor capacity, not proof of a particular Ethernet PMD.\n\nAn AUI name such as 1.6TAUI-8 or 1.6TAUI-16 identifies the electrical interface. It does not prescribe a cage by itself or establish the optical lane arrangement. Check the host's supported form factor, lane generation and thermal limits alongside the module specification.",
        params: {"all":[["OSFP electrical capacity","8 lanes",{"industry":true}],["OSFP-XD electrical capacity","16 lanes",{"industry":true}],["Eight nominal 200G lanes","1.6T electrical capacity",{"industry":true}],["Sixteen nominal 100G lanes","1.6T electrical capacity",{"industry":true}],["Sixteen nominal 200G lanes","3.2T capacity, not proof of a standardized Ethernet PMD",{"industry":true}],["AUI suffix","-8 or -16 counts electrical lanes, not optical lanes"],["Compatibility","check connector, keying, supported lane generation and cooling",{"industry":true}]]},
        quiz: [{"q":"Why do OSFP-XD cages include keying features?","opts":["To increase Ethernet speed","To prevent incompatible modules being inserted","To identify the vendor","To select the optical wavelength"],"a":1,"why":"OSFP and OSFP-XD have different module interfaces. Keying protects against incompatible insertion; it does not establish a module's optical capabilities."},{"q":"What does 1.6TAUI-16 identify?","opts":["Sixteen optical fibres","Sixteen electrical lanes carrying a nominal 1.6T aggregate rate","A coherent optical interface","A particular cage prescribed by IEEE"],"a":1,"why":"The suffix counts electrical lanes. Their nominal share is 100G each, with a higher coded serial rate. The name alone does not prescribe a form factor or optical lane count."}],
      },
      {
        id: "form-cpo", name: "Co-packaged optics", alias: "CPO", dir: "both", written: true,
        clause: { all: "OIF-Co-Packaging-3.2T-Module-01.0; architecture-specific" },
        summary: "Move the optical engines close to the ASIC without changing Ethernet framing.",
        intro:
          "In a conventional pluggable design, the switch ASIC sends electrical signals across the board to a front-panel optical module. Co-packaged optics places optical engines close to the ASIC, using a shared package-level assembly. The shorter electrical connection reduces the channel loss that the host interface must handle. It does not change the MAC frame format or, by itself, define a new Ethernet optical PMD.\n\nThe OIF 3.2T co-packaging agreement is a concrete example, not a universal CPO architecture. Its optical module supports eight 400GBASE-DR4 or FR4 interfaces. The 3.2T label describes their aggregate capacity, not one 3.2T Ethernet MAC port. Its ASIC-facing connection carries 32 electrical lanes at 106.25 Gb/s and uses the CEI-112G-XSR interface.\n\nCPO does not imply linear optics or the absence of a DSP. This OIF design includes a DSP and supports internal or external laser sources. With an external source, laser light is delivered to the optical engine; the external laser need not be physically integrated beside the hot ASIC. The engine still provides the optical transmission and reception functions.\n\nMoving optics inward changes practical boundaries. Fibre routing, cooling, assembly yield and repair procedures become package and system-design concerns. Serviceability depends on the implementation, so neither 'as easy to replace as a pluggable' nor 'never replaceable' is a safe generalization. Evaluate power and reliability for the complete design rather than infer them from the CPO label alone.",
        params: { all: [["Architectural change", "Short package-level electrical path to nearby optical engines", { industry: true }], ["OIF example aggregate", "8 × 400G = 3.2T; not a single MAC port", { industry: true }], ["OIF example host interface", "32 × 106.25 Gb/s; CEI-112G-XSR", { industry: true }], ["Not implied by CPO", "DSP-free operation, integrated lasers or one replacement model", { industry: true }]] },
        quiz: [{ q: "What does the OIF 3.2T CPO module's capacity label mean?", opts: ["One standardized 3.2T Ethernet MAC port.", "Eight 400G optical interfaces in that implementation.", "A guarantee that the module contains no DSP."], a: 1, why: "Aggregate engine capacity and individual Ethernet port rate are different quantities. The OIF example also includes a DSP." }],
      },
    ],
  },

  /* ------------------------------------------------ adjacent, cross-cutting */
  macsec: {
    id: "macsec", name: "MACsec", alias: "IEEE 802.1AE, above the MAC", zone: "framing", written: true, group: "aside",
    clause: { all: "IEEE 802.1AE (not 802.3)" },
    face: { all: "above the MAC" },
    summary: "Protects Ethernet traffic above the MAC using IEEE 802.1AE.",
    intro:
      "MACsec, defined by IEEE 802.1AE, protects Ethernet traffic above the MAC. It provides data integrity and origin authentication, with confidentiality when encryption is enabled. It is shown beside the stack because it is not a stage of PCS, FEC or PMA processing.\n\nProtection applies between MACsec peers. Those peers can be adjacent devices; the secured path is not necessarily an application-to-application path. A network device terminating one secured association and forwarding into another verifies and protects traffic at that boundary.\n\nMACsec adds protocol fields and an integrity check to transmitted frames. Those extra octets affect frame-size and goodput calculations. Key agreement is handled separately by MKA in IEEE 802.1X.",
    params: {"all":[["Standard","IEEE 802.1AE"],["Position","above the MAC"],["Scope","between MACsec peers"],["Added fields","MACsec EtherType, SecTAG and ICV"],["Key agreement","MKA in IEEE 802.1X"]]},
    subs: [
      {
        id: "macsec-frame", name: "What encryption adds to a frame", alias: "SecTAG and ICV", dir: "both", written: true,
        clause: { all: "IEEE 802.1AE" },
        summary: "Account for the security header and integrity-check overhead.",
        intro:
          "MACsec adds its EtherType, a security tag (SecTAG), and an integrity check value (ICV). The SecTAG carries information such as the association number and packet number, and can include a secure channel identifier (SCI). The packet number supports replay checking.\n\nThe SecTAG itself is six octets without SCI or fourteen with the eight-octet SCI. Including the two-octet MACsec EtherType, the added header is eight or sixteen octets. With the 16-octet ICV used by the common GCM-AES suites, those fields add 24 or 32 octets respectively. Other cipher-suite definitions can have different ICV requirements. Additional padding and encapsulation rules must be included when calculating the size of a specific frame.\n\nA fixed addition matters proportionally more for short frames. Adding 32 octets is 50 percent of a 64-octet frame, but about two percent of a 1518-octet frame. For a throughput calculation, also include preamble/SFD, average gap, and any other headers.",
        params: {"all":[["SecTAG excluding EtherType","6 octets without SCI, 14 with SCI"],["MACsec EtherType","2 octets"],["Added header including EtherType","8 or 16 octets"],["Common GCM-AES ICV","16 octets"],["These fields' total","24 or 32 octets; include any required padding separately"],["Size impact","fixed additions occupy a larger fraction of shorter frames"]]},
        quiz: [{"q":"Why do fixed MACsec fields occupy a larger fraction of short frames?","opts":["Short frames require more keys","The same number of added octets is divided by a smaller original frame size","The ICV grows as frames shrink","Encryption changes the lane count"],"a":1,"why":"For example, 32 added octets are 50 percent of 64 octets and about two percent of 1518. Actual occupancy also includes padding, other encapsulation, preamble/SFD and average gap."}],
      },
    ],
  },
  ptp: {
    id: "ptp", name: "Time Synchronization", alias: "Clause 90 TimeSync, cross-cutting", zone: "framing", written: true, group: "aside",
    clause: { "400G": "Clause 90", "800G": "Clause 90", "1.6T": "Clause 90, with 175.6 and 177.7 (draft)" },
    face: { all: "a reference point" },
    summary: "Relates a timestamp reference plane to the delay through the PHY.",
    intro:
      "Time synchronization needs a consistent definition of when a packet crosses a reference plane. Processing inside the PHY can delay that event relative to where an implementation records a timestamp. Clause 90 TimeSync provides mechanisms for relating timing to the relevant PHY reference.\n\nThe applicable sublayers report transmit and receive path data delays, including minimum and maximum values. This lets a system account for known processing delay and assess its uncertainty. The mechanism is shown alongside the data path rather than as another coding stage.\n\nThe referenced 1.6T PCS delay definition uses the start of a set of interleaved FEC codewords as a reporting reference. The inner FEC has its own delay reporting. That reference wording should not be used to infer a total 1.6T codeword count, which is not confirmed here.",
    params: {"400G":[["Mechanism","Clause 90 reference point"],["Needs","known, bounded PHY delay"]],"800G":[["Mechanism","Clause 90 reference point"]],"1.6T":[["PCS reporting","175.6, at the specified interleaved-codeword reference",{"draft":true}],["Values","maximum and minimum path data delay",{"draft":true}],["Inner FEC","separate delay reporting",{"draft":true}],["Mechanism","Clause 90.7"]]},
    subs: [
      {
        id: "ptp-ref", name: "Path delay and timestamp accuracy", alias: "path data delay", dir: "both", written: true,
        clause: { "400G": "Clause 90.7", "800G": "Clause 90.7", "1.6T": "Clause 90.7, with 175.6 and 177 (draft)" },
        summary: "Use delay bounds to relate timestamps to a defined reference plane.",
        intro:
          "A timestamp is useful only if its reference event is defined. The PHY's path data delay relates that event to processing elsewhere in the implementation. Clause 90.7 describes the reporting mechanism used by the applicable sublayers.\n\nA stable, accurately known delay can be compensated. Variation or uncertainty leaves a timing error unless the implementation can measure or track it. Minimum and maximum delay values describe an allowance; their spread contributes to the accuracy analysis alongside clock, calibration and timestamping errors.\n\nThe referenced P802.3dj PCS and inner-FEC definitions add their respective delay-reporting requirements. Use the specified transmit and receive reference points for each function rather than adding arbitrary processing-latency estimates to a timestamp.",
        params: {
          "400G": [["Reporting mechanism", "Clause 90.7 path data delay"], ["Reported as", "maximum and minimum"], ["Why both bounds", "the spread contributes to the timing uncertainty budget"]],
          "800G": [["Reporting mechanism", "Clause 90.7"]],
          "1.6T": [["PCS reporting", "175.6, at the start of the interleaved FEC codewords", { draft: true }], ["Units", "nanoseconds, optionally sub-nanoseconds", { draft: true }], ["Inner FEC", "own delay figures and TimeSync registers, added in ballot", { draft: true }]],
        },
        quiz: [{"q":"With other timing errors unchanged, which PHY delay is harder to compensate accurately?","opts":["A stable delay measured accurately","A delay whose variation is not measured or tracked","Any delay above 100 ns","Both always have the same effect"],"a":1,"why":"A stable known delay can be compensated. Untracked variation leaves uncertainty; reported delay bounds contribute to the accuracy budget alongside clock, calibration and timestamping errors."}],
      },
    ],
  },
  autoneg: {
    id: "autoneg", name: "Autoneg and Link Training", alias: "electrical capability exchange and training", zone: "signal", written: true, group: "aside",
    clause: { "400G": "Clause 73", "800G": "Clause 73", "1.6T": "Clause 73; Annex 178B (draft)" },
    face: { all: "copper and backplane" },
    summary: "Select electrical-link capabilities and tune supported interfaces.",
    intro:
      "Autonegotiation exchanges advertised capabilities so link partners can select a compatible operating mode. Clause 73 applies to the relevant backplane and copper cable interfaces. The optical PMDs covered here do not use that procedure to negotiate their optical Ethernet rate; the host and modules need compatible configuration.\n\nElectrical link training is a separate process. It adjusts transmitter equalisation for a selected mode and can exchange defined options such as precoding. The referenced P802.3dj procedure is in Annex 178B and also covers relevant electrical interfaces associated with modules.\n\nAn optical module can therefore have training or configuration on its electrical host interface without the optical PMD performing Clause 73 autonegotiation. Read Clause 73 autonegotiation for the capability exchange, then Link training for adaptation, readiness and the checks needed after startup.",
    params: {"400G":[["Clause 73 scope here","relevant copper and backplane interfaces"],["Optical PMDs here","do not perform Clause 73 optical-rate negotiation"],["Electrical link training","a separate procedure for supported interfaces"]],"800G":[["Clause 73 scope here","relevant copper and backplane interfaces"]],"1.6T":[["Referenced training procedure","Annex 178B",{"draft":true}],["Interfaces","applicable CR, KR, C2C and C2M definitions",{"draft":true}],["Options","check defined precoding capability and enable exchange",{"draft":true}]]},
    subs: [
      {
        id: "an-cl73", name: "Clause 73 autonegotiation", alias: "copper and backplane", dir: "both", written: true,
        clause: { all: "Clause 73; P802.3dj extended abilities (draft)" },
        summary: "Exchange advertised abilities, then resolve a common electrical operating mode.",
        intro:
          "Clause 73 autonegotiation applies to the supported backplane and copper cable PHYs. It is a startup exchange between link partners, not an Ethernet frame exchange. On a multi-lane MDI, it uses lane 0. The optical PMDs covered in this map do not use it to choose their optical rate.\n\nEach end sends a Base Page containing advertised technology abilities, PAUSE capability, applicable FEC capability fields and handshake information. The information page has 48 bits and is carried using differential Manchester encoding. A device may advertise a subset of its abilities, but must not advertise an operating mode it cannot support.\n\nNext Pages carry information beyond the Base Page. The partners acknowledge the exchanges, then the priority-resolution function selects the highest-priority common advertised technology from the specified hierarchy. This is not a sequence of trying every line rate until traffic passes. No common advertised technology means no common mode can be selected.\n\nFEC capability fields have technology-specific meanings. They do not make the mandatory FEC of every high-rate PHY optional. The P802.3dj extension uses Message code 2 Next Pages for additional technology and FEC abilities; implementations must agree on those extended abilities, not just the older Base Page.\n\nWhen startup fails, compare local advertisements with received partner abilities and the resolved mode. Distinguish a missing exchange from a completed exchange followed by training failure. Neither outcome is explained by checking only the configured port speed.",
        params: { all: [["Scope", "Supported electrical backplane and copper cable PHYs"], ["Multi-lane exchange path", "MDI lane 0"], ["Information page", "48 bits; Base Page and, when needed, Next Pages"], ["Resolution", "Highest-priority common advertised technology"], ["P802.3dj extension", "Message code 2 extended technology/FEC abilities", { draft: true }]] },
        quiz: [{ q: "A device supports a PHY mode but does not advertise it. Can normal priority resolution select that mode from the capability exchange?", opts: ["Yes; supported hardware always overrides advertisements.", "Yes; the partner tries every possible mode.", "No; selection depends on common advertised abilities."], a: 2, why: "Local hardware abilities and the advertised subset are different. Priority resolution operates on the exchanged advertisements." }],
      },
      {
        id: "an-training", name: "Link training", alias: "from selected mode to a usable channel", dir: "both", written: true,
        clause: { "400G": "Selected electrical interface's training procedure", "800G": "Selected electrical interface's training procedure", "1.6T": "Annex 178B, P802.3dj (draft)" },
        summary: "Follow the training handshake without mistaking completion for healthy link margin.",
        intro:
          "Once an electrical operating mode has been selected, its training procedure helps the receivers adapt to the channel. Where Clause 73 applies, capability resolution precedes this step. A configured electrical AUI can also train without performing Clause 73. The AUI training lesson explains the channel-adaptation role; this page follows startup and its status indications.\n\nDuring training, the ends exchange training patterns and control information rather than ordinary Ethernet traffic. Each receiver evaluates its incoming signal and requests adjustments to the far-end transmitter's equalisation coefficients. The transmitter reports the result, including defined coefficient limits. The receiver may also adapt its own equaliser; the standard exchange does not prescribe every detail of that internal algorithm.\n\nCoefficient status and receiver readiness are different indications. A coefficient reaching its allowed limit is not, on its own, a verdict that training succeeded or failed. Readiness says that the receiver has completed the relevant training work and is prepared for the transition to data. The selected procedure controls that transition; do not infer one universal timer or frame format across lane generations.\n\nMulti-lane interfaces must satisfy the applicable lane and interface readiness rules. Systems with several trained electrical segments, such as an AUI and a copper PMD, also coordinate status between segments. One segment reporting ready does not prove that the complete Ethernet path is up.\n\nAfter transition, check PCS/FEC alignment and error counters. Repeated training failures suggest an adaptation or configuration problem; successful training followed by high errors suggests a different investigation. Both require channel measurements and status evidence before assigning a cause. Training success is not a measurement of remaining FEC margin.",
        params: { all: [["Control direction", "Receiver requests changes to the peer transmitter"], ["Coefficient status", "Result of a requested adjustment; distinct from readiness"], ["Completion scope", "Applicable lane, interface and segment coordination"], ["Next checks", "PCS/FEC alignment, corrected errors and detected uncorrectables"], ["Draft procedure", "Annex 178B details depend on P802.3dj revision", { draft: true }]] },
        quiz: [{ q: "Training completes, but FEC errors are high. What does that show?", opts: ["Startup adaptation completed, but acceptable operating error behavior still needs investigation.", "Training completion guarantees that the FEC counters are wrong.", "The link must switch to a different MAC frame format."], a: 0, why: "The training handshake establishes readiness for data. It does not guarantee an error-free channel or quantify remaining margin." }],
      },
    ],
  },
};

export const CORE = ["mac", "rs", "pcs", "fec", "pma", "pmd", "medium"];
export const IFACE = ["aui", "retimer", "form"];
export const ASIDE = ["macsec", "ptp", "autoneg"];
