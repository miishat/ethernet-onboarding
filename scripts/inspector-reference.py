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
import zlib
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


def pma_fixture_pcs_bits(length: int) -> list[str]:
    """Independent project fixture input, one recoverable pattern per PCSL."""
    return [
        "".join(str(((lane * 11 + bit * 7 + 3) >> (bit % 4)) & 1) for bit in range(length))
        for lane in range(16)
    ]


def pma_output() -> dict[str, object]:
    """Project-owned 16:4 bit schedule and MSB-first Gray PAM4 labels."""
    input_bits = pma_fixture_pcs_bits(16)
    schedules = ([0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15])
    pmd_bits: list[str] = []
    for schedule in schedules:
        consumed = [0] * 16
        output_bits: list[str] = []
        for time in range(64):
            source_lane = schedule[time % 4]
            output_bits.append(input_bits[source_lane][consumed[source_lane]])
            consumed[source_lane] += 1
        pmd_bits.append("".join(output_bits))

    gray_levels = {"00": -3, "01": -1, "11": 1, "10": 3}
    pam4 = [
        {
            "dibits": [bits[index:index + 2] for index in range(0, len(bits), 2)],
            "normalizedLevels": [gray_levels[bits[index:index + 2]] for index in range(0, len(bits), 2)],
        }
        for bits in pmd_bits
    ]
    artifact = {
        "inputPcsBits": input_bits,
        "startAbsoluteBit": 0,
        "nextAbsoluteBit": 64,
        "startState": {"absoluteOutputBit": 0, "consumedBitsByPcsLane": [0] * 16},
        "nextState": {"absoluteOutputBit": 64, "consumedBitsByPcsLane": [16] * 16},
        "pmdLaneBits": pmd_bits,
        "pam4": pam4,
    }
    return {
        "id": "reference-pma-16x4-v1",
        "status": "pending-independent-review",
        "source": {
            "sourceId": "project-owned-reference-pma-v1",
            "scope": "Selected 16:4 bit mux, MSB-first dibits, Gray normalized levels, and no precoder.",
            "candidateLimits": "IEEE Clause 120 permits implementation-specific PMA ordering. This fixture does not claim a universal IEEE PMA order, measured voltage, optical power, or standards conformance.",
        },
        "mapping": {
            "periodBits": 4,
            "sourcePcsLaneByPmdLane": schedules,
            "initialPhase": 0,
            "firstBitSignificance": "msb",
            "grayLevels": gray_levels,
            "precoder": {"mode": "none"},
        },
        "reference": {
            "implementation": "scripts/inspector-reference.py",
            "revision": "reference-pma-16x4-v1",
            "sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "method": "Independent Python schedule mux and Gray mapping. No TypeScript or stored expected fixture import.",
        },
        "review": {"reviewerId": None, "reviewedOn": None, "result": "pending", "limits": "Expected output remains pending independent review and cannot enable the IEEE-only profile."},
        "artifactSha256": hashlib.sha256(json.dumps(artifact, separators=(",", ":"), ensure_ascii=True).encode("ascii")).hexdigest(),
        **artifact,
    }


def lsb_bits(octets: list[int]) -> list[int]:
    return [(octet >> bit) & 1 for octet in octets for bit in range(8)]


def control66(octets: list[int], mask: int) -> list[int]:
    if mask == 0:
        return [0, 1] + lsb_bits(octets)
    if mask == 0xff and all(octet == 7 for octet in octets):
        return [1, 0] + lsb_bits([0x1e]) + [0] * 56
    if mask == 1 and octets[0] == 0xfb:
        return [1, 0] + lsb_bits([0x78]) + lsb_bits(octets[1:])
    terminate = octets.index(0xfd) if 0xfd in octets else -1
    types = [0x87, 0x99, 0xaa, 0xb4, 0xcc, 0xd2, 0xe1, 0xff]
    if terminate >= 0 and mask == ((0xff << terminate) & 0xff) and all(octet == 7 for octet in octets[terminate + 1:]):
        payload = lsb_bits(octets[:terminate])
        payload += [0] * (56 - len(payload))
        return [1, 0] + lsb_bits([types[terminate]]) + payload
    raise ValueError("unsupported candidate control placement")


