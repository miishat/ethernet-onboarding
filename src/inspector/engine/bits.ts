function assertBinary(bits: Uint8Array): void {
  for (const bit of bits) if (bit !== 0 && bit !== 1) throw new RangeError("Bits must be binary values.");
}

export function octetsToBits(octets: Uint8Array): Uint8Array {
  const bits = new Uint8Array(octets.length * 8);
  for (let i = 0; i < octets.length; i += 1) {
    for (let bit = 0; bit < 8; bit += 1) bits[i * 8 + bit] = (octets[i] >>> bit) & 1;
  }
  return bits;
}

export function bitsToOctets(bits: Uint8Array): Uint8Array {
  assertBinary(bits);
  if (bits.length % 8 !== 0) throw new RangeError("Bit conversion requires an octet-aligned input.");
  const octets = new Uint8Array(bits.length / 8);
  for (let i = 0; i < octets.length; i += 1) {
    for (let bit = 0; bit < 8; bit += 1) octets[i] |= bits[i * 8 + bit] << bit;
  }
  return octets;
}

export function readBits(bits: Uint8Array, start: number, count: number): Uint8Array {
  assertBinary(bits);
  if (!Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count < 0 || start + count > bits.length) {
    throw new RangeError("Requested bit range is outside the input.");
  }
  return bits.slice(start, start + count);
}

export function writeBits(target: Uint8Array, start: number, value: Uint8Array): Uint8Array {
  assertBinary(target);
  assertBinary(value);
  if (!Number.isInteger(start) || start < 0 || start + value.length > target.length) {
    throw new RangeError("Requested bit range is outside the target.");
  }
  target.set(value, start);
  return target;
}
