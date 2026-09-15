# Ethernet Onboarding — content research brief

> **Status.** Two content passes applied. All §7 corrections are in the build.
> Pass 1 wrote PCS and RS-FEC from §1–§5. Pass 2 researched and wrote MAC, RS
> and PMA (§10). Pass 3 researched and wrote PMD, Medium and MACsec (§11).
> Pass 4 researched and wrote the skew budget, AUI, COM and link training (§12).
> Pass 5 researched and wrote flow control, fault signalling, form factors,
> linear optics and time sync (§13). Nine sub-pages remain outlines.

Purpose: establish a verified fact base before writing page content, and record
exactly what is *not* verified so it never gets asserted.

Confidence levels used below:
- **FIRM** — confirmed in standard/draft text or two independent sources that agree.
- **LIKELY** — strong single source or consistent inference; usable only with hedging.
- **UNVERIFIED** — do not write. Listed in §6.

---

## 1. 400G / 200G — Clause 119 (published, IEEE Std 802.3)

Status: **FIRM** throughout this section. 200GBASE-R and 400GBASE-R share Clause 119.

### Transmit chain, in order
64B/66B encode → 256B/257B transcode → scramble → alignment marker insertion →
pre-FEC distribution → RS-FEC encode → interleave → distribute to PCS lanes.

- Transcode happens **before** scrambling for 200G/400G, which simplifies the
  transcoder. The 100G-era (802.3bj) design scrambled first. This ordering
  difference is real and is a common source of confusion when comparing block
  diagrams across generations.
- Scrambler polynomial: x⁵⁸ + x³⁹ + 1. It **includes bit 257** of each transcoded
  block, because excluding it would reduce randomness.

### FEC and distribution — exact arithmetic
- The PCS distributes a group of **40 × 257-bit blocks** on a **10-bit round-robin**
  basis into **two 5140-bit messages** (mA, mB).
- 5140 bits = 20 × 257, and 514 symbols × 10 bits = 5140. The arithmetic closes.
- Each message is encoded by **RS(544,514)** over GF(2¹⁰), t = 15, m = 10.
- The two codewords (cA, cB) are **interleaved on a 10-bit basis**, then distributed
  **one 10-bit symbol at a time, lowest to highest PCS lane**.
- PCS lanes: **16 for 400GBASE-R, 8 for 200GBASE-R**.

### Alignment markers
- AM group for 400GBASE-R = 16 alignment markers + a **133-bit pad** + a **3-bit
  status field** = the equivalent of **eight 257-bit blocks**.
- AM field is **120 bits per lane**, with common (CM) and unique (UP/UM) elements.
- The trailing pad is a free-running **PRBS9**, x⁹ + x⁵ + 1, seed any non-zero value.
- The **AM group is not scrambled** and does not follow the normal encoding rules.
- Room for AMs is created by **deleting idles** (or not inserting them), so AM
  insertion does not raise the line rate.
- AM group is aligned to the start of two FEC messages.
- **Insertion period: every 163,840 × 257-bit blocks for 400GbE** (= 8192 codewords);
  81,920 for 200GbE. See §6 note 3 — one draft excerpt conflicts, but the
  163,840 figure is arithmetically consistent (8192 CW × 20 blocks/CW).
- AMs are processed **before FEC correction**, because deskew and reorder must
  precede decode. AM lock therefore tolerates mismatches in some marker bits.
- Sixteen independent alignment-marker lock processes, one per lane.

### Error handling and error rates
- Decoder corrects any combination of up to **t = 15 symbol errors** and **must
  indicate** an uncorrected codeword.
- Probability the decoder fails to flag a codeword with t+1 errors is **not expected
  to exceed 10⁻¹⁶** (also expected to hold for t+2, t+3, …). This is the concrete,
  citable form of the MTTFPA argument — use this rather than hand-waving.
- If **either** interleaved codeword is uncorrectable, **all 66-bit blocks of both**
  are set to error blocks (EBLOCK_R), which may be done by setting the sync header
  to **11**. With the stateless 64B/66B decoder, the **following four 66-bit blocks**
  must also be marked, because of scrambler error propagation.
- Clause 120 requirement: pre-FEC **BER < 2.4 × 10⁻⁴**, yielding **FLR < 1.7 × 10⁻¹²**
  for 64-octet frames at minimum IPG; a complete Physical Layer may degrade to
  **6.2 × 10⁻¹¹** due to electrical-interface errors.
