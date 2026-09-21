#!/usr/bin/env python3
"""Independent polynomial-arithmetic reference for the standalone RS(544,514) fixture.

This script deliberately does not import TypeScript, generated tables, or application code.
It uses shift-and-reduce multiplication over GF(2^10), then polynomial long division.
"""

import hashlib
import json
from pathlib import Path

FIELD_SIZE = 1024
MESSAGE_SYMBOLS = 514
PARITY_SYMBOLS = 30
PRIMITIVE_POLYNOMIAL = 0x409  # x^10 + x^3 + 1


def multiply(left: int, right: int) -> int:
    result = 0
    while right:
        if right & 1:
            result ^= left
        right >>= 1
        left <<= 1
        if left & FIELD_SIZE:
            left ^= PRIMITIVE_POLYNOMIAL
    return result


def generator() -> list[int]:
    polynomial = [1]
    root = 1
    for _ in range(PARITY_SYMBOLS):
        next_polynomial = [0] * (len(polynomial) + 1)
        for index, coefficient in enumerate(polynomial):
            next_polynomial[index] ^= coefficient
            next_polynomial[index + 1] ^= multiply(coefficient, root)
        polynomial = next_polynomial
        root = multiply(root, 2)
    return polynomial


def encode(message: list[int]) -> list[int]:
    work = message + [0] * PARITY_SYMBOLS
    divisor = generator()
    for index in range(MESSAGE_SYMBOLS):
        coefficient = work[index]
        if coefficient:
            for offset, divisor_coefficient in enumerate(divisor):
                work[index + offset] ^= multiply(coefficient, divisor_coefficient)
    return message + work[-PARITY_SYMBOLS:]


def main() -> None:
    script_path = Path(__file__)
    message = [((index * 73) + 19) % FIELD_SIZE for index in range(MESSAGE_SYMBOLS)]
    codeword = encode(message)
    fixture = {
        "id": "rs544-standalone-polynomial-v1",
        "reference": {
            "implementation": "scripts/rs544-reference.py",
            "revision": "standalone-rs544-reference-v1",
            "sha256": hashlib.sha256(script_path.read_bytes()).hexdigest(),
            "method": "Independent Python shift-and-reduce field multiplication and polynomial long division",
        },
        "source": {
            "sourceUrl": "https://www.itu.int/rec/dologin_pub.asp?id=T-REC-G.709.5-202505-I%21Cor1%21PDF-E&lang=e&type=items",
            "edition": "ITU-T G.709.5 (2024) Corrigendum 1",
            "clause": "Annex A, pages 36-38",
            "conventions": "GF(2^10), primitive polynomial x^10 + x^3 + 1, generator roots alpha^0 through alpha^29, systematic [514 data symbols, 30 parity symbols] order. This is a standalone codeword, not an Ethernet stream.",
        },
        "message": message,
        "codeword": codeword,
    }
    canonical = json.dumps({"message": message, "codeword": codeword}, separators=(",", ":")).encode()
    fixture["artifactSha256"] = hashlib.sha256(canonical).hexdigest()
    output = Path("test/fixtures/inspector/rs544-standalone-polynomial-v1.json")
    output.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
