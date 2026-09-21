import { gfMultiply } from "./gf1024";

export const RS544_MESSAGE_SYMBOLS = 514;
export const RS544_PARITY_SYMBOLS = 30;
export const RS544_CODEWORD_SYMBOLS = RS544_MESSAGE_SYMBOLS + RS544_PARITY_SYMBOLS;

function assertMessage(message: Uint16Array): void {
  if (message.length !== RS544_MESSAGE_SYMBOLS) {
    throw new RangeError(`RS(544,514) requires exactly ${RS544_MESSAGE_SYMBOLS} message symbols.`);
  }
  for (const symbol of message) {
    if (symbol > 1023) throw new RangeError("RS(544,514) symbols must be from 0 through 1023.");
  }
}

function generatorPolynomial(): Uint16Array {
  let coefficients = Uint16Array.of(1);
  let root = 1;
  for (let rootIndex = 0; rootIndex < RS544_PARITY_SYMBOLS; rootIndex += 1) {
    const next = new Uint16Array(coefficients.length + 1);
    for (let index = 0; index < coefficients.length; index += 1) {
      next[index] ^= coefficients[index];
      next[index + 1] ^= gfMultiply(coefficients[index], root);
    }
    coefficients = next;
    root = gfMultiply(root, 2);
  }
  return coefficients;
}

const GENERATOR = generatorPolynomial();

/**
 * Encodes one standalone systematic RS(544,514) codeword.
 * The output is 514 message symbols followed by 30 parity symbols.
 */
export function encodeRs544(message: Uint16Array): Uint16Array {
  assertMessage(message);
  const divided = new Uint16Array(RS544_CODEWORD_SYMBOLS);
  divided.set(message);
  for (let index = 0; index < RS544_MESSAGE_SYMBOLS; index += 1) {
    const coefficient = divided[index];
    if (coefficient === 0) continue;
    for (let offset = 0; offset < GENERATOR.length; offset += 1) {
      divided[index + offset] ^= gfMultiply(coefficient, GENERATOR[offset]);
    }
  }
  const codeword = new Uint16Array(RS544_CODEWORD_SYMBOLS);
  codeword.set(message);
  codeword.set(divided.subarray(RS544_MESSAGE_SYMBOLS), RS544_MESSAGE_SYMBOLS);
  return codeword;
}