- Frame loss ratio reference values by interleaving depth:
  **9.2 × 10⁻¹³** non-interleaved (50G/100G PCS), **1.7 × 10⁻¹²** 2-way (200G/400G),
  **3.4 × 10⁻¹²** for the 800G PCS.
- 100G-per-lane BER budget: total to the end-to-end FEC **≤ 2.8 × 10⁻⁴**, allocated as
  **2.4 × 10⁻⁴** for the PMD link and **1 × 10⁻⁵** per AUI.
- `hi_ser` for 400GbE is computed over **8192 codewords** (equal to one AM period, so
  no extra counter is needed).

Sources: P802.3bs draft excerpts and Clause 119 text quoted in
ieee802.org/3/bs/public and /3/ck/public presentations; Ethernet Alliance
"Deep Dive into the 802.3bs 200GBASE-R and 400GBASE-R PCS/PMA"; anslow_3cd_01_0716;
shrikhande_3df_01_220329 (reproduces Figure 119–8).

---

## 2. 800G — IEEE 802.3df (published), Clause 172 / 173

Status: **FIRM** except where noted.

- **Clause 172** is the 800GBASE-R PCS (and only 800GBASE-R).
- The PCS runs **two flows**. Flow 0 is first in time and carries the **even**
  encoded 4×66b blocks; flow 1 carries the **odd** ones.
- **32 alignment markers**, twice as many as 400GBASE-R, each with 15 elements.
  Published AM encoding tables exist per flow.
- **Four FEC codewords** (two per 400G-equivalent flow). Consistent with the
  3.4 × 10⁻¹² FLR figure, which is 2 × the 2-way-interleaved 400G value.
- **Clause 173** includes a **32:8 restricted bit-level multiplexing** function.
- `hi_ser` was based on 8192 codewords **per 400G flow**, with the two flows' results
  OR'd together.
- Annex 172A carries example codewords, reusing the Annex 119A payload and seeds.
- 800GBASE-R at 100G per lane uses **end-to-end ("Type-1") FEC** — one FEC spanning
  both AUIs and the PMD link.

**PCS lane count = 32** is **LIKELY**, inferred from the 32 alignment markers plus the
32:8 multiplexing function. Not yet confirmed from clause text directly.

Sources: ieee802.org/3/publication/df Clause 172 AM tables; dawe_3df_02_230523;
dawe_3df_04_230926; 802.3df D1.1 comment responses; 802.3dj D2.3 comments.

---

## 3. IEEE P802.3dj — clause map

Status: **FIRM**. This corrects two things the build currently gets wrong.

The amendment adds **Clause 174 through Clause 187** and **Annex 174A through 186A**.

| Clause | Content |
|---|---|
| 174 (+ Annex 174A) | error requirements / BER-to-FLR relationships |
| **175** | **1.6TBASE-R PCS** |
| **176** | **xBASE-R SM-PMA** (symbol-multiplexing PMA); 176A electrical link training; 176B partitioning; 176D C2M |
| **177** | **xBASE-R Inner FEC** (the general one) |
| 178 (+178A) | xBASE-KR backplane; 178A COM |
| 179 | xBASE-CR cable assembly (+179A–D) |
| 180 | DR PMDs |
| 181 | FR-500 PMD |
| 182 | DR-2 PMDs (200GBASE-FR1/DR1-2, 400GBASE-DR2-2, 800GBASE-DR4-2, 1.6TBASE-DR8-2) |
| 183 | FR4 / LR4 PMDs |
| **184** | **800GBASE-LR1 Inner FEC** — LR1-specific, *not* the general inner FEC |
| 186 | 800GBASE-ER1 PCS/PMA |

- Clause 176 SM-PMA was adopted (March 2023 plenary) for **200GBASE-R, 400GBASE-R,
  800GBASE-R and 1.6TBASE-R using 200G/lane AUIs or PMDs**.
- 1.6TBASE-R PMA variants include **16:8** (176.8.1) and **16:16** (176.8.4).
- Precoding is referenced for CR, KR, C2C and C2M; `1/(1+D) mod 4` precoding appears
  in task-force text for mitigating burst errors. **LIKELY**, needs clause confirmation.

