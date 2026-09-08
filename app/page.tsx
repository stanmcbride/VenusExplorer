'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Radio, RotateCcw, TriangleAlert, Undo2 } from 'lucide-react';

type Terrain =
  | 'unknown'
  | 'start'
  | 'plain'
  | 'canyon'
  | 'low'
  | 'high'
  | 'volcano';
type ActionKind = 'crawler' | 'drone' | 'bridge';
type CardAction = {
  kind: ActionKind;
  amount: number;
  mineEnRoute?: boolean;
  label: string;
};
type Card = { id: number; left: CardAction; right: CardAction };
type Tile = {
  terrain: Terrain;
  bridge: boolean;
  lowClaims: number[];
  highClaim: number | null;
};

const cardTypes: Omit<Card, 'id'>[] = [
  {
    left: { kind: 'crawler', amount: 3, label: 'Crawler · 3' },
    right: { kind: 'drone', amount: 6, label: 'Drone · 6' },
  },
  {
    left: { kind: 'crawler', amount: 4, label: 'Crawler · 4' },
    right: { kind: 'drone', amount: 5, label: 'Drone · 5' },
  },
  {
    left: { kind: 'crawler', amount: 5, label: 'Crawler · 5' },
    right: { kind: 'drone', amount: 4, label: 'Drone · 4' },
  },
  {
    left: { kind: 'bridge', amount: 2, label: 'Build · 2 bridges' },
    right: { kind: 'crawler', amount: 1, label: 'Crawler · 1' },
  },
  {
    left: { kind: 'bridge', amount: 1, label: 'Build · 1 bridge' },
    right: {
      kind: 'crawler',
      amount: 2,
      mineEnRoute: true,
      label: 'Crawler · 2 + mine en route',
    },
  },
  {
    left: { kind: 'bridge', amount: 1, label: 'Build · 1 bridge' },
    right: { kind: 'drone', amount: 4, label: 'Drone · 4' },
  },
];
const colors = ['#ffe08a', '#79d2a6', '#82b9ff', '#ef91b8'];
const playerNames = ['Astra', 'Beacon', 'Cosmo', 'Dawn'];
const terrainLabel: Record<Terrain, string> = {
  unknown: 'Unexplored',
  start: 'Base',
  plain: 'Plain',
  canyon: 'Canyon',
  low: 'Low mine',
  high: 'High mine',
  volcano: 'Volcano',
};
const terrainMark: Record<Terrain, string> = {
  unknown: '?',
  start: 'BASE',
  plain: '',
  canyon: 'C',
  low: 'L',
  high: 'H',
  volcano: '!',
};
const hexSize = 42;
const baseRingCoordinates = [
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
];

