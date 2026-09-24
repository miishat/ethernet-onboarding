#!/usr/bin/env python3
"""Independent 400G Clause 119 FEC distribution reference.

The program imports neither TypeScript nor a stored expected fixture.  It uses
the independently reviewed local AM generator for the corrected Clause 119
marker, then independently applies the admitted 10280-bit packing, RS order,
checkerboard interleave, and lane distribution rules.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


FIELD_SIZE = 1024
PRIMITIVE_POLYNOMIAL = 0x409
MESSAGE_SYMBOLS = 514
PARITY_SYMBOLS = 30


def multiply(left: int, right: int) -> int:
    value = 0
    while right:
        if right & 1:
            value ^= left
        right >>= 1
        left <<= 1
        if left & FIELD_SIZE:
            left ^= PRIMITIVE_POLYNOMIAL
    return value


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


def corrected_marker_bits() -> tuple[str, dict[str, object]]:
    script = Path(__file__).with_name("marker-reference.py")
    result = subprocess.run(
        [sys.executable, str(script), "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    marker = json.loads(result.stdout)
    return marker["bits"], marker


def deterministic_payload_bits(count: int) -> str:
    """Project fixture input: nonzero x^17+x^14+1 sequence, state 0x1ACE1."""
    state = 0x1ACE1
    result: list[str] = []
    for _ in range(count):
        result.append(str(state & 1))
        feedback = ((state >> 16) ^ (state >> 13)) & 1
        state = ((state << 1) & 0x1FFFF) | feedback
    return "".join(result)


def split_messages(bits: str) -> tuple[list[int], list[int]]:
    if len(bits) != 10280:
        raise ValueError("Clause 119 FEC pair needs exactly 10280 bits")
    message_a = [sum((ord(bits[20 * i + bit]) - 48) << bit for bit in range(10)) for i in range(514)]
    message_b = [sum((ord(bits[20 * i + 10 + bit]) - 48) << bit for bit in range(10)) for i in range(514)]
    return message_a, message_b


def interleave(codeword_a: list[int], codeword_b: list[int]) -> list[int]:
    output: list[int] = []
    for k in range(68):
        for j in range(8):
            source = 8 * k + j
            if k % 2 == 0:
                output.extend((codeword_a[source], codeword_b[source]))
            else:
                output.extend((codeword_b[source], codeword_a[source]))
    return output


def lanes_from(interleaved: list[int]) -> list[list[int]]:
    return [[interleaved[16 * group + lane] for group in range(68)] for lane in range(16)]


def output() -> dict[str, object]:
    marker_bits, marker = corrected_marker_bits()
    payload_bits = deterministic_payload_bits(8224)
    tx_scrambled_am_bits = marker_bits + payload_bits
    message_a, message_b = split_messages(tx_scrambled_am_bits)
    codeword_a, codeword_b = encode(message_a), encode(message_b)
    interleaved = interleave(codeword_a, codeword_b)
    lanes = lanes_from(interleaved)
    artifact = {
        "txScrambledAmBits": tx_scrambled_am_bits,
        "messageA": message_a,
        "messageB": message_b,
        "codewordA": codeword_a,
        "codewordB": codeword_b,
        "interleaved": interleaved,
        "lanes": lanes,
    }
    canonical = json.dumps(artifact, separators=(",", ":"), ensure_ascii=True).encode("ascii")
    return {
        "id": "experimental-cl119-local-400g-am-fec-v1",
        "status": "experimental-candidate",
        "source": {
            "sourceId": "ieee-8023-2022-cl119-fec-local",
            "scope": "Clause 119.2.4.5 through 119.2.4.7, printed pp. 4848-4850; user-provided local copy",
            "sourceSha256": "c6a2d53370057a3ad16166ef7918561cad8e7318f4ddf57106de22aa241731d5",
            "candidateLimits": "Annex 119A is unavailable. This fixture is local experimental evidence and cannot enable the IEEE-only profile.",
        },
        "inputState": {
            "txScrambledAmConstruction": "Reviewed 2056-bit Clause 119 marker, followed by 8224 deterministic nonzero project fixture bits.",
            "markerReference": "scripts/marker-reference.py --json",
            "markerBitSha256": marker["sha256"],
            "markerPrbsStateAfter": marker["prbsStateLsbToMsb"],
            "payloadGenerator": "x^17+x^14+1, initial state 0x1ACE1, output state[0], shift left, feedback state[16] xor state[13]",
        },
        "reference": {
            "implementation": "scripts/inspector-reference.py",
            "revision": "cl119-fec-reference-v1",
            "sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "method": "Independent Python bit packing, polynomial long division, checkerboard interleave, and lane distribution. No TypeScript or expected fixture import.",
        },
        "review": {
            "reviewerId": "/root/phy_distribution_review_light",
            "reviewedOn": "2026-09-24",
            "reviewedScope": "Clause 119.2.4.5 packing, 119.2.4.6 temporal RS orientation, 119.2.4.7 checkerboard and lane mapping, source hash, reference script hash, and artifact hash.",
            "result": "accepted-experimental-only",
            "limits": "The reviewer did not admit Annex 119A or IEEE-only profile support.",
        },
        "artifactSha256": hashlib.sha256(canonical).hexdigest(),
        **artifact,
    }


if __name__ == "__main__":
    data = output()
    if sys.argv[1:] == ["--json"]:
        print(json.dumps(data, ensure_ascii=True, sort_keys=True, separators=(",", ":")))
    elif len(sys.argv) == 1:
        print(json.dumps(data, ensure_ascii=True, indent=2))
    else:
        raise SystemExit("usage: inspector-reference.py [--json]")