Sources: brown_3dj_01_2405 (Chief Editor's report, lists clause editors and titles);
standards.ieee.org/ieee/802.3dj/11115; 802.3dj D1.0–D2.3 comment files;
loewenthal_3dj_01_2405.

---

## 4. Inner FEC and concatenated FEC (802.3dj)

- Three FEC architectures were named and compared in the task force:
  **Type 1 end-to-end**, **Type 2 concatenated**, **Type 3 terminated (segmented)**.
  200G/400G/800G at 100G per lane all use Type 1. **FIRM**
- The adopted inner code is **Hamming(128,120)** — Hamming(127,120) with one extended
  parity bit added. Adopted for **200 Gb/s per lane PAM4 IM-DD optics**. **FIRM**
- The 120-bit inner payload is **12 RS symbols**, and a **convolutional interleaver**
  guarantees those 12 symbols come from **12 different RS-FEC codewords** (12-way RS
  interleaved). Input to the interleaver is the Clause 176 SM-PMA output. **FIRM**
- **Soft-decision decoding** is supported: `rx_symbol` may take an
  implementation-dependent set of values beyond four to feed the soft-decision inner
  decoder (177.5.4). **FIRM**
- Inner-code miscorrection is explicitly undesirable for concatenated performance —
  a good, sourced hook for the MTTFPA discussion. **FIRM**
- A proposal claimed the inner code plus interleaving could relax the optical BER
  target from **2.4 × 10⁻⁴ to ~4.8 × 10⁻³**. Present as a *proposal figure*, not as a
  specification value. **LIKELY**
- Inner-FEC **bypass** (Mode_FECi / Mode_FECo, for latency-sensitive or short-reach
  links) was proposed and straw-polled. Whether it survived into the final draft is
  **UNVERIFIED**.

Sources: Signal Integrity Journal / DesignCon 2024 "200+ Gbps Ethernet FEC Analysis"
(Liu); dudek_3dj_01_2407; dudek_3dj_optx_01_230629; patra_3dj_01b_2303;
802.3dj D1.3 comment responses.

---

## 5. PHY and AUI names — 802.3dj objectives

Status: **FIRM** (from task-force objective tables, repeated consistently 2024–2025).

| Rate | AUI | Backplane | Cu cable | SMF 500 m | SMF 2 km | Longer |
|---|---|---|---|---|---|---|
| 200G | 200GAUI-1 | 200GBASE-KR1 | 200GBASE-CR1 | 200GBASE-DR1 | 200GBASE-DR1-2 (renamed from FR1) | — |
| 400G | 400GAUI-2 | 400GBASE-KR2 | 400GBASE-CR2 | 400GBASE-DR2 | 400GBASE-DR2-2 | — |
| 800G | 800GAUI-4 | 800GBASE-KR4 | 800GBASE-CR4 | 800GBASE-DR4, 800GBASE-FR4-500 | 800GBASE-DR4-2, 800GBASE-FR4 | LR4, LR1, ER1-20, ER1 |
| 1.6T | 1.6TAUI-8 (200G/lane), 1.6TAUI-16 (100G/lane) | 1.6TBASE-KR8 | 1.6TBASE-CR8 | 1.6TBASE-DR8 | 1.6TBASE-DR8-2 | — |

Notes:
- All the above 200G/400G/800G entries are the **200G-per-lane** dj variants. The
  100G-per-lane 800G PHYs (800GBASE-DR8, DR8-2, and 800GAUI-8) come from **802.3df**.
- **1.6T has only DR8 and DR8-2 optical PMDs** in dj, both single-wavelength over
  8 fibre pairs. There is **no 1.6TBASE-FR8 or SR8**. The build currently claims
  these — see §7.
- "FR" no longer implies 2 km: 800GBASE-FR4-500 is a 500 m, 4-WDM-lane PHY. This
  naming inconsistency was formally raised and is worth teaching explicitly.

Sources: dambrosia_3dj_02a_2405; 2403_3dj_open_report; dambrosia_nea_01a_241007;
welch_3dj_01_230206; KeyMotions_3dj_240314.

---

## 6. UNVERIFIED — do not write these

1. **1.6TBASE-R PCS lane count.** Evidence points to 16 (a Clause 175 synchronization
   state diagram refers to identifying 16 unique PCS lanes, and 176.8 defines 16:8 and
   16:16 PMAs), but this is inference. 800G having 32 and 1.6T having 16 breaks the
   obvious pattern, so it needs direct confirmation.
2. **Number of interleaved FEC codewords at 1.6T.** Clause 175.6 reports delay at
   "the start of the set of four interleaved FEC codewords", and messages/codewords
   are labelled Ma–Md / Ca–Cd. But 1.6T also runs **two flows**, so "four" may be
   per flow (eight total) rather than four total. Throughput reasoning argues for
   eight. Unresolved — do not state a number.
3. **400G AM insertion period.** Using 163,840 × 257-bit blocks. A P802.3bs draft
   excerpt says 81,920 for 400GBASE-R; the Ethernet Alliance article and a
   reproduction of Figure 119–8 both say 163,840 for 400G and 81,920 for 200G, and
   163,840 = 8192 CW × 20 blocks, which closes. Treat as LIKELY-FIRM but verify
   against published Clause 119 before printing.
4. **1.6T alignment marker structure and period.** Not researched.
5. **1.6T distribution granularity.** The build currently claims 1.6T distributes
   "one 257-bit block" versus 66 bits at 400G. I have **not** confirmed this. What is
   confirmed is **symbol multiplexing in the Clause 176 PMA**, which is a different
   mechanism. This claim must be removed or corrected.
6. **802.3dj approval status.** As of Feb 2026 it was in its **4th 802.3 Working Group
   recirculation ballot**; projected RevCom submittal was Mar 2026 and the PAR expires
   31 Dec 2026. I could **not** confirm whether it has been approved or published as of
   Sept 2026. Do not describe it as either ratified or unratified without checking.
7. **Post-FEC target at the MAC for dj.** The 1e-13 BER figure is widely cited in
   task-force material but I have not tied it to a specific objective or clause line.
8. **800G PCS lane count (32).** Strong inference, not clause text.

---

## 7. Corrections required in the current build

These are wrong in `EthernetStack.jsx` today and must be fixed before any content pass.

| Location | Currently says | Should say |
|---|---|---|
| `pcs.face` / `params` 800G | "8 FEC lanes" | 32 PCS lanes (LIKELY); two flows; four codewords |
| `pcs.face` / `params` 1.6T | "16 FEC lanes" | remove — unverified (§6.1) |
| `pcs.clause` 1.6T | "Clause 172, draft" | **Clause 175** |
| `fec.clause` 1.6T | "Clause 177, 184" | 177 = general Inner FEC; **184 is 800GBASE-LR1-specific**; 1.6T RS-FEC lives in 175 |
| `pma.clause` 800G | "Clause 176" | Clause 173 for 100G/lane (df); Clause 176 SM-PMA for 200G/lane (dj) |
| `pmd.params` 1.6T | "DR8, FR8, SR8" | **DR8 and DR8-2 only**; plus KR8 / CR8 |
| `aui.params` 800G | "800GAUI-8 / -4" | 800GAUI-8 is df (100G/lane); 800GAUI-4 is dj (200G/lane) — distinguish |
| `fec-decode` params 400G | "pre-FEC BER around 1e-4" | **< 2.4 × 10⁻⁴**, with 2.8 × 10⁻⁴ total budget |
| `fec` params post-FEC | "≤ 1e-12" | express as **FLR < 1.7 × 10⁻¹²** for 400G; 3.4 × 10⁻¹² for 800G |
| `fec-cw-mttfpa` | qualitative only | add the **≤ 10⁻¹⁶** decoder mis-detection figure |
| `pcs-decode` | "inserts an error control block" | **EBLOCK_R**, sync header set to 11, **both** interleaved codewords marked, plus four following blocks with the stateless decoder |
| `pcs-dist-gran` | 1.6T distributes 257-bit blocks | remove — unverified (§6.5) |
| `pcs-am` params | "period: fixed, defined in Clause 119" | **163,840 × 257-bit blocks** (400G), 81,920 (200G), with §6.3 caveat |

Also worth adding, now that it is sourced: AM group size (eight 257-bit blocks),
the PRBS9 pad, the fact that the AM group is unscrambled, and that AM room comes from
deleted idles.

---

## 8. Not yet researched — next round

Listed so the gaps are explicit rather than silently filled from memory.

- **MAC / RS**: frame format detail, IPG, deficit idle count, PAUSE/PFC, xxMII
  structure, rate adaptation, local/remote fault.
- **PMA internals**: CDR, CTLE/DFE/FFE, gray coding, precoding specifics, skew
  generation and the published skew budgets.
- **PMD optical**: power budgets, TDECQ / TECQ / SECQ definitions and values,
  Clause numbers for the existing 400G PMDs (121–124 assumed, unconfirmed).
- **Multimode**: 400GBASE-SR8 / SR4.2, 800GBASE-VR8 / SR8 (802.3db).
- **Copper**: 802.3ck CR4 / CR8, insertion loss limits, reach.
- **MACsec**: 802.1AE SecTAG and ICV sizes, throughput impact.
- **Time sync**: Clause 90 reference point and path data delay reporting
  (Clause 90.7 is referenced from 175.6 — a good entry point).
- **Autoneg / training**: Clause 73 scope, 802.3ck link training, dj Annex 176A.
- **Form factors**: QSFP-DD, OSFP, OSFP-XD, CMIS — MSA sources, not IEEE.
- **LPO / LRO / CPO**: no standards basis; industry sources only, must be labelled.

---

## 9. Sourcing rules for the content pass

1. Anything from a **task-force presentation** is a proposal until confirmed in draft
   or published text. Label accordingly.
2. Anything from **802.3dj** carries the draft badge, with the D-revision noted where
   known.
3. Where a number is inferred rather than read, say so on the page — the confidence
   badge mechanism already exists and should be used for LIKELY items, not only for
   draft ones.
4. Prefer arithmetic that closes (5140 = 20 × 257 = 514 × 10) over recalled figures.
   Self-consistency caught the AM-period discrepancy.
5. Vendor glossaries and encyclopaedia-style pages are not sources for numbers.


---

## 10. Pass 2 — newly verified material (MAC, RS, PMA)

### MAC and RS
- Minimum inter-packet gap is an **average** of 12 octets (96 bit times). **FIRM**
- On the xxMII, **Terminate may occur in any lane; Start must occur in the first
  lane**. Frames are arbitrary octet lengths, so idles in the gap absorb the
  mismatch. **FIRM**
- The **deficit idle count** is incremented when idles are deleted, decremented when
  inserted, and bounded **0 to 3** in the 10 Gb/s RS (Clause 46.3.1.4). Up to three
  idles may be deleted at once, shrinking an individual gap to **9 octets**, with the
  average preserved. Reset only at initialisation; any equivalent method giving the
  same result is permitted. **FIRM for the 10 Gb/s RS**; higher-rate RS clauses use
  the same technique, but the exact bounds at 400G were not confirmed — the page
  says so rather than asserting them.
- Clock compensation is a **separate** idle insert/delete mechanism with its own
  counter, operating in larger units to stay compatible with the block structure
  below. Do not conflate with alignment. **FIRM**
- The PCS encodes **eight xxMII octets** per 66-bit block. **FIRM**
- Frame arithmetic (derived, not cited): a 64-octet frame occupies 84 octets of wire
  time including 8 octets of preamble/SFD and 12 of gap; payload is 46 of 84. A
  1500-octet payload occupies 1538 octets. Stated as arithmetic, which it is.

### PMA
- PAM4 detection penalty relative to NRZ is about **9.5 dB** — widely cited, and
  consistent with four levels sharing the amplitude range of two. **FIRM**
- **Gray coding**: adjacent levels differ in one bit, so a neighbour-level symbol
  error causes at most one bit error. **FIRM**
- **DFE error propagation**: for a one-tap DFE with coefficient 1, a wrong decision
  gives roughly a **3/4** probability the next symbol also errors, so k consecutive
  errors go as **(3/4)^k**. Bursts show an alternating pattern and terminate when the
  equalised signal goes out of range. **FIRM**
- **802.3cd DFE tap limits**: first tap 0.7, taps 2–12 limited to 0.2. **FIRM**
- **Precoding** is `1/(1+D) mod 4`, defined in 802.3cd 120.5.7.2, **mandatory to
  implement in the transmitter but optional to use**, configurable per link depending
  on receiver error-propagation behaviour. In dj it appears at 176.9.1.2 and is
  negotiable during link training for CR, KR, C2C and C2M. **FIRM**
- **Bit multiplexing** 2:1 for 100GbE is Clause 120.5.2; 32:8 restricted bit-level for
  800G is Clause 173. The bit-mux burst penalty grows with the ratio, which is what
  motivated symbol multiplexing at 200G per lane. **FIRM**

### Still not written after pass 2
`mac-flow` (PAUSE/PFC), `rs-fault` (LF/RF), `pma-cdr`, `pma-skew`, and all of PMD,
Medium, AUI internals, retimer/LPO, form factors, MACsec and time-sync detail.
These remain outlines and say so on the page.


---

## 11. Pass 3 — newly verified material (PMD, MACsec)

### PMD clause map
- **Clause 121** — 200GBASE-DR4. **FIRM** (two sources; Table 121-11 is cited elsewhere
  as the 200GBASE-DR4 optical return loss table).
- **Clause 122** — 200GBASE-FR4/LR4/ER4 and 400GBASE-FR8/LR8/ER8. **LIKELY**, single
  secondary source. A 2015 draft-era presentation refers to Table 123-7 for
  400GBASE-FR8/LR8, but clause numbers moved before publication, so the
  post-publication listing is preferred. Not stated as firm on the page.
- **Clause 123** — 400GBASE-SR16. **FIRM** (two sources).
- **Clause 124** — 400GBASE-DR4, extended by 802.3df to also cover 400GBASE-DR4-2,
  800GBASE-DR8 and 800GBASE-DR8-2. **FIRM** (802.3df table of contents).

### Amendment scope
- **802.3bs-2017** keywords list the 400G optical PMDs as 400GBASE-DR4, FR8, LR8 and
  SR16. FR4 and LR4 came from a later amendment, which was **not verified**, so the
  page does not attribute them. **FIRM for the bs list.**
- **802.3df-2024**, published 15 March 2024, adds Clause 169–173 plus Annex 172A and
  173A, and its keyword list confirms 800GBASE-CR8, KR8, DR8, DR8-2, SR8, VR8,
  800GAUI-8 and 400GBASE-DR4-2. **FIRM**

### TDECQ
- Transmitter and dispersion eye closure quaternary: an **optical power penalty in dB**
  — the extra power this transmitter needs versus an ideal one to hit the target
  **symbol** error ratio. Not a BER. **FIRM**
- Developed in 802.3bs, refined in later amendments; replaces the eye-mask and TDP
  tests, which could not account for a receiver's equaliser. **FIRM**
- Measured from **two vertical histograms centred at 0.45 and 0.55 unit intervals**,
  each spanning all four PAM4 levels; captured noise is compared with an ideal
  receiver and the dB difference is the penalty. **FIRM**
- The reference transmitter is **virtual**, constructed mathematically from the
  measured OMA of the device under test, rather than a physical golden transmitter.
  **FIRM**
- The reference receiver includes an equaliser, so penalties decompose into
  equalisable and non-equalisable parts; low-pass filtering lands mostly in the
  former, noise/compression/eye-skew in the latter. **FIRM**

### Naming
- **800GBASE-FR4-500** is a 500 m WDM PHY, breaking the old FR = 2 km convention.
  Raised in ballot; the resolution also renamed **200GBASE-FR1 to 200GBASE-DR1-2**.
  **FIRM**
- Parallel PMDs use two strands per lane; WDM PMDs use two strands total regardless
  of lane count. **FIRM** (conceptual, and consistent across sources)

### MACsec
- **SecTAG is 8 to 16 octets** — 16 when the secure channel identifier is encoded,
  8 when omitted (SCI encoding is optional). **ICV is 8 to 16 octets** depending on
  cipher suite, 16 for the common GCM-AES suites. Typical total addition per frame is
  **32 octets**. **FIRM** (802.1AE plus multiple vendor references agreeing)
- MACsec is IEEE 802.1AE, a different working group from 802.3, and is per-hop rather
  than end-to-end.

### Still outlines after pass 3
`mac-flow` (PAUSE/PFC), `rs-fault` (LF/RF), `pma-cdr`, `pma-skew`, `pmd-cr`,
`pmd-sr`, all three Medium pages, AUI internals, retimer/LPO, form factors, and the
time-sync reference point. Six top-level blocks remain marked outline.

### Explicitly still unverified
Everything in §6 stands. Added in this pass:
- Clause 122's exact PHY membership (see above).
- Which amendment added 400GBASE-FR4 and LR4.
- Skew and skew-variation budget values — referenced on several pages as
  "specified", deliberately never quoted.


---

## 12. Pass 4 — newly verified material (skew, AUI, COM)

### The skew budget — finally located
Skew points SP1–SP6 are defined in **Clause 116** (Figure 116-5 for 200GBASE-R and
400GBASE-R), with tables giving maximum skew and, separately, maximum skew variation.
Cumulative maximum skew for 200G/400GBASE-R:

| Point | Max skew | ≈ UI |
|---|---|---|
| SP1 | 29 ns | 770 |
| SP2 | 43 ns | 1142 |
| SP3 | 54 ns | 1434 |
| SP4 | 134 ns | 3559 |
| SP5 | 145 ns | 3852 |
| SP6 | 160 ns | 4250 |
| At PCS receive | 180 ns | 4780 |

- **1 UI = 37.64706 ps** at a PCS lane, confirmed from P802.3bs draft text. This is
  the 26.5625 Gb/s PCS lane rate, consistent with 425/16 for 400GBASE-R — the
  arithmetic closes, which is why these values are trusted. A second table in the
  draft uses 18.82353 ps, the 53.125 Gb/s figure. **FIRM on the UI value.**
- The ns values come from a vendor guide **reproducing** the 802.3bs table, not from
  clause text directly. Two independent checks support them: the UI column matches the
  ns column at 37.64706 ps/UI, and an independent account of the 802.3ba budget gives
  the same SP1 (29 ns) and the same 160 ns total. Treat as **LIKELY-FIRM**; verify
  against published Clause 116 before designing to them.
- Values are **cumulative**, not per-stage. The medium's own allowance is SP4 − SP3 =
  80 ns, the largest single allocation. **FIRM** (structural, from the definition)
- If the summary table and the sublayer clause disagree, **the sublayer clause
  governs** — stated in the draft text. **FIRM**
- Skew in parallel fibre depends on bending; a task-force proposal cited up to roughly
  **45 ps/m** for heavily bent parallel fibre. Presented as a proposal bound, not a
  specification value. **Proposal only.**
- P802.3dj D1.4 comment response: **SP2 and SP5 apply only where a PMD service
  interface is physically instantiated**, and no dj PHY defines one, so those rows are
  not populated in Table 174-5. **FIRM**
- Context from 802.3df: the original 802.3ba deskew buffer totals were 18.5 kilobits
  for 100GBASE-R and 7.5 kilobits for 40GBASE-R, and it was argued in df that the
  legacy limits were exaggerated. 800G limits had to be fixed in df because they could
  not be changed in dj. **FIRM as task-force history**; the resulting 800G numbers were
  not confirmed and are not stated.

### Channel Operating Margin
- A figure of merit in **dB**, computed from channel S-parameters plus the specified
  behaviour of a reference transmitter and receiver, including TX equaliser and RX
  equalisation/sensitivity. **FIRM**
- Introduced in **802.3bj (2014)**, specified in **Annex 93A**; current normative text
  is Annex 93A of IEEE 802.3-2022. Used for dj backplane channels via Annex 178A.
  **FIRM**
- Pass criterion is COM above a threshold, **typically 2–3 dB**, exact value per
  specification. **LIKELY** — the range is from secondary sources; the page says
  "typically" and defers to the relevant spec.
- COM replaced independent frequency-domain hard limits (the Annex 69B lineage), whose
  defect was that impairments could not trade against one another, causing
  overdesign — a low-loss channel could not spend its margin on crosstalk tolerance.
  COM also adds IC loss, package reflections, IC jitter and a lumped noise term, and
  fixes the previously undefined reference equalisation. **FIRM**
- Statistical algorithm on linear time-invariant assumptions; IEEE publishes reference
  MATLAB code, and practitioner implementations are known to have diverged from the
  standard text in places. **FIRM**

### AUI and link training
- Each AUI carries **1 × 10⁻⁵** of the error budget at 100G per lane. **FIRM** (from §1)
- C2C versus C2M: C2M crosses a vendor boundary at a connector, so the budget is split
  with compliance points either side. dj C2M is **Annex 176D**. **FIRM**
- Electrical link training is **Annex 176A** in dj, applies to CR, KR, C2C and C2M, and
  can negotiate precoding. **FIRM**
- Training state machines and frame formats: **not researched**, and the page says so.

### Still outlines after pass 4
`mac-flow` (PAUSE/PFC), `rs-fault` (LF/RF), `pma-cdr`, `pmd-cr`, `pmd-sr`, the three
Medium pages, retimer/LPO, form factors, and the time-sync reference point.

### Unverified list unchanged
Everything in §6 still stands, most importantly the 1.6T PCS lane count and codeword
count, and the 802.3dj approval status.


---

## 13. Pass 5 — newly verified material (flow control, faults, modules)

### PAUSE and PFC
- PAUSE rests on the **MAC control frame** of Clause 31, with opcodes in **Annex 31A**
  and the PAUSE frame format in **Annex 31B**; introduced by 802.3x in 1997. **FIRM**
- 64-octet control frame, EtherType **0x8808**, 16-bit opcode, **16-bit pause duration**,
  padding to 64 octets, FCS. **FIRM**
- One **quantum = 512 bit times at the current link speed**. Duration zero means
  resume. **FIRM**
- Derived arithmetic (stated as arithmetic, not cited): max field 65,535 quanta is
  ~33.6 Mbit, giving a longest pause of about **84 µs at 400G, 42 µs at 800G, 21 µs at
  1.6T**. The mechanism's maximum hold time shrinks as rates rise.
- PAUSE stops **all** traffic, which is its defining limitation. **FIRM**
- **PFC (IEEE 802.1Qbb)** reuses the same 64-octet frame, adds an 8-bit **class enable
  vector** and a 2-octet duration per class, covering the eight 802.1p priorities.
  **FIRM**
- The PAUSE threshold must be set ahead of buffer-full, allowing for PAUSE transmission
  time, propagation delay, PHY delay at both ends, far-end response time, and a
  max-length frame already in flight. **FIRM**

### Local and remote fault
- For 40G and above, fault signalling is **Clause 81.3.4**, following the Clause 46
  definition. **FIRM**
- Semantics: the receive path emits **local fault** ordered sets to the RS; the RS then
  stops MAC data and continuously transmits **remote fault**; the far-end RS on seeing
  remote fault stops frames and sends only idles. Link status goes to 0. **FIRM**
  (consistent across IEEE reflector discussion and vendor implementation docs)
- Clause 81 link fault signalling supports **bidirectional operation only** — no
  unidirectional mode, unlike the Clause 46 + Clause 66 lineage. **FIRM** (stated in
  81.3.4 per reflector citation)
- LF/RF resolves a fault only to "between the two RSs". A far-end sublayer fault
  presents locally as **local** fault while the far end reports nothing — a known
  limitation debated during the 10G work. Localisation requires per-sublayer **MDIO**
  status (Clause 45). **FIRM as a documented limitation.**

### Form factors and linear optics — all INDUSTRY, not IEEE
These now carry an **industry** badge in the UI to distinguish them from clause-derived
facts.
- **OSFP: 8 electrical lanes. OSFP-XD: 16.** XD reaches 1.6T with 16 × 100G and has
  headroom for 3.2T with 16 × 200G. XD is **not** mechanically compatible with OSFP,
  and XD cages are **keyed** to prevent OSFP insertion. **FIRM from the OSFP MSA.**
- LPO/LRO remove the module DSP. Reported power reduction roughly **40–50%**, with
  typical figures of **8–12 W versus 18–22 W** retimed, and a retimed 800G module
  around **17 W**. **Vendor figures** — labelled as such, not specification values.
- LPO's real cost is that performance depends on the host-module **pairing**, turning
  interoperability into a qualification exercise. Industry guidance is to stay retimed
  for longer reach, multi-vendor fleets and dispersion-managed links; at 200G per lane
  LRO may prove more deployable than full LPO. **Industry opinion, labelled.**

### Time synchronisation
- Each sublayer reports transmit and receive **path data delay** with maximum and
  minimum values; the mechanism is described in **Clause 90.7**. The spread between the
  bounds, not the absolute delay, limits achievable accuracy. **FIRM**
- 1.6T: Clause 175.6 requires the PCS to report delay as measured at the start of the
  set of interleaved FEC codewords, in ns and optionally sub-ns. The Inner FEC required
  its own delay figures and TimeSync MDIO registers, added during ballot. **FIRM**

### Still outlines (nine sub-pages, no top-level blocks)
`fec-degrade`, `pma-cdr`, `pmd-cr`, `pmd-sr`, `medium-smf`, `medium-mmf`,
`medium-twinax`, `form-cpo`, `an-cl73`. Link training is written under AUI and its
autoneg entry cross-references it.

### Unverified list unchanged
Everything in §6 stands. The two that most need draft text remain the **1.6T PCS lane
count** and its **codeword count**, plus the **802.3dj approval status**.
