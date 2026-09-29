# Venus Explorer

Version **0.0** is the first pass-and-play digital prototype of the Venus Explorer board game. Its purpose is to make the core loop playable and observable so that terrain ratios, card balance, movement, scoring, and end-game timing can be tuned before producing a physical edition.

## Premise

Players are coworkers employed by **Veld Mining Company** and deployed to Venus. Each explorer commands a **crawler** (the crew's surface vehicle/base) and a **drone** (the scouting unit). The objective is to discover and mine more valuable resources than the other explorers, then survive until volcanic activity makes the surface untenable. When explored and set-aside volcanoes reach the eruption threshold, finish the current round; the explorer with the most points wins.

## Intended format

- Local pass-and-play for 2–4 players; no CPU or AI opponents in this stage.
- Shared information: all explored terrain, claims, bridges, pieces, and scores are visible to everyone.
- A finite hexagonal map radiating outward from a central safe starting area.
- A randomized tile bag and card deck whose contents live in configuration data so ratios and abilities can be tuned without rewriting the rules engine.

## Components

Each player has one crawler, one drone, and claim tokens in their color. Shared components include the hex board, terrain bag, action-card deck, bridges, score track, discard pile, and volcano counter.

### Terrain

| Tile            | Effect                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Start / base    | One safe starting base per player on the Current board; other spaces start unexplored.                |
| Plain           | Explored, traversable terrain with no resource value.                                             |
| Canyon          | Blocks crawlers until a bridge spans the canyon.                                                  |
| Low yield mine  | Discovery: 1 point. Two claims: first 3 points, then 2 points.                       |
| High yield mine | Discovery: 1 point. One mining claim worth 4 points; then exhausted.                     |
| Volcano         | Impassable to crawlers. Reaching the eruption threshold starts the final round; finish all remaining turns. |

## Setup

1. Select the number of players and assign colors/tokens.
2. Place each crawler on its safe starting base around the center: opposite for two players, every other ring position for three, and alternating one- and two-space gaps for four. No extra terrain is revealed.
3. Build and shuffle the terrain bag from the selected terrain ratios.
4. Build the fixed 54-card action deck: nine copies of each of the six card types. Shuffle the entire deck.
5. Randomly deal four cards to every player, one at a time around the table. Keep the remaining cards as a face-down draw deck; begin with an empty discard pile.
6. Astra (seat 1) begins in the digital game. Set aside one bag tile before that first turn; it reveals no board space and awards no points.

## Turn sequence

1. Set aside one bag tile before acting, including turn 1. Set-aside volcanoes count toward eruption; no separate round draw occurs.
2. Choose a card and one of its two actions, or take a mulligan instead.
3. The first valid board selection locks the card and action. Drone reveals and discovery points cannot be undone.
4. Resolve the action. Unused movement may be forfeited. Claim eligible mines or skip mining.
5. Discard the played card and draw its replacement. If the draw deck is empty, shuffle the discards, including the just-played card. Existing hands stay private and intact.
6. Finish the turn. If eruption has occurred and this was the last seat of the round, end the mission; otherwise prepare the next turn's one set-aside draw and pass behind the privacy curtain.

**Mulligan:** before committing an action, a player may discard all four cards and draw four replacements, whether or not the old hand had legal actions. Move the crawler **0–3 legal spaces** and optionally mine at its **final location only**, including its current location if it stays put. Normal blocking and bridge rewards apply. This replaces the entire turn; do not draw another card when ending it. Discard recycling may return a card just discarded. A mulligan cannot be cancelled or repeated in the same turn after seeing the new cards.

**Eruption:** the triggering player finishes their action, mining and turn. Later seats finish the same round, so everyone receives equal total turns. Continue the usual pre-turn draw while tiles remain. No extra full lap is awarded. A draw that triggers eruption at the first seat starts a final round for everyone. Stop only after the last seat finishes; do not draw another tile afterward.

## Initial action cards

| Option A                | Option B                                  |
| ----------------------- | ----------------------------------------- |
| Move crawler 3          | Explore with drone 6                      |
| Move crawler 4          | Explore with drone 5                      |
| Move crawler 5          | Explore with drone 4                      |
| Build 2 bridge sections | Move crawler 1                            |
| Build 1 bridge section  | Move crawler 2; may mine at each location |
| Build 1 bridge section  | Explore with drone 4                      |

These six faces come from slide 1 of `CardDeck_v0.1.pptx`. Slide 12 records earlier exploration, so its additional or alternate faces are excluded from the active deck. The deck is fixed at **54 cards**, currently evenly distributed as **nine copies of each of these six types**. Dealing and discard recycling use a random shuffle; replacements are drawn from the deck, not generated from the player's seat or turn number.

## Movement and exploration

### Drone

- Moves in any of the six hex directions and may change direction or double back.
- Reveals every unexplored hex it enters by drawing and placing the next random terrain tile.
- Moving across an already explored hex consumes movement but reveals nothing.
- Displays the active player's colored dots and connecting route line while the path is being traced, matching crawler movement feedback.
- Returns to its crawler after the scouting action; its return path does not consume the printed movement allowance.

### Crawler

- Moves only through explored hexes.
- May traverse plains and mine tiles whether claimed, unclaimed, or exhausted.
- Cannot traverse a canyon unless a bridge has been built across it.
- Cannot enter or cross a volcano.
- May use every base tile unless another crawler occupies it. A crawler cannot move through or finish on another crawler's space; drones may fly across occupied base tiles.
- May stop before using all available movement.

## Mining and scoring

- A crawler that ends its movement on a mine may claim it; claiming is optional.
- Discovering either mine awards 1 point. Revisiting revealed mines awards no discovery points. Drone exploration cannot be undone; revealed terrain and discovery points are permanent.
- A low yield mine accepts two claims: first 3 points, then 2 points, then it is exhausted. The same explorer may claim again on a later visit.
- A high yield mine awards 4 points to the first claimant and is then exhausted.
- Scores and claims should both be visible so playtesters can audit the result.
- Highest score wins. Tie-breaking is not yet specified.

## First-player balance

Equal total turns do not guarantee equal win chances. The ending comparison found different seat preferences for balanced and mixed styles; adjusted uncertainty intervals did not establish a universal balance improvement. See [research summary](docs/research-summary.md).

## Version 0.0 implementation

The current interface provides a player-count-scaled survey board, 2–4 pass-and-play explorers, randomly dealt four-card hands from a fixed 54-card deck, discard reshuffling, a privacy pass screen, crawler positions, connected legal route selection, randomized drone exploration, bridge placement, enforced mine claims and scoring, a configurable development terrain mix, and a finish-the-round eruption ending and optional whole-hand mulligans. It is still a playtest prototype: bridge inventory, richer movement previews, and final tie handling remain to be added.

### Provisional balance defaults

The Current board has 61/91/127 spaces and 2/3/4 safe bases, leaving **59/88/123 explorable spaces**. Add four bag tiles per player, giving **67/100/139 tiles**. Nominal volcano shares are **9%/10%/12%** for 2/3/4 players; round to the nearest tile. Eruption thresholds remain the original rounded 8% of the enlarged bag, **5/8/11**, rather than rising with the volcano count.

| Players | Plain | Canyon | Low mine | High mine | Volcano | Eruption threshold |
|---|---:|---:|---:|---:|---:|---:|
| 2 | 13 | 31 | 10 | 7 | 6 | 5 |
| 3 | 19 | 46 | 15 | 10 | 10 | 8 |
| 4 | 27 | 62 | 20 | 13 | 17 | 11 |

Non-volcano terrain retains relative weights 20:47:15:10 and scales proportionally to the remaining bag slots using largest-remainder rounding. Development sliders edit those relative weights. Alternate boards use their actual explorable area plus four tiles per player and the same formulas; the 5/8/11 thresholds specifically describe Current. Existing terrain shuffle behavior is preserved.

## Remaining design questions

- Tie-breaking beyond shared highest scores.
- Whether bridge inventory should be limited.
- Human playing time, enjoyment and strategy balance under the adopted rules.
- Local save/resume and richer score breakdowns in the playable interface.

## Digital play questions and provisional answers

These defaults borrow the clarity and pacing of polished digital board-game adaptations such as _Ticket to Ride_ and _Wingspan_. They do not copy either game's art or proprietary interface.

1. **How much of the playing area should remain visible?** Initial answer: show the entire board on desktop whenever possible, with restrained zoom and pan controls for smaller screens. Keep player status and the volcano clock fixed around it.
2. **How should players inspect cards?** Initial answer: display the active player's hand as a compact fan or row. Hover, focus, or tap enlarges one card. Selecting a card reveals its two mutually exclusive actions before the player commits.
3. **How should private hands work in pass-and-play?** Initial answer: end each turn with a full-screen “Pass to [player]” privacy curtain. The next player must explicitly reveal their hand. Shared board state remains visible before and after the curtain.
4. **How does the interface show legal moves?** Initial answer: after selecting an action, dim illegal spaces and highlight legal destinations. Preview the route, movement cost, newly explored spaces, mine opportunity, and bridge placement before confirmation.
5. **Should actions resolve immediately?** Initial answer: use a two-step select-and-confirm flow for movement and bridge actions. Allow undo only before confirmation or before a random tile is revealed.
6. **How should drone exploration feel?** Initial answer: the player traces one continuous route up to the printed range. Newly entered spaces reveal sequentially from the bag. The drone then animates back to its crawler without consuming range.
7. **How should board information appear on small screens?** Initial answer: make the board the main viewport, place the hand in a bottom drawer, and move player/mission information into compact top controls. Tapping a tile opens its details without covering the selected route.
8. **How should mining work during crawler movement?** Initial answer: ordinary crawler cards permit mining only at the final space. The special “Crawler 2, may mine at each location” card pauses at each eligible mine with a claim/skip prompt.
9. **How should bridges be placed?** Initial answer: treat each bridge section as a placed connection across one canyon hex edge. The player chooses an explored canyon within five spaces of their crawler and previews each bridge before confirming. This remains provisional because the physical rule is not yet explicit.
10. **How should game information be explained?** Initial answer: use concise contextual tooltips and a collapsible rules reference. Do not interrupt routine turns with tutorials after the first guided game.
11. **How should scoring be presented?** Initial answer: keep scores visible throughout play for the prototype because balance testing benefits from transparency. Add a setting later if hidden scoring becomes desirable.
12. **What should happen when eruption occurs?** Finish the triggering round, then compare scores. Everyone gets equal total turns; there is no extra lap.
13. **How much animation should version 0.0 use?** Initial answer: short functional motion only for card selection, route previews, tile reveals, crawler movement, and the eruption. Add richer art direction after the rules engine stabilizes.
14. **Should a game survive a browser refresh?** Initial answer: save the current local game automatically on the device and offer Resume or New Game. Online accounts and multiplayer synchronization remain out of scope.

## Experimental board variants

The Board variant dropdown starts a fresh game with the selected layout. Reset and crew-size changes preserve that selection. All layouts use the same movement, mining, cards, and terrain percentages; volcano counts and tile bags use each layout's actual explorable area.

- **Current:** player-count-scaled hexagon with one safe starting base per player.
- **Tight Circle:** Current with one outer exploration ring removed.
- **Valley Run:** a straight staggered hex corridor, player count plus one spaces wide, with one safe starting base per player at one end. Length approximates Tight Circle's explorable area.
- **Triangle:** widening rows from one shared corner, with two safe bases for two players or four bases in a U for three/four players. Side length approximates Tight Circle's explorable area.

Changing board or crew discards the current game. These experimental layouts do not yet add playtest logging or replayable seeds.

## Bridge building and rewards

- Build on any revealed, unbridged canyon within five hex spaces of your crawler, measured by hex distance. Terrain between the crawler and canyon does not block building.
- Each bridge keeps its builder’s color and ownership.
- When a confirmed crawler route enters an opponent’s bridge tile, the builder earns 3 credits for each entry, including repeat crossings. Using your own bridge or flying a drone over one awards no credits. Previewing or undoing an unconfirmed route awards no credits.

## Research and verification

The tuned turn clock supersedes the earlier round-based clock. Historical experiments remain separate and retain their captured source; do not rerun old adapters against these new rules or bypass their fingerprint checks.

Research findings and limitations: [docs/research-summary.md](docs/research-summary.md).

Run implementation checks with `node --test scripts/rules/tests.mjs`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