function makeHexes(radius: number) {
  return Array.from({ length: radius * 2 + 1 }, (_, q) => q - radius).flatMap(
    (q) =>
      Array.from({ length: radius * 2 + 1 }, (_, r) => r - radius)
        .filter(
          (r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= radius,
        )
        .map((r) => ({ q, r })),
  );
}
function hexCenter(q: number, r: number) {
  return { x: hexSize * Math.sqrt(3) * (q + r / 2), y: hexSize * 1.5 * r };
}
function hexPoints(x: number, y: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${x + hexSize * Math.cos(a)},${y + hexSize * Math.sin(a)}`;
  }).join(' ');
}
function shuffledBag(radius: number) {
  const spaces = 1 + 3 * radius * (radius + 1) - 7,
    safeTiles = spaces - 4;
  const plains = Math.round((safeTiles * 16) / 37),
    canyons = Math.round((safeTiles * 7) / 37),
    lows = Math.round((safeTiles * 9) / 37),
    highs = safeTiles - plains - canyons - lows;
  return (
    [
      ...Array(plains).fill('plain'),
      ...Array(canyons).fill('canyon'),
      ...Array(lows).fill('low'),
      ...Array(highs).fill('high'),
      ...Array(4).fill('volcano'),
    ] as Terrain[]
  ).sort(() => Math.random() - 0.5);
}
function makeBoard(radius: number): Tile[] {
  return makeHexes(radius).map(({ q, r }) => ({
    terrain:
      Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= 1
        ? 'start'
        : 'unknown',
    bridge: false,
    lowClaims: [],
    highClaim: null,
  }));
}
function makeCard(seed: number, offset: number): Card {
  return {
    ...cardTypes[(seed + offset) % cardTypes.length],
    id: seed * 100 + offset,
  };
}
function makeHands(players: number): Card[][] {
  return Array.from({ length: players }, (_, p) =>
    Array.from({ length: 4 }, (_, i) => makeCard(p * 2, i)),
  );
}
function coordinateIndex(
  hexes: { q: number; r: number }[],
  q: number,
  r: number,
) {
  return hexes.findIndex((hex) => hex.q === q && hex.r === r);
}
function startingCoordinates(players: number) {
  return Array.from(
    { length: players },
    (_, player) => baseRingCoordinates[Math.floor((player * 6) / players)],
  );
}
function adjacent(a: { q: number; r: number }, b: { q: number; r: number }) {
  return (
    Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(-a.q - a.r - (-b.q - b.r)),
    ) === 1
  );
}

export default function Home() {
  const [players, setPlayers] = useState(3),
    [active, setActive] = useState(0),
    [turn, setTurn] = useState(1);
  const totalRadius = players + 2,
    explorationRings = players + 1;
  const hexes = useMemo(() => makeHexes(totalRadius), [totalRadius]);
  const boardViewBox = useMemo(() => {
    const halfWidth = hexSize * Math.sqrt(3) * (totalRadius + 0.55),
      halfHeight = hexSize * (1.5 * totalRadius + 1);
    return `${-halfWidth} ${-halfHeight} ${halfWidth * 2} ${halfHeight * 2}`;
  }, [totalRadius]);
  const [board, setBoard] = useState<Tile[]>(() => makeBoard(5)),
    [bag, setBag] = useState<Terrain[]>(() => shuffledBag(5)),
    [hands, setHands] = useState<Card[][]>(() => makeHands(3));
  const [crawlerPositions, setCrawlerPositions] = useState<number[]>(() => {
    const initialHexes = makeHexes(5);
    return startingCoordinates(3).map(({ q, r }) =>
      coordinateIndex(initialHexes, q, r),
    );
  });
  const [selectedCard, setSelectedCard] = useState<number | null>(null),
    [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null),
    [path, setPath] = useState<number[]>([]),
    [placedBridges, setPlacedBridges] = useState<number[]>([]),
    [actionResolved, setActionResolved] = useState(false),
    [claimable, setClaimable] = useState<number[]>([]),
    [scores, setScores] = useState([0, 0, 0, 0]);
  const selected =
    selectedCard === null
      ? null
      : (hands[active]?.find((card) => card.id === selectedCard) ?? null);
  const action = selected && selectedSide ? selected[selectedSide] : null;
  const volcanoes = board.filter((tile) => tile.terrain === 'volcano').length,
    gameOver = volcanoes >= 4,
    explored = board.filter((tile) => tile.terrain !== 'unknown').length,
    stepsUsed = Math.max(0, path.length - 1);
  const status = gameOver
    ? 'Mission ended — compare scores.'
    : `${playerNames[active]}'s turn`;
  const crawlerRoutePoints =
    action?.kind === 'crawler'
      ? path
          .map((index) => {
            const point = hexCenter(hexes[index].q, hexes[index].r);
            return `${point.x},${point.y}`;
          })
          .join(' ')
      : '';

  function clearAction(cardId: number | null = selectedCard) {
    setSelectedCard(cardId);
    setSelectedSide(null);
    setPath([]);
    setPlacedBridges([]);
    setActionResolved(false);
    setClaimable([]);
  }
  function chooseCard(cardId: number) {
    clearAction(cardId);
  }
  function chooseSide(side: 'left' | 'right', card: Card) {
    const next = card[side];
    setSelectedCard(card.id);
    setSelectedSide(side);
    setPath(
      next.kind === 'crawler' || next.kind === 'drone'
        ? [crawlerPositions[active]]
        : [],
    );
    setPlacedBridges([]);
    setActionResolved(false);
    setClaimable([]);
  }
  function revealTile(index: number) {
    if (board[index].terrain !== 'unknown' || !bag.length) return;
    const terrain = bag[0];
    setBoard((current) =>
      current.map((tile, i) => (i === index ? { ...tile, terrain } : tile)),
    );
    setBag((current) => current.slice(1));
  }
  function tileIsLegal(index: number) {
    if (!action || actionResolved || gameOver) return false;
    if (action.kind === 'bridge')
      return (
        board[index].terrain === 'canyon' &&
        !board[index].bridge &&
        adjacent(hexes[crawlerPositions[active]], hexes[index]) &&
        !placedBridges.includes(index) &&
        placedBridges.length < action.amount
      );
    if (
      !path.length ||
      stepsUsed >= action.amount ||
      !adjacent(hexes[path[path.length - 1]], hexes[index])
    )
      return false;
    if (action.kind === 'drone') return true;
    const terrain = board[index].terrain;
    return (
      terrain !== 'unknown' &&
      terrain !== 'volcano' &&
      (terrain !== 'canyon' || board[index].bridge) &&
      !crawlerPositions.some(
        (position, player) => player !== active && position === index,
      )
    );
  }
  function handleTile(index: number) {
    if (!tileIsLegal(index) || !action) return;
    if (action.kind === 'bridge') {
      setPlacedBridges((current) => [...current, index]);
      return;
    }
    setPath((current) => [...current, index]);
    if (action.kind === 'drone') revealTile(index);
  }
  function undoStep() {
    if (!action || actionResolved) return;
    if (action.kind === 'crawler')
      setPath((current) =>
        current.length > 1 ? current.slice(0, -1) : current,
      );
    if (action.kind === 'bridge')
      setPlacedBridges((current) => current.slice(0, -1));
  }
  function resolveAction() {
    if (
      !action ||
      gameOver ||
      actionResolved ||
      (action.kind !== 'bridge' && stepsUsed === 0) ||
      (action.kind === 'bridge' && placedBridges.length === 0)
    )
      return;
    if (action.kind === 'bridge')
      setBoard((current) =>
        current.map((tile, i) =>
          placedBridges.includes(i) ? { ...tile, bridge: true } : tile,
        ),
      );
    if (action.kind === 'crawler') {
      const destination = path[path.length - 1];
      setCrawlerPositions((current) =>
        current.map((position, player) =>
          player === active ? destination : position,
        ),
      );
      const possible = (
        action.mineEnRoute ? path.slice(1) : [destination]
      ).filter((index) => {
        const tile = board[index];
        return (
          (tile.terrain === 'low' &&
            !tile.lowClaims.includes(active) &&
            tile.lowClaims.length < 3) ||
          (tile.terrain === 'high' && tile.highClaim === null)
        );
      });
      setClaimable([...new Set(possible)]);
    }
    setActionResolved(true);
  }
  function claimMine(index: number) {
    if (!actionResolved || !claimable.includes(index) || gameOver) return;
    const terrain = board[index].terrain,
      points = terrain === 'high' ? 3 : 1;
    setBoard((current) =>
      current.map((tile, i) =>
        i !== index
          ? tile
          : terrain === 'high'
            ? { ...tile, highClaim: active }
            : { ...tile, lowClaims: [...tile.lowClaims, active] },
      ),
    );
    setScores((current) =>
      current.map((score, player) =>
        player === active ? score + points : score,
      ),
    );
    setClaimable((current) =>
      current.filter((candidate) => candidate !== index),
    );
  }
  function endTurn() {
    if (!selected || !actionResolved || gameOver) return;
    const replacement = makeCard(turn + active + 4, 0);
    setHands((current) =>
      current.map((hand, player) =>
        player === active
          ? hand.map((card) => (card.id === selected.id ? replacement : card))
          : hand,
      ),
    );
    setActive((active + 1) % players);
    setTurn((value) => value + 1);
    clearAction(null);
  }
  function setupGame(count: number) {
    const radius = count + 2,
      nextHexes = makeHexes(radius);
    setPlayers(count);
    setActive(0);
    setTurn(1);
    setBoard(makeBoard(radius));
    setBag(shuffledBag(radius));
    setHands(makeHands(count));
    setCrawlerPositions(
      startingCoordinates(count).map(({ q, r }) =>
        coordinateIndex(nextHexes, q, r),
      ),
    );
    setScores([0, 0, 0, 0]);
    clearAction(null);
  }
  useEffect(() => {
    type ToolContext = {
      registerTool: (
        tool: Record<string, unknown>,
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_new_game',
          title: 'Start a new Venus Explorer game',
          description:
            'Reset the visible game and set the pass-and-play crew size.',
          inputSchema: {
            type: 'object',
            properties: {
              playerCount: { type: 'integer', minimum: 2, maximum: 4 },
            },
            required: ['playerCount'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input: unknown) => {
            const value = (input as { playerCount?: unknown }).playerCount;
            if (
              !Number.isInteger(value) ||
              Number(value) < 2 ||
              Number(value) > 4
            )
              throw new Error('playerCount must be 2, 3, or 4');
            setupGame(Number(value));
            return {
              status: 'ready',
              playerCount: value,
              explorationRings: Number(value) + 1,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  const instructions = !selected
    ? 'Choose one card from your hand.'
    : !selectedSide
      ? 'Choose the left or right action.'
      : actionResolved
        ? claimable.length
          ? 'Claim any eligible mine, or finish the turn.'
          : 'Action complete. Finish the turn.'
        : action?.kind === 'bridge'
          ? `Choose up to ${action.amount} adjacent canyon ${action.amount === 1 ? 'tile' : 'tiles'}.`
          : `Trace a connected ${action?.kind} route of up to ${action?.amount} spaces.`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#11100f]/90 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-mark">V</div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                VENUS EXPLORER
              </h1>
              <p className="text-xs uppercase tracking-[.18em] text-[#bdb5a8]">
                Veld Mining Company · v0.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="status-dot" />
            {status}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setupGame(players)}
            >
              <RotateCcw />
              Reset
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-[1500px] items-start gap-4 p-4 md:p-7 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="panel order-2 xl:order-1">
          <p className="eyebrow">Crew manifest</p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={players === n ? 'default' : 'outline'}
                onClick={() => setupGame(n)}
              >
                {n} players
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {playerNames.slice(0, players).map((name, i) => (
              <div
                key={name}
                className={`crew ${i === active ? 'active' : ''}`}
              >
                <span
                  className="crew-color"
                  style={{ background: colors[i] }}
                />
                <div className="flex-1">
                  <strong>{name}</strong>
                  <small>
                    {i === active ? 'Active explorer' : 'Standing by'}
                  </small>
                </div>
                <b>{scores[i]}</b>
              </div>
            ))}
          </div>
          <div className="divider" />
          <p className="eyebrow">Mission clock</p>
          <div className="volcano-track">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < volcanoes ? 'lit' : ''}>
                <TriangleAlert />
              </span>
            ))}
          </div>
          <p className="muted">
            The fourth volcano ends the mission immediately.
          </p>
          <div className="stat-row">
            <span>Turn</span>
            <b>{turn}</b>
          </div>
          <div className="stat-row">
            <span>Exploration rings</span>
            <b>{explorationRings}</b>
          </div>
          <div className="stat-row">
            <span>Mapped</span>
            <b>
              {explored} / {board.length}
            </b>
          </div>
          <div className="stat-row">
            <span>Tiles left</span>
            <b>{bag.length}</b>
          </div>
        </aside>
        <div className="play-column order-1 xl:order-2">
          <section className="board-shell" aria-label="Venus exploration board">
            <div className="board-heading">
              <div>
                <p className="eyebrow">Ishtar Terra sector</p>
                <h2>Shared survey map</h2>
              </div>
              <div className="legend">
                <span>
                  <i className="plain" />
                  Plain
                </span>
                <span>
                  <i className="low" />
                  Low
                </span>
                <span>
                  <i className="high" />
                  High
                </span>
                <span>
                  <i className="canyon" />
                  Canyon
                </span>
              </div>
            </div>
            <svg
              className="hex-grid"
              viewBox={boardViewBox}
              aria-label={`${board.length} connected hexagonal spaces`}
            >
              {board.map((tile, i) => {
                const { x, y } = hexCenter(hexes[i].q, hexes[i].r),
                  enabled = tileIsLegal(i),
                  bridgePreview = placedBridges.includes(i),
                  occupants = crawlerPositions
                    .map((position, player) =>
                      position === i && player < players ? player : -1,
                    )
                    .filter((player) => player >= 0),
                  claimCount =
                    tile.terrain === 'low'
                      ? tile.lowClaims.length
                      : tile.highClaim === null
                        ? 0
                        : 1;
                return (
                  <g
                    key={i}
                    className={`hex ${tile.terrain} ${tile.bridge || bridgePreview ? 'bridged' : ''} ${enabled ? 'enabled' : ''}`}
                    tabIndex={enabled ? 0 : -1}
                    aria-disabled={!enabled}
                    aria-label={`${terrainLabel[tile.terrain]} sector ${i + 1}`}
                    onClick={() => handleTile(i)}
                    onKeyDown={(e) => {
                      if (enabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleTile(i);
                      }
                    }}
                  >
                    <polygon points={hexPoints(x, y)} />
                    {terrainMark[tile.terrain] && (
                      <text
                        x={x}
                        y={y - (occupants.length ? 10 : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {terrainMark[tile.terrain]}
                      </text>
                    )}
                    {(tile.bridge || bridgePreview) && (
                      <text
                        className="bridge-mark"
                        x={x}
                        y={y + 12}
                        textAnchor="middle"
                      >
                        ═
                      </text>
                    )}
                    {occupants.map((player, offset) => (
                      <circle
                        key={player}
                        className="crawler-token"
                        cx={x - (occupants.length - 1) * 7 + offset * 14}
                        cy={y + 21}
                        r="7"
                        fill={colors[player]}
                      />
                    ))}
                    {claimCount > 0 && (
                      <text
                        className="claim-mark"
                        x={x + 23}
                        y={y - 18}
                        textAnchor="middle"
                      >
                        ◆{claimCount}
                      </text>
                    )}
                  </g>
                );
              })}
              {action?.kind === 'crawler' && path.length > 0 && (
                <g className="crawler-route-overlay" aria-hidden="true">
                  {path.length > 1 && (
                    <polyline
                      points={crawlerRoutePoints}
                      fill="none"
                      stroke={colors[active]}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {path.map((index, step) => {
                    const point = hexCenter(hexes[index].q, hexes[index].r);
                    return (
                      <circle
                        key={`${index}-${step}`}
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        fill={colors[active]}
                        stroke="#17110a"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </g>
              )}
            </svg>
            <p className="board-note">
              <Radio />
              {instructions}
            </p>
          </section>
          <aside className="panel hand-panel">
            <p className="eyebrow">
              {playerNames[active]}’s hand · choose one card
            </p>
            <div className="hand-cards">
              {hands[active]?.map((card) => (
                <div
                  key={card.id}
                  className={`action-card ${selectedCard === card.id ? 'selected' : ''}`}
                >
                  <button
                    onClick={() => chooseCard(card.id)}
                    aria-label={`Select card: ${card.left.label} or ${card.right.label}`}
                    className="card-select-overlay"
                  />
                  <button
                    className={`card-half ${selectedCard === card.id && selectedSide === 'left' ? 'chosen' : ''}`}
                    onClick={() => chooseSide('left', card)}
                  >
                    {card.left.label}
                  </button>
                  <em>OR</em>
                  <button
                    className={`card-half right ${selectedCard === card.id && selectedSide === 'right' ? 'chosen' : ''}`}
                    onClick={() => chooseSide('right', card)}
                  >
                    {card.right.label}
                  </button>
                </div>
              ))}
            </div>
            <div className="action-status">
              <strong>{action ? action.label : 'Awaiting command'}</strong>
              <span>
                {action
                  ? `${action.kind === 'bridge' ? placedBridges.length : stepsUsed} / ${action.amount} ${action.kind === 'bridge' ? 'placed' : 'spaces'}`
                  : instructions}
              </span>
            </div>
            {!actionResolved && action && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={
                    action.kind === 'drone' ||
                    (action.kind === 'crawler'
                      ? stepsUsed === 0
                      : placedBridges.length === 0)
                  }
                  onClick={undoStep}
                >
                  <Undo2 />
                  Undo
                </Button>
                <Button
                  disabled={
                    action.kind === 'crawler' || action.kind === 'drone'
                      ? stepsUsed === 0
                      : placedBridges.length === 0
                  }
                  onClick={resolveAction}
                >
                  Resolve action
                </Button>
              </div>
            )}
            {actionResolved && claimable.length > 0 && (
              <div className="claim-panel">
                <p className="eyebrow">Eligible mine claims</p>
                {claimable.map((index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    onClick={() => claimMine(index)}
                  >
                    Claim {terrainLabel[board[index].terrain]} +
                    {board[index].terrain === 'high' ? 3 : 1}
                  </Button>
                ))}
              </div>
            )}
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!actionResolved || gameOver}
              onClick={endTurn}
            >
              Finish turn &amp; pass
            </Button>
            <p className="muted mt-3">
              Crawler routes use mapped, passable spaces. Drone routes reveal
              adjacent spaces. Bridges open adjacent canyons. Mine limits and
              scores are enforced automatically.
            </p>
            {gameOver && (
              <div className="end-state">
                <TriangleAlert />
                <strong>Surface evacuation triggered</strong>
                <span>Highest score wins.</span>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
