# Research summary: tuned baseline rules

Implemented 29 September 2026. The selected ending is **finish the triggering round**, not immediate termination or an additional full lap.

## Adopted configuration

- Current/original board: 59/88/123 explorable spaces for 2/3/4 players. No opening reveals or seat bonuses.
- Bag includes four additional tiles per player: 67/100/139 total.
- Set aside one tile before every turn, including turn 1; no separate round draw. Those volcanoes count, but set-aside tiles reveal no spaces and award no points.
- Nominal volcano shares 9%/10%/12%, producing 6/10/17 volcano tiles. Keep eruption thresholds at 5/8/11. Other terrain weights scale proportionally.
- Finish the triggering action and turn, then later seats finish that round. Continue pre-turn draws while tiles remain. Stop after the last seat, without drawing for another turn.
- Optional mulligan replaces the entire turn: discard/refill all four cards, crawler 0–3 legal spaces, optional mining only at the destination (staying put allowed). Normal bridge credits and blocking apply. No additional card draw at turn end; no cancelling after seeing replacements.
- Fixed shuffled 54-card deck, nine of each of six types; discard recycling never collects opponents' hands.
- Tested scoring retained: mine discovery 1; low mine claims 3 then 2; high mine 4; owner receives 3 per opponent bridge entry. No undo for drone exploration.

## Research sequence

Earlier studies investigated the round clock, opening reveals, first-seat extra turns, the randomized deck, equal-turn endings, and per-turn tile removal. They showed that equal turns and additional opening information are not automatic cures for seat imbalance. Changing scoring, cards, openings, bag composition and ending rules created separate experiments rather than pooled results.

The volcano/mulligan tuning study used 1,728 calibration outcomes followed by 7,776 confirmation outcomes. All reached eruption. Selected nominal volcano shares were 9/10/12%; confirmation mean lengths were 9.92/10.61/10.04 rounds for 2/3/4 players. The goal is an average near ten rounds, not a hard ten-round limit.

The final ending comparison used **2,592 independent seeded starting situations, each played under three endings: 7,776 outcomes**. Each ending/player-count combination included 504 all-Balanced games and 360 mixed games with Balanced, Mining, Exploration and Bridge policies balanced through seats. Chaos and Devil's advocate were excluded. Fifty-four separate development trials were excluded from measurement. All 7,776 games reached eruption: 237,974 played turns and 1,988,646 handler actions. Seventeen validation tests and the full score, deck, terrain, checkpoint, paired-prefix and termination audit passed.

## Ending comparison: all-Balanced cohort

Each row contains 504 games. Round equivalents = played turns / player count. Ties split win shares equally. Bag usage includes revealed and set-aside tiles; board revelation excludes safe bases.

| Players | Ending | Rounds | Points/player | Winner margin | Seat win shares, first to last | Bag used / board revealed |
|---|---|---:|---:|---:|---|---|
| 2 | Immediate | 9.31 | 18.23 | 6.41 | 55.0 / 45.0% | 75.6 / 53.5% |
| 2 | Finish round | 9.82 | 19.37 | 6.39 | 50.8 / 49.2% | 79.7 / 57.2% |
| 2 | Final lap | 10.57 | 20.86 | 6.76 | 54.5 / 45.5% | 84.0 / 59.8% |
| 3 | Immediate | 10.09 | 19.37 | 5.04 | 37.7 / 33.2 / 29.1% | 76.1 / 51.4% |
| 3 | Finish round | 10.60 | 20.46 | 5.13 | 32.6 / 34.8 / 32.6% | 79.8 / 54.6% |
| 3 | Final lap | 11.28 | 21.85 | 5.33 | 36.2 / 34.6 / 29.2% | 84.3 / 57.4% |
| 4 | Immediate | 9.36 | 16.98 | 4.31 | 26.1 / 27.5 / 22.3 / 24.1% | 67.2 / 45.1% |
| 4 | Finish round | 9.87 | 18.10 | 4.34 | 21.8 / 26.9 / 22.0 / 29.3% | 71.3 / 48.5% |
| 4 | Final lap | 10.49 | 19.36 | 4.46 | 25.6 / 28.0 / 22.1 / 24.2% | 75.5 / 51.2% |

Finish-round mixed-cohort means were 9.89/10.68/10.03 rounds. Mixed seat win shares were 45.3/54.7%; 32.3/32.7/35.0%; and 24.2/26.2/23.8/25.8%. This differs from the homogeneous cohort and cautions against declaring any ending universally balanced.

Compared with finishing the round, a final lap added approximately 0.61–0.75 round equivalents and 1.26–1.49 points per player in the Balanced cohort, changing winner sets in 11.1/13.3/17.7% of games. Most extra points were mining points. Extra play generally increased score ranges rather than tightening them. It also left unequal historical turn counts in 49.4/63.7/77.0% of baseline games. Finish-round guarantees equal counts and stays closer to the target duration overall.

## Interpretation and limits

Confidence intervals used 10,000 game-level bootstrap resamples, retaining all seats in a game together and preserving seed pairs. Every multiplicity-adjusted seat-spread comparison included zero. **The chosen rule provides equal turns; it is not a proven universal fix for seat advantage.** Detailed lineups and secondary metrics remain exploratory.

Conclusions apply to frozen simulated policies. Human enjoyment, actual human duration and optimal strategy are unproven. The policies were not optimized specifically for announced final turns. Existing nonuniform terrain shuffle behavior was preserved. The broad occupancy-blocking metric includes ordinary occupied spaces and should not be read as evidence that everyone is trapped. Resource access and stranded positions were measured separately.

## Retained evidence and implementation checks

The full local experiment archives retain manifests, fingerprints, frozen source, seeded schedules, checksummed outcomes, per-turn checkpoints, raw action logs, confidence intervals, charts and resume guides. They are not replayed or relabeled as tests of the newly edited app. Historical adapters deliberately reject changed source fingerprints. Raw archives are large and are not included in this rules commit; this summary records the decision and principal evidence.

Local archive directories: `playtests/turn-round-volcano-calibration`, `playtests/turn-round-volcano`, and `playtests/ending-comparison`. The last contains ASSESSMENT.md, METRICS.md, SEAT-DETAILS.md, STRATEGIES.md, annotated histories and JSON data.

Implementation regression checks: `node --test scripts/rules/tests.mjs`. They exercise the actual app handlers at all player counts and alternate layouts, opening draws, final-round termination at each triggering seat, irreversible exploration, mulligan mining/movement/bridge rewards, hand recycling, privacy locks and post-game guards.

Implementation verification on 29 September: all nine regression tests passed; TypeScript and targeted lint passed; production build passed. Browser checks confirmed the opening draw, zero-step mulligan, four-card replacement without an extra end-turn draw, and next-turn privacy/draw flow. Randomized initial hands now render only after client hydration to avoid a server/browser mismatch. Repository-wide lint still reports pre-existing issues in unrelated components and archived experiment scripts.