def transcode(blocks: list[list[int]]) -> list[int]:
    payload = [bit for block in blocks for bit in block[2:]]
    if all(block[:2] == [0, 1] for block in blocks):
        return [1] + payload
    if all(block[0] != block[1] for block in blocks):
        lead = [block[1] for block in blocks]
        first_control = next(index for index, block in enumerate(blocks) if block[0] == 1)
        return [0] + lead + payload[:first_control * 64 + 4] + payload[first_control * 64 + 8:]
    raise ValueError("invalid sync header")


def scramble(input_bits: list[int], state: list[int]) -> tuple[list[int], list[int]]:
    result: list[int] = []
    history = state[:]
    for bit in input_bits:
        output_bit = bit ^ history[19] ^ history[0]
        result.append(output_bit)
        history = history[1:] + [output_bit]
    return result, history


def sha_bits(bits: list[int]) -> str:
    return hashlib.sha256("".join(map(str, bits)).encode("ascii")).hexdigest()


def run_reference_output() -> dict[str, object]:
    """Full default experimental run, implemented without TypeScript or fixtures."""
    destination = [2, 0, 0, 0, 0, 2]
    source = [2, 0, 0, 0, 0, 1]
    payload = list(range(64))
    without_fcs = destination + source + [0x88, 0xb5] + payload
    fcs_value = zlib.crc32(bytes(without_fcs)) & 0xffffffff
    frame = without_fcs + list(fcs_value.to_bytes(4, "little"))
    raw: list[tuple[int, bool]] = [(7, True)] * 4096
    raw += [(0xfb, True)] + [(0x55, False)] * 6 + [(0xd5, False)]
    raw += [(octet, False) for octet in frame] + [(0xfd, True)]
    while len(raw) % 32:
        raw.append((7, True))
    words = [raw[offset:offset + 8] for offset in range(0, len(raw), 8)]
    # Zero phase reserves eight transcoded blocks, then completes four FEC pairs.
    while len(words) < 640:
        words.append([(7, True)] * 8)
    deleted = list(range(32))
    words = [word for index, word in enumerate(words) if index not in deleted]
    blocks66 = []
    for word in words:
        octets = [item[0] for item in word]
        mask = sum((1 << index) for index, item in enumerate(word) if item[1])
        blocks66.append(control66(octets, mask))
    blocks257 = [transcode(blocks66[index:index + 4]) for index in range(0, len(blocks66), 4)]
    pre_scramble = [bit for block in blocks257 for bit in block]
    seed = [int(bit) for bit in f"{int('3FFFFFFFFFFFFFF', 16):058b}"]
    scrambled, scrambler_state = scramble(pre_scramble, seed)
    marker_text, marker = corrected_marker_bits()
    marked = [int(bit) for bit in marker_text] + scrambled
    pcs_symbols = [[] for _ in range(16)]
    messages_hashes: list[str] = []
    codeword_hashes: list[str] = []
    for pair in range(4):
        message_a, message_b = split_messages("".join(map(str, marked[pair * 10280:(pair + 1) * 10280])))
        codeword_a, codeword_b = encode(message_a), encode(message_b)
        interleaved = interleave(codeword_a, codeword_b)
        lanes = lanes_from(interleaved)
        for lane in range(16):
            pcs_symbols[lane].extend(lanes[lane])
        messages_hashes.append(hashlib.sha256(json.dumps([message_a, message_b], separators=(",", ":")).encode("ascii")).hexdigest())
        codeword_hashes.append(hashlib.sha256(json.dumps([codeword_a, codeword_b], separators=(",", ":")).encode("ascii")).hexdigest())
    pcs_bits = [[(symbol >> bit) & 1 for symbol in lane for bit in range(10)] for lane in pcs_symbols]
    schedules = ([0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15])
    pmd_bits: list[list[int]] = []
    for schedule in schedules:
        consumed = [0] * 16
        lane_bits: list[int] = []
        for time in range(len(pcs_bits[0])):
            source_lane = schedule[time % 4]
            lane_bits.append(pcs_bits[source_lane][consumed[source_lane]])
            consumed[source_lane] += 1
        pmd_bits.append(lane_bits)
    levels = {"00": -3, "01": -1, "11": 1, "10": 3}
    pam4 = [[levels[f"{bits[index]}{bits[index + 1]}"] for index in range(0, len(bits), 2)] for bits in pmd_bits]
    artifact = {
        "macHex": bytes(frame).hex(),
        "interfaceWordCount": 640,
        "deletedWordIndexes": deleted,
        "transcodedBlockCount": len(blocks257),
        "scramblerPredecessorState": "3FFFFFFFFFFFFFF",
        "scramblerStateAfter": "".join(map(str, scrambler_state)),
        "markerPrbsSeed": "0x1ff",
        "markerStateAfter": marker["prbsStateLsbToMsb"],
        "fecPairCount": 4,
        "stageHashes": {
            "encode66": sha_bits([bit for block in blocks66 for bit in block]),
            "transcode257": sha_bits(pre_scramble),
            "scramble": sha_bits(scrambled),
            "markers": sha_bits(marked),
            "pcsLanes": [sha_bits(bits) for bits in pcs_bits],
            "pmdLanes": [sha_bits(bits) for bits in pmd_bits],
            "pam4": [hashlib.sha256(json.dumps(level, separators=(",", ":")).encode("ascii")).hexdigest() for level in pam4],
            "messages": messages_hashes,
            "codewords": codeword_hashes,
        },
        "selectedBoundaryValues": {
            "first66Bits": "".join(map(str, blocks66[0])),
            "first257Bits": "".join(map(str, blocks257[0])),
            "firstPmdBits": "".join(map(str, pmd_bits[0][:32])),
            "firstPam4Levels": pam4[0][:16],
        },
    }
    return {
        "id": "default-frame-reference-pma-v1",
        "status": "pending-independent-review",
        "provenanceLabels": ["Experimental reference using candidate contracts", "Candidate IEEE source", "Independent local fixture", "Not IEEE verified or standards conformant"],
        "policies": {"rateMatch": "product-owned-reference-am-rate-match-v1", "pma": "reference-16x4-bit-mux-v1", "marker": "product-owned-reference-am-values-v1"},
        "reference": {"implementation": "scripts/inspector-reference.py", "revision": "default-run-reference-v1", "method": "Independent Python MAC through PAM4 pipeline. It imports no TypeScript or stored expected fixture."},
        "review": {"result": "pending", "limits": "Expected output is not admitted until independent review and cannot enable the IEEE-only profile."},
        "artifact": artifact,
        "artifactSha256": hashlib.sha256(json.dumps(artifact, separators=(",", ":"), ensure_ascii=True).encode("ascii")).hexdigest(),
    }
    return {
        "id": "reference-pma-16x4-v1",
        "status": "pending-independent-review",
        "source": {
            "sourceId": "project-owned-reference-pma-v1",
            "scope": "Selected 16:4 bit mux, MSB-first dibits, Gray normalized levels, and no precoder.",
            "candidateLimits": "IEEE Clause 120 permits implementation-specific PMA ordering. This fixture does not claim a universal IEEE PMA order, measured voltage, optical power, or standards conformance.",
        },
        "mapping": {
            "periodBits": 4,
            "sourcePcsLaneByPmdLane": schedules,
            "initialPhase": 0,
            "firstBitSignificance": "msb",
            "grayLevels": gray_levels,
            "precoder": {"mode": "none"},
        },
        "reference": {
            "implementation": "scripts/inspector-reference.py",
            "revision": "reference-pma-16x4-v1",
            "sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "method": "Independent Python schedule mux and Gray mapping. No TypeScript or stored expected fixture import.",
        },
        "review": {
            "reviewerId": None,
            "reviewedOn": None,
            "result": "pending",
            "limits": "Expected output remains pending independent review and cannot enable the IEEE-only profile.",
        },
        "artifactSha256": hashlib.sha256(
            json.dumps(artifact, separators=(",", ":"), ensure_ascii=True).encode("ascii")
        ).hexdigest(),
        **artifact,
    }


if __name__ == "__main__":
    data = output()
    if sys.argv[1:] == ["--pma-json"]:
        print(json.dumps(pma_output(), ensure_ascii=True, sort_keys=True, separators=(",", ":")))
    elif sys.argv[1:] == ["--run-json"]:
        print(json.dumps(run_reference_output(), ensure_ascii=True, sort_keys=True, separators=(",", ":")))
    elif sys.argv[1:] == ["--json"]:
        print(json.dumps(data, ensure_ascii=True, sort_keys=True, separators=(",", ":")))
    elif len(sys.argv) == 1:
        print(json.dumps(data, ensure_ascii=True, indent=2))
    else:
        raise SystemExit("usage: inspector-reference.py [--json | --pma-json]")
