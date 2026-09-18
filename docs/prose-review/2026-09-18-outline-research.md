# Research register for the completed outlines

Research date: September 18, 2026. Scope: the ten previously unwritten lessons. Sources below are IEEE task-force material, OIF publications or documentation from the relevant manufacturers. No third-party tutorial was used as authority.

## FEC degrade

- [IEEE 802.3bs recap and 802.3cd proposal, April 2017](https://www.ieee802.org/3/cd/public/adhoc/archive/nicholl_042617_3cd_adhoc.pdf), slide 4: separates monitoring from alignment-marker signalling. The later 50G/100G proposal is not treated as a universal notification mechanism.
- [AMD degraded-SER monitoring documentation](https://docs.amd.com/r/en-US/IEEE-802.3df-RS-FEC-Chapters-Sub-Map-amdDocIdBuffer/Degraded-SER-Monitoring): confirms the Clause 172.2.5.3 implementation's activation, deactivation and alignment conditions. Port names, sharing across ports and configuration-update behavior are implementation details, not general PHY requirements.

## Clock and data recovery

- [TI SNLA410, July 2022](https://www.ti.com/lit/an/snla410/snla410.pdf?ts=1781542226985), section 2: feedback timing recovery and jitter-transfer/tracking trade-off. Its device-specific register settings, frequency ranges and thermal procedures are not extrapolated to 200G lanes.
- [IEEE training service-interface discussion, May 2024](https://www.ieee802.org/3/dj/public/24_05/ran_3dj_05_2405.pdf), slides 5-6: distinguishes signal detection, CDR-related quality and valid data.
- Timing examples are arithmetic: `1 / 53.125 GBd = 18.8235 ps` and `1 / 106.25 GBd = 9.4118 ps`. They are not jitter tolerances.

## CR, KR and twinax

- [IEEE editorial delay discussion, September 2023](https://www.ieee802.org/3/df/public/23_0926/brown_3df_01a_230926.pdf), slides 10 and 13: identifies the Clause 162/163 CR/KR generation and its 800G variants. The proposed delay changes are not adopted as lesson parameters.
- [Adopted P802.3dj objectives, March 14, 2024](https://www.ieee802.org/3/dj/projdoc/objectives_P802d3dj_240314.pdf): electrical lane counts and project-level reach/loss objectives. These are explicitly not a complete compliance specification.
- [IEEE COM reference-receiver discussion, May 2024](https://www.ieee802.org/3/dj/public/24_05/healey_3dj_01_2405.pdf), slides 2-5: explains the reference-model boundary. No particular equaliser architecture is prescribed for all implementations.
- [IEEE P802.3dj editorial material, June 2024](https://www.ieee802.org/3/dj/public/24_06/ran_3dj_01b_2406.pdf): identifies Clause 178 as KR and distinguishes Clause 179 and AUI channel models. Exact draft model coefficients are omitted.
- [Samtec cable construction guide](https://suddendocs.samtec.com/literature/high_speed_cable_guide.pdf): physical differential-pair and shielding examples; product specifications are not IEEE cable allowances.
- [IEEE cabled-host model study, September 2024](https://www.ieee802.org/3/dj/public/24_09/mellitz_3dj_01_2409.pdf): frequency-dependent channel responses and construction/topology considerations. Internal C2M cable models are not presented as CR compliance tests.
- [IEEE 400G-per-lane call for interest, March 2026](https://www.ieee802.org/3/cfi/0326_1/CFI_01_0326.pdf), slide 26: passive, retimed and redriven cable distinctions. Marketing terminology is not assumed to establish one interoperable host interface.

## SR, VR and multimode fibre

- [IEEE 802.3db optical baseline, February 2021](https://www.ieee802.org/3/db/public/February21/murty_3db_01b_021821.pdf), transmitter/receiver and channel tables: reference reach by fibre class, lane baud rate and modal bandwidth. The prose identifies the OM3 distances as baseline values; unfinished baseline optical tolerances are not copied.
- [IEEE 802.3df editorial resolutions, May 2023](https://www.ieee802.org/3/df/public/23_0523/brown_3df_03_230523.pdf), slides 12 and 17: SR8/VR8 definitions and Clause 167 reach. A contradictory extracted table value elsewhere in this presentation was not used.
- [Cisco OM4/OM5 explanation, June 2022](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/diff-om4-om5-multimode-fiber-wp.html): mode delay, launch conditions, EMB versus OFL, and the wavelength scope of OM5. Reach claims for older PHYs are not transferred to modern ones.
- [IEEE P802.3ds project page](https://www.ieee802.org/3/ds/) and [objectives approved November 13, 2025](https://www.ieee802.org/3/200GMMF/objectives_200gmmf_01_251113.pdf): the separate 200G-per-wavelength MMF project. Its objectives are not labeled published PMD parameters.

## Single-mode fibre

- [IEEE optical fibre/channel/compliance table discussion, May 2024](https://www.ieee802.org/3/dj/public/24_05/johnson_3dj_02_2405.pdf), slide 4: different purposes of procurement, channel and transmitter-test requirements. No proposed statistical dispersion model is generalized to all PMDs.
- [Corning AEN162, revision 4](https://www.corning.com/catalog/coc/documents/application-engineering-notes/AEN162.pdf), pages 1-4: channel loss and link-model accounting. Vendor-engineered extended reaches are not treated as IEEE reaches.
- The 1.5 dB worked calculation uses explicitly assumed loss values. It establishes no pass/fail allowance for any rate. Optical modulation amplitude and average optical power are kept distinct; the IEEE 802.3db baseline also lists them separately.

## Co-packaged optics

- [OIF co-packaging framework](https://www.oiforum.com/wp-content/uploads/OIF-Co-Packaging-FD-01.0.pdf): architectural placement, optical routing and system thermal considerations. No universal power or repairability claim is inferred.
- [OIF 3.2T module agreement, revision 1.0](https://www.oiforum.com/wp-content/uploads/OIF-Co-Packaging-3.2T-Module-01.0.pdf), pages 8-10: one named implementation with aggregate versus per-port capacity, host lanes, DSP and laser options. These are industry-interface examples, not a new Ethernet MAC rate or rules for every CPO engine.

## Autonegotiation and training

- [IEEE Clause 73 explanatory edits, May 2024](https://www.ieee802.org/3/dj/public/24_05/slavick_3dj_01a_2405.pdf): MDI lane 0, Base Page fields, information-page size, advertised abilities and handshake concepts. Detailed proposed wording is not reproduced as a final normative state machine.
- [IEEE Clause 73 extension baseline, January 2024](https://www.ieee802.org/3/dj/public/24_01/lusted_3dj_04_2401.pdf): Message code 2 and extended priority resolution. Bit allocations and timers are omitted because they are revision-sensitive.
- [IEEE historical training proposal, September 2012](https://www.ieee802.org/3/100GCU/email/pdfgyC8fltPWo.pdf), slides 5 and 14: pattern/control exchange and the distinction between coefficient status and receiver readiness. Historical field sizes and symbol formats are not reused for the P802.3dj procedure.
- [IEEE Annex 176A nomenclature discussion, May 2024](https://www.ieee802.org/3/dj/public/24_05/ran_3dj_06a_2405.pdf): scope beyond one electrical PMD.
- [Final IEEE D1.1 comment resolutions, September 2024](https://www.ieee802.org/3/dj/comments/D1p1/8023dj_D1p1_comments_final_id.pdf), comment 511: renumbers training from Annex 176A to Annex 178B. The application now uses 178B in its AUI and Autonegotiation references as well as the new lesson. This avoids presenting the older source numbering as current.
- [IEEE multi-segment training service-interface discussion, May 2024](https://www.ieee802.org/3/dj/public/24_05/ran_3dj_05_2405.pdf): lane/segment readiness coordination. The lesson avoids promising one global transition timer or equating readiness with measured FEC margin.

## Deliberate limits

This pass completes onboarding explanations, not all specification tables. It does not resolve the application's previously unconfirmed 1.6T PCS lane count, introduce draft optical tolerances, or claim that training, CDR lock or a loss measurement proves full link compliance. Those limits are stated rather than filled with plausible numbers.
