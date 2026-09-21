# Venus Explorer — next seat-balance experiments

Saved September 20, 2026 (America/Chicago). **Pending: start when the user says “resume.”**
No scheduled/background run has been requested. This note does not change game rules.

## User request

Run two separate tests on the **Current** board, replacing the previous six-total-tile
opening experiment:

1. **Opening double turn:** the first player gets to go twice at the start only.
2. **Reveal around each base:** reveal the six tiles surrounding every player's
   starting base.

Use 2, 3 and 4 players and the four retained styles: Balanced, Mining, Exploration,
and Bridge Income. Exclude Agent of Chaos and Devil’s Advocate. Preserve the
existing terrain mix and other rules. These are simulator configurations only;
do not modify the playable game or silently combine results with earlier runs.

## Operational interpretation for implementation

These details make the requested configurations reproducible; they are the planned
interpretation, not additional user-specified rules:

- **Option 1:** player 1 takes two consecutive complete turns, each with normal
  action resolution, scoring and card replacement. Other players then take their
  first turns. Subsequent rounds use ordinary seat order. No setup tiles are
  revealed. The bonus turn does not trigger an early round draw: the first round
  draw occurs after every player has finished that first round, including the bonus
  turn. Count the bonus in game-length statistics. Respect immediate eruption
  if the game ends during either turn.
- **Option 2:** reveal the union of all six adjacent hexes around every starting
  base before play. An adjacent base is already visible and remains a base;
  draw terrain only for unknown non-base hexes. Shared neighbors are revealed
  once. Under the current layout this yields **11 / 13 / 13 distinct new tiles**
  for 2 / 3 / 4 players, not necessarily six times the player count. Verify these
  counts against the captured layout before running. Draw from the existing bag,
  without rerolls or discovery credits. Volcanoes count toward eruption normally;
  do not postpone an eruption reached during setup. Use a documented, separately
  seeded shuffle of eligible locations to avoid giving early bag positions to
  a particular seat. No bonus first turn in this option.

## Planned experiment design

- Capture and fingerprint the current tested source and configuration adapters.
- Retain the four frozen policy implementations without tuning them to a test arm.
- Run a fresh common unrevealed, normal-turn control plus the two requested arms,
  pairing their initial bag and policy seeds. Separate setup randomization from
  those streams. Pairing preserves bag order, not a fixed terrain map.
- Target **504 games per arm/player count**: 144 identical Balanced-player baseline
  games and 360 mixed games. Three arms × three player counts = **4,536 games**.
- Balance mixed styles across seats. Each ordered distinct-style pair occurs
  30 times; each ordered triple or quadruple occurs 15 times.
- Use gates at 84, 252 and 504 games per arm/player count, with bounded batches
  rotating across arms and counts. Gates do not require repeated permission.
- Save completed games immediately, checkpoint each resolved turn, preserve random
  state and setup state, and detect duplicate results and incompatible versions.
- Validate the extra-turn card/seat/round sequence, overlapping opening reveals,
  bag conservation, no setup credits, volcano handling, and interruption/recovery
  before freezing each new experiment. Setup eruption must be recorded correctly
  even if zero ordinary turns occur.
- Preserve existing limits: 2,000 player turns or 20,000 interface-equivalent
  actions. Censor unresolved games without forcing exploration or a winner.

## Analysis and deliverables

Primary seat-balance analysis uses identical Balanced players. Split tied wins
equally and report the largest-minus-smallest seat win-rate spread. Show individual
seat rates as well as changes relative to the common control. Keep mixed-style
results separate. Use paired-game confidence intervals, preserving within-game
dependence, and qualify comparisons across two interventions and three counts.
Do not treat a smaller point estimate alone as proof of improved balance.

Also retain scores/distributions, scoring sources, cards and action halves,
turns, completion, exploration, movement and interaction measures. Report the
extra opening turn and setup reveals explicitly. Generate charts, raw game/player/
action logs, validation evidence, gate reports and an exact resume guide.

## Previous results to preserve

### Original round-clock assessment

- Local folder: `playtests/round-clock`; harness: `scripts/playtest`.
- 6,048 games: four boards × three player counts × 504 games, using six styles.
- All reached eruption. Round draws triggered 57.1% of endings.
- Round-clock/permanent-drone-reveal rule commit:
  [a4443b3](https://github.com/stanmcbride/VenusExplorer/commit/a4443b3), on `test`.

### Six tiles total, Current board only

- Local folder: `playtests/seat-reveal6`; harness: `scripts/seat-playtest`.
- 3,024 games: unrevealed control and six-reveal arm, 2–4 players, 504 each.
- Four styles only; all games reached eruption; 23 automated checks passed.
- Geometry-balanced random opening sets gave each base three adjacent revealed
  hexes using six total tiles. No discovery points were awarded at setup.

Baseline fractional seat-win spreads, in percentage points:

| Players | Control | Six revealed | Change | 95% paired interval for change |
|---|---:|---:|---:|---|
| 2 | 9.7 | 16.7 | +6.9 | -12.5 to +25.7 |
| 3 | 16.0 | 9.4 | -6.6 | -21.5 to +10.8 |
| 4 | 12.8 | 23.8 | +11.0 | -5.0 to +22.0 |

The test did not establish improved balance. Two- and four-player point estimates
worsened; three-player estimates improved, but all spread-change intervals crossed
zero. The user requested the two new alternatives after reviewing these results.

## Resume handoff and repository scope

On “resume,” read this note, inspect local status and any experiment manifests,
then implement and validate the two new configurations in a **separate version**.
Do not rerun completed prior games or edit their fingerprints. Preserve existing
unrelated working-tree changes.

The tested working-tree source includes pre-existing local balance settings:
low mines 3/2 credits, high mines 4, opponent bridge entries 3; terrain percentages
plain 20 / canyon 47 / low 15 / high 10 / volcano 8. Those local balance/art changes
were not part of the earlier rule-only commit. Capture the actual source again and
record any difference before comparing results.

This commit publishes the handoff and experiment notes. The harnesses, checkpoints,
raw datasets and full local reports are **not uploaded by this notes-only commit**.
On this workspace they remain under `C:\Github\VenusExplorer\scripts` and
`C:\Github\VenusExplorer\playtests`. A fresh GitHub checkout alone is not a complete
copy of those experiment artifacts.
