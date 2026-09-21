const FIELD_SIZE = 1024;
const MULTIPLICATIVE_ORDER = FIELD_SIZE - 1;
const PRIMITIVE_POLYNOMIAL_REDUCTION = 0x009;

function assertFieldElement(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value >= FIELD_SIZE) {
    throw new RangeError("GF(2^10) elements must be integers from 0 through 1023.");
  }
}

function buildTables(): { readonly logarithms: Int16Array; readonly exponents: Uint16Array } {
  const logarithms = new Int16Array(FIELD_SIZE);
  logarithms.fill(-1);
  const exponents = new Uint16Array(MULTIPLICATIVE_ORDER * 2);
  let value = 1;
  for (let exponent = 0; exponent < MULTIPLICATIVE_ORDER; exponent += 1) {
    exponents[exponent] = value;
    logarithms[value] = exponent;
    value <<= 1;
    if ((value & FIELD_SIZE) !== 0) value = (value & (FIELD_SIZE - 1)) ^ PRIMITIVE_POLYNOMIAL_REDUCTION;
  }
  for (let exponent = MULTIPLICATIVE_ORDER; exponent < exponents.length; exponent += 1) {
    exponents[exponent] = exponents[exponent - MULTIPLICATIVE_ORDER];
  }
  return { logarithms, exponents };
}

const TABLES = buildTables();

/** Multiplies two GF(2^10) elements using x^10 + x^3 + 1. */
export function gfMultiply(left: number, right: number): number {
  assertFieldElement(left);
  assertFieldElement(right);
  if (left === 0 || right === 0) return 0;
  return TABLES.exponents[TABLES.logarithms[left] + TABLES.logarithms[right]];
}
