# Task 2 report: PHY calculation contracts

## Delivered

- Added the `RateMatchDeletion`, `RateMatchPolicy`, `PmaMappingProfile`,
  `CalculationContract`, and `StageSupport` interfaces in
  `src/inspector/types.ts`.
- Added the project-owned `REFERENCE_PMA_MAPPING` declaration with the exact
  four-lane, four-bit source-lane schedule, MSB-first dibits, Gray levels, and
  no precoder. Its fixture ID deliberately says that independent fixture
  admission is still pending.
- Added `EXPERIMENTAL_REFERENCE_CALCULATION_CONTRACT` and `getStageSupport`.
  A `supported: true` result for the experimental physical-lane or PAM4 stage
  means only that a named reference contract has been declared. Its API name,
  `executionStatus: "declared-contract-only"`, and reason explicitly say that
  it is not an implemented calculation, IEEE verified, or standards conformant.
- Kept every IEEE-only stage blocked, including `400gbase-r-tx-v1`, and kept
  the existing `getProfileSupport("400G", "tx", "100")` API and blocked result
  unchanged.
- Updated the profile contract documentation with the exact UI label
  `Reference 16-to-4 mapping` and the non-IEEE PMA profile ID.

## TDD evidence

The new stage-capability test was written before `getStageSupport` existed.
The focused test failed as expected with `TypeError: getStageSupport is not a
function`, then passed after the minimal contract implementation.

## Verification

- `npm exec vitest run test/inspector-profile.test.ts` passed: 16 tests.
- `npm run typecheck` passed.
- `npm test` passed: 91 Vitest tests and 23 Node tests.
- `git diff --check` passed.

## Deliberate limits

No protocol engine was added or changed. The IEEE-only profile remains hard
disabled. The experimental stage declaration does not permit calculation or
claim standards conformance; it gives Tasks 3 through 8 typed, named contract
inputs only.
