# "Follow a frame" — review & recommendations

Status: **recommendations only, not implemented.** A record of the review of the
frame-stepper section so we can decide what to build next.

## What it is today

A transmit-direction walkthrough of one frame descending the stack, nine steps:

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

Each step is rate-parameterised (400G / 800G / 1.6T change lane counts, baud, and the
FEC note), driven from `STAGES` in `src/data/stepper.ts` with art in
`src/components/StageArt.tsx`.

## What works

- **Ordering is accurate.** encode → transcode → scramble → AM → FEC → stripe →
  serialise → PAM4 matches the standard, including the 400G+ subtlety that transcode
  happens *before* scramble.
- **Rate awareness is genuine** — 800G shows 32 PCS lanes, 1.6T shows the inner-FEC note
  and symbol-multiplexed striping, baud changes per rate.
- Notes are concise and mostly explain the *why*, not just the *what* (the scramble and
  parity steps are especially good).

## The one crucial gap: the receive half

The stepper is **transmit-only**, so the single most important idea — *why we append
parity* — is never paid off. FEC's job is **correction**, and correction only happens on
the way back up. A learner reaches "Parity appended" and "Sent as PAM4" but never sees an
error get fixed.

Worse, the app already contains the perfect visual for this and doesn't use it in the
stepper: the RS **codeword diagram with damaged symbols and a live "X of 15 correctable"
budget meter** (`type: "symbols"` in `visuals.ts`). Showing errors injected by the
channel and then repaired is where the whole stack's design finally makes sense.

## Recommendations, prioritised

### High value
1. **Add an RX direction to the stepper** (mirror the global TX/RX toggle). Run the
   pipeline in reverse: PAM4 slice → deskew / reorder → **FEC decode & correct** (inject
   channel damage, show the 15-symbol budget repairing it, and the "codeword lost"
   failure case) → descramble → de-transcode → frame delivered / FCS checked. This closes
   the loop and delivers the payoff. *If we do only one thing, this is it.*
2. **A live "where am I" mini-stack.** Replace the static intro-while-stepping with a
   small highlighted copy of the sublayer column that lights the current block as you
   advance. Orientation is currently lost once inside the stepper.
3. **A closing payoff step.** After PAM4, end on "…and the receiver rebuilds the exact
   frame" (or hand off to the RX entry point) so the tour ends on the point, not a
   waveform.

### Medium value
4. **Rate-sensitivity tag per step** — mark each step "rate-independent" vs "rate shows
   up here" (amber). This is literally the app's thesis (*same structure, different
   arithmetic*); surfacing it per step makes switching rates far more instructive.
5. **A cumulative overhead / rate meter** — a small running readout: 66b (+3.125%) →
   257b (+0.39%) → +FEC parity → line rate 106.25 G. Answers "why isn't the line 100G?"
   right where the question arises, instead of only on the MAC efficiency page.
6. **"Read more" links** — each step jumps to its full reference page (step 3 → the
   transcode page, etc.), tying the guided tour to the deep content.

### Lower value / polish
7. **Idle / IPG + AM-from-idles note** — briefly show the stream is frames *plus* idles,
   and that alignment markers are carved out of deleted idles (and aren't scrambled).
   Removes a "where did room for markers come from?" gap.
8. **Optional autoplay** with the payload morphing between shapes.
9. **Focus / keyboard** — the ← → hint is shown, but arrow keys only fire when the page
   has focus; make the stepper grab focus on open so the hint is always true.

## Suggested first slice

**#1 (RX + correction) together with #2 (mini-stack).** #1 is the difference between a
nice animation and the thing that actually teaches FEC; #2 keeps the learner oriented
while it runs. #4 is the next best because it reinforces the core "same structure,
different arithmetic" idea.

## Accuracy notes (checked, no change needed)

- Step order and the transcode-before-scramble detail are correct.
- MAC payload **46–1500 octets, untagged** is standards-correct and deliberately excludes
  jumbo frames (jumbo is a non-standard vendor extension, not IEEE 802.3).
- Per-rate counts (lanes, baud, RS(544,514), inner FEC at 1.6T) match the data model,
  which is sourced against `research-brief.md`.
