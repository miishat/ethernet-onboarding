/**
 * Product-owned representation of the candidate Clause 49 self-synchronous
 * recurrence.  The state is the oldest-to-newest history of prior scrambled
 * bits, never a reset seed.
 */
export type ScramblerState = Uint8Array;

function binaryState(predecessorState: ScramblerState): void {
  if (predecessorState.length !== 58 || [...predecessorState].some((bit) => bit !== 0 && bit !== 1)) {
    throw new RangeError("The experimental reference scrambler requires 58 binary predecessor bits.");
  }
}

export function scrambleBits(input: Uint8Array, predecessorState: ScramblerState): { bits: Uint8Array; state: ScramblerState } {
  binaryState(predecessorState);
  const history = Uint8Array.from(predecessorState);
  const bits = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] !== 0 && input[index] !== 1) throw new RangeError("Scrambler input must be binary.");
    const output = input[index] ^ history[19] ^ history[0];
    bits[index] = output;
    history.copyWithin(0, 1);
    history[57] = output;
  }
  return { bits, state: history };
}
