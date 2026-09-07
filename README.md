# Venus Explorer

Version **0.0** is the first pass-and-play digital prototype of the Venus Explorer board game. Its purpose is to make the core loop playable and observable so that terrain ratios, card balance, movement, scoring, and end-game timing can be tuned before producing a physical edition.

## Premise

Players are coworkers employed by **Veld Mining Company** and deployed to Venus. Each explorer commands a **crawler** (the crew's surface vehicle/base) and a **drone** (the scouting unit). The objective is to discover and mine more valuable resources than the other explorers, then survive until volcanic activity makes the surface untenable. When the final volcano is revealed, the game ends immediately; the explorer with the most points wins.

## Intended format

- Local pass-and-play for 2–4 players; no CPU or AI opponents in this stage.
- Shared information: all explored terrain, claims, bridges, pieces, and scores are visible to everyone.
- A finite hexagonal map radiating outward from a central safe starting area.
- A randomized tile bag and card deck whose contents live in configuration data so ratios and abilities can be tuned without rewriting the rules engine.

## Components

Each player has one crawler, one drone, and claim tokens in their color. Shared components include the hex board, terrain bag, action-card deck, bridges, score track, discard pile, and volcano counter.

### Terrain

| Tile | Effect |
|---|---|
| Start / base | Safe initial crawler position; exact starting geometry is still to be defined. |
| Plain | Explored, traversable terrain with no resource value. |
| Canyon | Blocks crawlers until a bridge spans the canyon. |
| Low-value mine | Worth 1 point per claim; may be claimed by up to three different explorers. |
| High-value mine | Worth 3 points; may be claimed once, after which its resources are exhausted. |
| Volcano | Impassable to crawlers. When the configured final volcano is revealed, the game ends immediately. |

## Setup

1. Select the number of players and assign colors/tokens.
2. Place crawlers on the safe central starting spaces and each player's drone with its crawler.
3. Build and shuffle the terrain bag from the selected terrain ratios.
4. Build and shuffle the action deck.
5. Deal four cards to every player.
6. Randomly determine the first player unless a later rule specifies another method.

## Turn sequence

1. The active player chooses one card from their four-card hand.
2. They choose exactly one of the card's two actions.
3. They resolve that action completely. Unused movement may be forfeited.
4. If their crawler ends on an eligible mine, they may claim/mine it.
5. The played card goes to the discard pile.
6. The player draws back to four cards.
7. Play passes clockwise.

If a volcano revealed during an action reaches the configured eruption threshold, play ends immediately—even if movement or the current turn would otherwise continue.

## Initial action cards

| Option A | Option B |
|---|---|
| Move crawler 3 | Explore with drone 6 |
| Move crawler 4 | Explore with drone 5 |
| Move crawler 5 | Explore with drone 4 |
| Build 2 bridge sections | Move crawler 1 |
| Build 1 bridge section | Move crawler 2; may mine at each location |
| Build 1 bridge section | Explore with drone 4 |

These six faces come from slide 1 of `CardDeck_v0.1.pptx` and define the current deck direction. Slide 12 records earlier exploration, so its additional or alternate faces are excluded from the active deck. The frequency of each current card type remains configurable. “Build a bridge” needs placement and supply rules before it can be fully enforced.

## Movement and exploration

### Drone

- Moves in any of the six hex directions and may change direction or double back.
- Reveals every unexplored hex it enters by drawing and placing the next random terrain tile.
- Moving across an already explored hex consumes movement but reveals nothing.
- Returns to its crawler after the scouting action; its return path does not consume the printed movement allowance.

### Crawler

- Moves only through explored hexes.
- May traverse plains and mine tiles whether claimed, unclaimed, or exhausted.
- Cannot traverse a canyon unless a bridge has been built across it.
- Cannot enter or cross a volcano.
- May stop before using all available movement.

## Mining and scoring

- A crawler that ends its movement on a mine may claim it; claiming is optional.
- A low-value mine awards 1 point and accepts at most three claims, with no more than one claim per explorer unless a later rule says otherwise.
- A high-value mine awards 3 points to the first claimant and is then exhausted.
- Scores and claims should both be visible so playtesters can audit the result.
- Highest score wins. Tie-breaking is not yet specified.

## First-player balance

The first player must create the first useful survey route, while later players may use terrain that is already public. The immediate volcano ending applies equally to all players and avoids granting a compensating final turn. These are intended balancing forces, but playtests should measure them rather than assume they fully remove turn-order advantage.

## Version 0.0 implementation

The current interface provides a shared 37-space survey board, 2–4 pass-and-play explorers, four selectable action cards, randomized terrain revelation, an adjustable-by-code terrain bag, scoring controls, card replacement, and an immediate four-volcano ending. It is an interaction prototype, not yet the complete rules engine: crawler/drone positions, legal pathfinding, bridge placement, mine claim limits, per-player hands, reshuffling, and final tie handling are not enforced yet.

### Provisional balance defaults

The prototype bag currently uses 41 terrain tiles: 16 plains, 7 canyons, 9 low mines, 5 high mines, and 4 volcanoes. The board displays 37 spaces including the starting space, and the fourth volcano ends the game. These are test values—not finalized game rules.

## Decisions needed next

1. Exact board radius, total hex count, and whether the center is one start hex or a ring of player-specific start hexes.
2. Whether drone movement is a single contiguous route and whether it may revisit a hex during one action.
3. What happens when a drone reaches the board edge before spending all movement.
4. Whether a crawler may move through another crawler or share a hex.
5. Bridge placement: placed from the crawler, adjacent to it, from anywhere explored, or as part of movement; one permanent bridge per canyon tile or an edge-spanning bridge between two banks.
6. Whether bridge pieces are limited, shared, owned, and/or worth points.
7. Whether each low mine permits one claim per player and exactly three claims total.
8. Whether mining consumes movement, the whole card action, or no additional action.
9. Set the deck size and number of copies of each approved slide 1 card face.
10. Discard reshuffle behavior and whether players hold private hands in pass-and-play.
11. Tile-bag size/ratios by player count and the eruption threshold for each setup.
12. What occurs if the terrain bag empties before the final volcano appears.
13. Tie-breaker order and whether returning the crawler to safety matters at game end.

## Development direction

The next milestone should separate game configuration from game state, add axial hex coordinates and legal pathfinding, then enforce drone routes, crawler routes, bridges, and mine claims. After that, structured playtest logging can record win rate by seat, points per turn, tiles revealed per drone card, mine availability, bridge usage, and the turn on which eruption occurs.

## Digital play questions and provisional answers

These defaults borrow the clarity and pacing of polished digital board-game adaptations such as *Ticket to Ride* and *Wingspan*. They do not copy either game's art or proprietary interface.

1. **How much of the playing area should remain visible?** Initial answer: show the entire board on desktop whenever possible, with restrained zoom and pan controls for smaller screens. Keep player status and the volcano clock fixed around it.
2. **How should players inspect cards?** Initial answer: display the active player's hand as a compact fan or row. Hover, focus, or tap enlarges one card. Selecting a card reveals its two mutually exclusive actions before the player commits.
3. **How should private hands work in pass-and-play?** Initial answer: end each turn with a full-screen “Pass to [player]” privacy curtain. The next player must explicitly reveal their hand. Shared board state remains visible before and after the curtain.
4. **How does the interface show legal moves?** Initial answer: after selecting an action, dim illegal spaces and highlight legal destinations. Preview the route, movement cost, newly explored spaces, mine opportunity, and bridge placement before confirmation.
5. **Should actions resolve immediately?** Initial answer: use a two-step select-and-confirm flow for movement and bridge actions. Allow undo only before confirmation or before a random tile is revealed.
6. **How should drone exploration feel?** Initial answer: the player traces one continuous route up to the printed range. Newly entered spaces reveal sequentially from the bag. The drone then animates back to its crawler without consuming range.
7. **How should board information appear on small screens?** Initial answer: make the board the main viewport, place the hand in a bottom drawer, and move player/mission information into compact top controls. Tapping a tile opens its details without covering the selected route.
8. **How should mining work during crawler movement?** Initial answer: ordinary crawler cards permit mining only at the final space. The special “Crawler 2, may mine at each location” card pauses at each eligible mine with a claim/skip prompt.
9. **How should bridges be placed?** Initial answer: treat each bridge section as a placed connection across one canyon hex edge. The player chooses an explored canyon adjacent to their crawler and previews each section before confirming. This remains provisional because the physical rule is not yet explicit.
10. **How should game information be explained?** Initial answer: use concise contextual tooltips and a collapsible rules reference. Do not interrupt routine turns with tutorials after the first guided game.
11. **How should scoring be presented?** Initial answer: keep scores visible throughout play for the prototype because balance testing benefits from transparency. Add a setting later if hidden scoring becomes desirable.
12. **What should happen when the eruption ends the game?** Initial answer: stop immediately on the final volcano reveal, show the completed board, then present a scoring breakdown and replay summary. Do not give remaining players a final turn.
13. **How much animation should version 0.0 use?** Initial answer: short functional motion only for card selection, route previews, tile reveals, crawler movement, and the eruption. Add richer art direction after the rules engine stabilizes.
14. **Should a game survive a browser refresh?** Initial answer: save the current local game automatically on the device and offer Resume or New Game. Online accounts and multiplayer synchronization remain out of scope.
