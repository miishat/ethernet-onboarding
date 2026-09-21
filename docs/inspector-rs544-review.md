# Standalone RS(544,514) review record

Review date: 2026-09-21

Reviewer: `/root/task8a_review_light`

Reviewed range: `7eff8ee..cf2f893`

Scope: standalone GF(2^10) and RS(544,514) only. This review does not approve Ethernet pre-FEC distribution, codeword interleave, PCS lanes, PMA mapping, PAM4, or enabling `400gbase-dr4-tx-v1`.

Method: the reviewer used separate read-only finite-field arithmetic to check the primitive-polynomial reduction, formed the generator using roots `alpha^0` through `alpha^29`, confirmed systematic `514 data + 30 parity` ordering, and evaluated the frozen nonzero codeword at all 30 generator roots.

Result: passed. The reviewed arithmetic and frozen codeword conform to the recorded ITU-T G.709.5 (2024) Corrigendum 1 Annex A conventions.

Provenance limits: `scripts/rs544-reference.py` is a repository-local independent reference implementation. This record documents internal review only and does not claim an external implementation, an independent Ethernet vector, or a complete 400GBASE-DR4 calculation.
