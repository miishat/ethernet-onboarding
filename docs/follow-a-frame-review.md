# "Follow a frame" — review & recommendations

Status: **all three high-value recommendations implemented** (RX direction with FEC
correction, mini-stack, closing step). Medium- and lower-value items below are still
open. This doc doubles as the record of the review and the running backlog.

## What it is today

A guided walkthrough of one frame through the stack, driven by the global **TX / RX**,
**rate**, and **per-lane** controls. Steps come from `STAGES` / `RX_STAGES` in
`src/data/stepper.ts`, art from `src/components/StageArt.tsx`, layout from
`src/components/Stepper.tsx` with the rail in `src/components/StepperMiniStack.tsx`.

**Transmit — descending the stack (9 steps):**

| # | Step | Shape | Note (gist) |
|---|------|-------|-------------|
| 1 | A frame leaves the MAC | octets | addresses, type, payload, CRC-32; rate-independent |
| 2 | Coded into 66-bit blocks | block66 | +2-bit sync header; 3.125% overhead |
| 3 | Four blocks become one | block257 | 264→257; overhead falls to 0.39% |
| 4 | Scrambled | scrambled | x⁵⁸+x³⁹+1; DC balance / transitions |
| 5 | Alignment markers inserted | marker | one per lane; common + unique parts |
| 6 | Parity appended | codeword | RS(544,514), corrects 15 symbols |
| 7 | Striped across lanes | lanes | interleave + deal one symbol per lane |
| 8 | Mapped onto physical lanes | phys | logical lanes folded onto physical lanes |
| 9 | Sent as PAM4 symbols | pam4 | 2 bits/symbol, four levels |

**Receive — climbing back up (9 steps):** PAM4 arrive → physical lanes recovered →
deskew & reorder → **errors corrected** → markers removed → descrambled → one block
becomes four → blocks decoded → frame delivered / FCS checked.

Each step is rate- and generation-parameterised: switching rate or the 100G/200G
per-lane toggle updates lane counts, baud and the FEC note; PCS lane count stays fixed
per rate.

## What works

- **Ordering is accurate** both ways, including the 400G+ subtlety that transcode
  happens *before* scramble (and, in reverse, descramble before de-transcode).
- **Rate + generation awareness is genuine** — 800G shows 32 PCS lanes, 1.6T shows the
  inner-FEC note and symbol-multiplexed striping; the per-lane toggle changes physical
  lanes and baud.
- Notes explain the *why*, not just the *what*.

## Implemented (was: the crucial gap)

The stepper used to be transmit-only, so *why we append parity* was never paid off.
Resolved:

- **#1 RX direction — DONE.** The stepper mirrors the global TX/RX toggle and runs the
  pipeline in reverse. The **"Errors corrected"** step uses a dedicated `correct`
  StageArt shape: a received codeword with damaged symbols and the live 15-symbol
  budget meter repairing them, closing on "codeword recovered". Rate-aware
  (RS(544,514); inner-Hamming-then-RS note at 1.6T). Commit `427669a`.
- **#2 mini-stack — DONE.** `StepperMiniStack` renders the sublayer column beside the
  card and lights the current block as you step, ordered by direction.
- **#3 closing step — DONE.** RX ends on "Frame delivered to the MAC / FCS checked,
  corrupted frames dropped"; the TX final step and the intro point to RX for the
  correction payoff.

## Recommendations still open

### Medium value
4. **Rate-sensitivity tag per step** — mark each step "rate-independent" vs "rate shows
   up here" (amber). This is the app's thesis (*same structure, different arithmetic*);
   surfacing it per step makes switching rate/generation far more instructive. *Best
   next slice.*
5. **A cumulative overhead / rate meter** — a small running readout: 66b (+3.125%) →
   257b (+0.39%) → +FEC parity → line rate. Answers "why isn't the line 100G?" right
   where the question arises, instead of only on the MAC efficiency page.
6. **"Read more" links** — each step jumps to its full reference page (step 3 → the
   transcode page, etc.), tying the guided tour to the deep content.

### Lower value / polish
7. **Idle / IPG + AM-from-idles note** — show the stream is frames *plus* idles, and
   that alignment markers are carved out of deleted idles (and aren't scrambled).
8. **Optional autoplay** with the payload morphing between shapes.
9. **Focus / keyboard** — the ← → hint is shown, but arrow keys only fire when the page
   has focus; make the stepper grab focus on open so the hint is always true.

## Accuracy notes (checked, no change needed)

- Step order and the transcode-before-scramble detail are correct in both directions.
- MAC payload **46–1500 octets, untagged** is standards-correct and deliberately
  excludes jumbo frames (a non-standard vendor extension, not IEEE 802.3).
- Every rate has both a 100G/lane and a 200G/lane variant (e.g. 400GBASE-CR4/KR4/DR4 vs
  CR2/KR2/DR2); the per-lane toggle reflects this. Standalone illustrative *fold*
  diagrams still show a fixed example config — wiring those to the toggle is a possible
  follow-up.
- Per-rate counts (lanes, baud, RS(544,514), inner FEC at 1.6T) match the data model,
  which is sourced against `research-brief.md`.
