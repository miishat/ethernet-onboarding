# Deferred review debt report

## Scope

Cleared the two deferred MAC review items and the deferred documentation EOF whitespace cleanup. PHY functionality, profile support, and blocked calculation stages were not changed.

## Tests added

- `test/inspector-mac.test.ts` covers both sides of the Ethernet minimum payload boundary:
  - a 45-octet payload receives one zero pad octet, includes the `pad` field at offset 59, produces a 64-octet destination-through-FCS frame, and places FCS at offset 60;
  - a 46-octet payload receives no padding, has no `pad` field, produces the same 64-octet frame length, and places FCS at offset 60.
- A 46-octet payload whose final protected octet changes from `AB` to `AC` emits a different FCS and keeps that FCS at the end of the emitted frame.

## Red and green evidence

- Before the final green run, temporarily changing `MINIMUM_PAYLOAD_BYTES` from 46 to 45 caused the 45-octet boundary test to fail with received padding `0` instead of expected `1`.
- Temporarily replacing computed FCS bytes with four zero octets caused the one-octet edit regression to fail because both FCS values were identical.
- Restored the production implementation unchanged. Focused test run passed: 15 tests in `test/inspector-mac.test.ts`.

## Documentation hygiene

Removed surplus trailing blank lines from the implementation plan and specification. Both retain exactly one terminal newline.

## Verification

- `npm exec vitest run test/inspector-mac.test.ts`: 15 passed.
- `npm test`: 11 files and 87 Vitest tests passed, plus 23 Node UI-refinement tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

## Files changed

- `test/inspector-mac.test.ts`
- `docs/superpowers/plans/2026-09-18-interactive-frame-inspector.md`
- `docs/superpowers/specs/2026-09-18-interactive-frame-inspector.md`

## Commit

Commit message: `test: cover MAC frame boundaries`.
