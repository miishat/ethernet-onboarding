import {
  encodeRs544,
  RS544_CODEWORD_SYMBOLS,
  RS544_MESSAGE_SYMBOLS,
} from "./rs544";

export const CLAUSE119_FEC_PAIR_BITS = 10280;
export const CLAUSE119_INTERLEAVED_SYMBOLS = 1088;
export const CLAUSE119_PCS_LANES = 16;
export const CLAUSE119_SYMBOLS_PER_LANE = 68;

export interface FecMessagePair {
  /** Temporal order: index zero is m<513>, the first symbol presented to RS. */
  readonly messageA: Uint16Array;
  /** Temporal order: index zero is m<513>, the first symbol presented to RS. */
  readonly messageB: Uint16Array;
}

function assertBinaryBits(bits: Uint8Array): void {
  if (bits.length !== CLAUSE119_FEC_PAIR_BITS) {
    throw new RangeError(`Clause 119 pre-FEC distribution requires exactly ${CLAUSE119_FEC_PAIR_BITS} bits.`);
  }
  for (const bit of bits) {
    if (bit !== 0 && bit !== 1) throw new RangeError("Clause 119 pre-FEC distribution requires binary bits.");
  }
}

function readLeastSignificantBitFirstSymbol(bits: Uint8Array, start: number): number {
  let symbol = 0;
  for (let bit = 0; bit < 10; bit += 1) symbol |= bits[start + bit] << bit;
  return symbol;
}

/**
 * Applies 119.2.4.5 to a complete 40-block FEC pair. Array index zero is the
 * first temporal encoder input, which corresponds to the standard's m<513>.
 */
export function splitFecMessages(bits: Uint8Array): FecMessagePair {
  assertBinaryBits(bits);
  const messageA = new Uint16Array(RS544_MESSAGE_SYMBOLS);
  const messageB = new Uint16Array(RS544_MESSAGE_SYMBOLS);
  for (let index = 0; index < RS544_MESSAGE_SYMBOLS; index += 1) {
    messageA[index] = readLeastSignificantBitFirstSymbol(bits, 20 * index);
    messageB[index] = readLeastSignificantBitFirstSymbol(bits, 20 * index + 10);
  }
  return { messageA, messageB };
}

/**
 * Adapts the temporal Clause 119 message order to the standalone systematic
 * primitive. The primitive's index zero is also its first encoder input.
 */
export function encodeClause119Codeword(message: Uint16Array): Uint16Array {
  return encodeRs544(message);
}

function assertCodeword(codeword: Uint16Array): void {
  if (codeword.length !== RS544_CODEWORD_SYMBOLS) {
    throw new RangeError(`Clause 119 symbol distribution requires exactly ${RS544_CODEWORD_SYMBOLS} symbols per codeword.`);
  }
  for (const symbol of codeword) {
    if (symbol > 1023) throw new RangeError("Clause 119 codeword symbols must be from 0 through 1023.");
  }
}

/**
 * Applies 119.2.4.7 in temporal order. codeword[0] denotes c<543>, which is
 * the first transmitted codeword coefficient before checkerboard interleave.
 */
export function interleaveClause119(
  codewordA: Uint16Array,
  codewordB: Uint16Array,
): Uint16Array {
  assertCodeword(codewordA);
  assertCodeword(codewordB);
  const interleaved = new Uint16Array(CLAUSE119_INTERLEAVED_SYMBOLS);
  for (let group = 0; group < CLAUSE119_SYMBOLS_PER_LANE; group += 1) {
    const base = group * CLAUSE119_PCS_LANES;
    for (let pair = 0; pair < 8; pair += 1) {
      const source = group * 8 + pair;
      const evenGroup = group % 2 === 0;
      interleaved[base + 2 * pair] = evenGroup ? codewordA[source] : codewordB[source];
      interleaved[base + 2 * pair + 1] = evenGroup ? codewordB[source] : codewordA[source];
    }
  }
  return interleaved;
}

/** Splits temporal tx_out symbols from the lowest PCS lane to the highest. */
export function distributePcsLanes(interleaved: Uint16Array): readonly Uint16Array[] {
  if (interleaved.length !== CLAUSE119_INTERLEAVED_SYMBOLS) {
    throw new RangeError(`Clause 119 PCS lane distribution requires exactly ${CLAUSE119_INTERLEAVED_SYMBOLS} symbols.`);
  }
  const lanes = Array.from(
    { length: CLAUSE119_PCS_LANES },
    () => new Uint16Array(CLAUSE119_SYMBOLS_PER_LANE),
  );
  for (let offset = 0; offset < interleaved.length; offset += 1) {
    lanes[offset % CLAUSE119_PCS_LANES][Math.floor(offset / CLAUSE119_PCS_LANES)] = interleaved[offset];
  }
  return Object.freeze(lanes);
}
