'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  bridgeOwner: number | null;
  lowClaims: number[];
  highClaim: number | null;
};
function miningPoints(tile: Tile) {
  if (tile.terrain === 'high') return tile.highClaim === null ? 3 : 0;
  if (tile.terrain === 'low') return [2, 1][tile.lowClaims.length] ?? 0;
  return 0;
}

function bridgeDistance(a: { q: number; r: number }, b: { q: number; r: number }) {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
}
function bridgeCredits(board: Tile[], path: number[], active: number, playerCount: number) {
  const credits = Array(playerCount).fill(0) as number[];
  for (const index of path.slice(1)) {
    const tile = board[index];
    if (tile.bridge && tile.bridgeOwner != null && tile.bridgeOwner !== active) credits[tile.bridgeOwner] += 1;
  }
  return credits;
}

type TileMix = Record<'plain' | 'canyon' | 'low' | 'high', number>;

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
  low: 'Low yield mine',
  high: 'High yield mine',
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
const defaultTileMix: TileMix = { plain: 30, canyon: 25, low: 25, high: 12 };
const adjustableTerrains = ['plain', 'canyon', 'low', 'high'] as const;
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
type BoardVariant = 'current' | 'tight' | 'valley' | 'triangle';
const boardVariants: Record<BoardVariant, string> = {
  current: 'Current',
  tight: 'Tight Circle',
  valley: 'Valley Run',
  triangle: 'Triangle',
};
function makeLayout(players: number, variant: BoardVariant) {
  const radius = players + (variant === 'current' ? 2 : 1);
  const target = 1 + 3 * radius * (radius + 1) - 7;
  let hexes: { q: number; r: number }[];
  let starts: { q: number; r: number }[];
  let isBase: (q: number, r: number) => boolean;
  let description: string;
  if (variant === 'valley') {
    const width = players + 1;
    const length = Math.round(target / width) + 1;
    hexes = Array.from({ length }, (_, r) =>
      Array.from({ length: width }, (_, col) => ({
        q: col - Math.floor(r / 2),
        r,
      })),
    ).flat();
    starts = Array.from({ length: players }, (_, q) => ({ q: q + 1, r: 0 }));
    isBase = (q, r) => starts.some((start) => start.q === q && start.r === r);
    description = width + ' wide × ' + length + ' rows · shared starting end';
  } else if (variant === 'triangle') {
    const side = Math.round((Math.sqrt(1 + 8 * (target + 6)) - 1) / 2);
    hexes = Array.from({ length: side }, (_, r) =>
      Array.from({ length: r + 1 }, (_, q) => ({ q: q - r, r })),
    ).flat();
    const bases = players >= 3
      ? [
          { q: -1, r: 1 },
          { q: 0, r: 1 },
          { q: -2, r: 2 },
          { q: 0, r: 2 },
        ]
      : [{ q: -1, r: 1 }, { q: 0, r: 1 }];
    starts = bases.slice(0, players);
    isBase = (q, r) => bases.some((base) => base.q === q && base.r === r);
    description = side + ' rows · ' + bases.length + (players >= 3 ? ' bases in a U' : ' starting bases');
  } else {
    hexes = makeHexes(radius);
    starts = startingCoordinates(players);
    isBase = (q, r) => starts.some((start) => start.q === q && start.r === r);
    description = radius + ' rings · ' + players + ' starting bases';
  }
  return {
    hexes,
    starts,
    isBase,
    description,
    spaces: hexes.filter(({ q, r }) => !isBase(q, r)).length,
  };
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
function terrainCounts(spaces: number, mix: TileMix) {
  const volcano = Math.max(1, Math.round(spaces * 0.08));
  const adjustableSpaces = spaces - volcano;
  const weighted = adjustableTerrains.map((terrain) => ({
    terrain,
    raw: (adjustableSpaces * mix[terrain]) / 92,
  }));
  const counts = Object.fromEntries(
    weighted.map(({ terrain, raw }) => [terrain, Math.floor(raw)]),
  ) as TileMix;
  let remainder =
    adjustableSpaces -
    adjustableTerrains.reduce((sum, terrain) => sum + counts[terrain], 0);
  [...weighted]
    .sort((a, b) => b.raw - Math.floor(b.raw) - (a.raw - Math.floor(a.raw)))
    .forEach(({ terrain }) => {
      if (remainder > 0) {
        counts[terrain] += 1;
        remainder -= 1;
      }
    });
  return { ...counts, volcano };
}
function shuffledBag(spaces: number, mix: TileMix = defaultTileMix) {
  const counts = terrainCounts(spaces, mix);
  return (
    [
      ...Array(counts.plain).fill('plain'),
      ...Array(counts.canyon).fill('canyon'),
      ...Array(counts.low).fill('low'),
      ...Array(counts.high).fill('high'),
      ...Array(counts.volcano).fill('volcano'),
    ] as Terrain[]
  ).sort(() => Math.random() - 0.5);
}
function makeBoard(layout: ReturnType<typeof makeLayout>): Tile[] {
  return layout.hexes.map(({ q, r }) => ({
    terrain: layout.isBase(q, r) ? 'start' : 'unknown',
    bridge: false,
    bridgeOwner: null,
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
  const [variant, setVariant] = useState<BoardVariant>('current');
  const layout = useMemo(
    () => makeLayout(players, variant),
    [players, variant],
  );
  const hexes = layout.hexes;
  const boardViewBox = useMemo(() => {
    const centers = hexes.map(({ q, r }) => hexCenter(q, r));
    const minX = Math.min(...centers.map((p) => p.x)) - hexSize;
    const maxX = Math.max(...centers.map((p) => p.x)) + hexSize;
    const minY = Math.min(...centers.map((p) => p.y)) - hexSize;
    const maxY = Math.max(...centers.map((p) => p.y)) + hexSize;
    return [minX, minY, maxX - minX, maxY - minY].join(' ');
  }, [hexes]);
  const [tileMix, setTileMix] = useState<TileMix>(defaultTileMix);
  const [board, setBoard] = useState<Tile[]>(() =>
      makeBoard(makeLayout(3, 'current')),
    ),
    [bag, setBag] = useState<Terrain[]>(() =>
      shuffledBag(makeLayout(3, 'current').spaces, defaultTileMix),
    ),
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
    [droneDraws, setDroneDraws] = useState<(Terrain | null)[]>([]),
    [placedBridges, setPlacedBridges] = useState<number[]>([]),
    [boardTouched, setBoardTouched] = useState(false),
    [actionResolved, setActionResolved] = useState(false),
    [claimable, setClaimable] = useState<number[]>([]),
    [claimDialogOpen, setClaimDialogOpen] = useState(false),
    [passScreen, setPassScreen] = useState(false),
    [scores, setScores] = useState([0, 0, 0, 0]);
  const selected =
    selectedCard === null
      ? null
      : (hands[active]?.find((card) => card.id === selectedCard) ?? null);
  const action = selected && selectedSide ? selected[selectedSide] : null;
  const currentCounts = terrainCounts(layout.spaces, tileMix);
  const volcanoTarget = currentCounts.volcano;
  const volcanoes = board.filter((tile) => tile.terrain === 'volcano').length,
    gameOver = volcanoes >= volcanoTarget,
    explored = board.filter((tile) => tile.terrain !== 'unknown').length,
    stepsUsed = Math.max(0, path.length - 1);
  const status = gameOver
    ? 'Mission ended — compare scores.'
    : `${playerNames[active]}'s turn`;
  const routePoints =
    action?.kind === 'crawler' || action?.kind === 'drone'
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
    setDroneDraws([]);
    setPlacedBridges([]);
    setBoardTouched(false);
    setActionResolved(false);
    setClaimable([]);
    setClaimDialogOpen(false);
  }
  function chooseCard(cardId: number) {
    if (boardTouched) return;
    clearAction(cardId);
  }
  function chooseSide(side: 'left' | 'right', card: Card) {
    if (boardTouched) return;
    const next = card[side];
    setSelectedCard(card.id);
    setSelectedSide(side);
    setPath(
      next.kind === 'crawler' || next.kind === 'drone'
        ? [crawlerPositions[active]]
        : [],
    );
    setPlacedBridges([]);
    setDroneDraws([]);
    setActionResolved(false);
    setClaimable([]);
  }
  function tileIsLegal(index: number) {
    if (!action || actionResolved || gameOver) return false;
    if (action.kind === 'bridge')
      return (
        board[index].terrain === 'canyon' &&
        !board[index].bridge &&
        bridgeDistance(hexes[crawlerPositions[active]], hexes[index]) <= 5 &&
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
    setBoardTouched(true);
    if (action.kind === 'bridge') {
      setPlacedBridges((current) => [...current, index]);
      return;
    }
    setPath((current) => [...current, index]);
    if (action.kind === 'drone') {
      const terrain =
        board[index].terrain === 'unknown' && bag.length ? bag[0] : null;
      setDroneDraws((current) => [...current, terrain]);
      if (terrain) {
        setBoard((current) =>
          current.map((tile, i) => (i === index ? { ...tile, terrain } : tile)),
        );
        setBag((current) => current.slice(1));
        if (terrain === 'low' || terrain === 'high') {
          setScores((current) => current.map((score, player) => player === active ? score + 1 : score));
        }
      }
    }
  }
  function undoStep() {
    if (!action || actionResolved) return;
    if (action.kind === 'crawler')
      setPath((current) =>
        current.length > 1 ? current.slice(0, -1) : current,
      );
    if (action.kind === 'drone' && path.length > 1) {
      const destination = path[path.length - 1];
      const terrain = droneDraws[droneDraws.length - 1];
      setPath((current) => current.slice(0, -1));
      setDroneDraws((current) => current.slice(0, -1));
      if (terrain) {
        setBoard((current) =>
          current.map((tile, index) =>
            index === destination ? { ...tile, terrain: 'unknown' } : tile,
          ),
        );
        setBag((current) => [terrain, ...current]);
        if (terrain === 'low' || terrain === 'high') {
          setScores((current) => current.map((score, player) => player === active ? score - 1 : score));
        }
      }
    }
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
          placedBridges.includes(i) ? { ...tile, bridge: true, bridgeOwner: active } : tile,
        ),
      );
    if (action.kind === 'crawler') {
      const credits = bridgeCredits(board, path, active, scores.length);
      setScores((current) => current.map((score, player) => score + credits[player]));
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
          (tile.terrain === 'low' && tile.lowClaims.length < 2) ||
          (tile.terrain === 'high' && tile.highClaim === null)
        );
      });
      const eligibleMines = [...new Set(possible)];
      setClaimable(eligibleMines);
      setClaimDialogOpen(eligibleMines.length > 0);
    }
    setActionResolved(true);
  }
  function claimMine(index: number) {
    if (!actionResolved || !claimable.includes(index) || gameOver) return;
    const terrain = board[index].terrain,
      points = miningPoints(board[index]);
    if (points === 0) return;
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
    if (claimable.length === 1) setClaimDialogOpen(false);
  }
  function skipMining() {
    setClaimable([]);
    setClaimDialogOpen(false);
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
    setPassScreen(true);
  }
  function setupGame(count: number, nextVariant: BoardVariant = variant) {
    const nextLayout = makeLayout(count, nextVariant);
    const nextHexes = nextLayout.hexes;
    setVariant(nextVariant);
    setPlayers(count);
    setActive(0);
    setTurn(1);
    setBoard(makeBoard(nextLayout));
    setBag(shuffledBag(nextLayout.spaces, tileMix));
    setHands(makeHands(count));
    setCrawlerPositions(
      nextLayout.starts.map(({ q, r }) => coordinateIndex(nextHexes, q, r)),
    );
    setScores([0, 0, 0, 0]);
    clearAction(null);
    setPassScreen(false);
  }
  function updateTileMix(changed: keyof TileMix, value: number) {
    const nextValue = Math.max(0, Math.min(92, value));
    const others = adjustableTerrains.filter((terrain) => terrain !== changed);
    const remaining = 92 - nextValue;
    const previousTotal = others.reduce(
      (sum, terrain) => sum + tileMix[terrain],
      0,
    );
    const weighted = others.map((terrain) => {
      const raw = previousTotal
        ? (remaining * tileMix[terrain]) / previousTotal
        : remaining / others.length;
      return { terrain, raw, value: Math.floor(raw) };
    });
    let extras =
      remaining - weighted.reduce((sum, item) => sum + item.value, 0);
    [...weighted]
      .sort((a, b) => b.raw - b.value - (a.raw - a.value))
      .forEach((item) => {
        if (extras > 0) {
          item.value += 1;
          extras -= 1;
        }
      });
    setTileMix({
      ...tileMix,
      [changed]: nextValue,
      ...Object.fromEntries(weighted.map((item) => [item.terrain, item.value])),
    });
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
              boardVariant: {
                type: 'string',
                enum: Object.keys(boardVariants),
              },
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
            const count = Number(value);
            const requestedVariant =
              (input as { boardVariant?: BoardVariant }).boardVariant ??
              variant;
            if (!Object.hasOwn(boardVariants, requestedVariant))
              throw new Error('Invalid board variant');
            const nextLayout = makeLayout(count, requestedVariant);
            const nextHexes = nextLayout.hexes;
            setVariant(requestedVariant);
            setPlayers(count);
            setActive(0);
            setTurn(1);
            setTileMix(defaultTileMix);
            setBoard(makeBoard(nextLayout));
            setBag(shuffledBag(nextLayout.spaces, defaultTileMix));
            setHands(makeHands(count));
            setCrawlerPositions(
              nextLayout.starts.map(({ q, r }) =>
                coordinateIndex(nextHexes, q, r),
              ),
            );
            setScores([0, 0, 0, 0]);
            setSelectedCard(null);
            setSelectedSide(null);
            setPath([]);
            setDroneDraws([]);
            setPlacedBridges([]);
            setBoardTouched(false);
            setActionResolved(false);
            setClaimable([]);
            setClaimDialogOpen(false);
            setPassScreen(false);
            return {
              status: 'ready',
              playerCount: value,
              boardVariant: requestedVariant,
              explorableTiles: nextLayout.spaces,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [variant]);

  const instructions = !selected
    ? 'Choose one card from your hand.'
    : !selectedSide
      ? 'Choose the left or right action.'
      : actionResolved
        ? claimable.length
          ? 'Claim any eligible mine, or finish the turn.'
          : 'Action complete. Finish the turn.'
        : action?.kind === 'bridge'
          ? `Choose up to ${action.amount} revealed canyon ${action.amount === 1 ? 'tile' : 'tiles'} within 5 spaces of your crawler.`
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
          <label className="eyebrow" htmlFor="board-variant">
            Board variant
          </label>
          <select
            id="board-variant"
            value={variant}
            onChange={(event) =>
              setupGame(players, event.target.value as BoardVariant)
            }
            className="my-2 w-full rounded-md border border-white/20 bg-[#211d18] p-2 text-sm text-white"
          >
            {Object.entries(boardVariants).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="muted">
            {layout.description}. Changing the board or crew starts a new game.
          </p>
          <div className="divider" />
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
          <section aria-labelledby="objectives-heading">
            <h2 id="objectives-heading" className="eyebrow">Objectives</h2>
            <div className="stat-row">
              <span>Mine Discovery</span>
              <b className="whitespace-nowrap">1 Credit</b>
            </div>
            <div className="stat-row">
              <span>Low Yield Mine First Dig</span>
              <b className="whitespace-nowrap">2 Credits</b>
            </div>
            <div className="stat-row">
              <span>Low Yield Mine 2nd Dig</span>
              <b className="whitespace-nowrap">1 Credit</b>
            </div>
            <div className="stat-row">
              <span>High Yield Mine</span>
              <b className="whitespace-nowrap">3 Credits</b>
            </div>
            <div className="stat-row">
              <span>Opponent Crosses Your Bridge</span>
              <b className="whitespace-nowrap">1 Credit</b>
            </div>
          </section>
          <div className="divider" />
          <p className="eyebrow">Mission clock</p>
          <div className="volcano-track">
            {Array.from({ length: volcanoTarget }, (_, i) => (
              <span key={i} className={i < volcanoes ? 'lit' : ''}>
                <TriangleAlert />
              </span>
            ))}
          </div>
          <p className="muted">
            The final volcano ends the mission immediately. This board uses the
            8% guideline: {volcanoTarget} volcano tiles.
          </p>
          <div className="stat-row">
            <span>Turn</span>
            <b>{turn}</b>
          </div>
          <div className="stat-row">
            <span>Explorable spaces</span>
            <b>{layout.spaces}</b>
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
                <h2>{boardVariants[variant]}</h2>
              </div>
              <div className="legend">
                <span>
                  <i className="plain" />
                  Plain
                </span>
                <span>
                  <i className="low" />
                  Low yield
                </span>
                <span>
                  <i className="high" />
                  High yield
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
                    aria-label={`${terrainLabel[tile.terrain]} sector ${i + 1}${tile.bridgeOwner != null ? `, bridge built by ${playerNames[tile.bridgeOwner]}` : ''}`}
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
                        style={{ fill: colors[tile.bridgeOwner ?? active] }}
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
              {(action?.kind === 'crawler' || action?.kind === 'drone') &&
                path.length > 0 && (
                  <g className="movement-route-overlay" aria-hidden="true">
                    {path.length > 1 && (
                      <polyline
                        points={routePoints}
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
                  className={`action-card ${selectedCard === card.id ? 'selected' : ''} ${boardTouched && selectedCard !== card.id ? 'locked' : ''}`}
                >
                  <button
                    onClick={() => chooseCard(card.id)}
                    disabled={boardTouched}
                    aria-label={`Select card: ${card.left.label} or ${card.right.label}`}
                    className="card-select-overlay"
                  />
                  <button
                    className={`card-half ${selectedCard === card.id && selectedSide === 'left' ? 'chosen' : ''}`}
                    onClick={() => chooseSide('left', card)}
                    disabled={boardTouched}
                  >
                    {card.left.label}
                    {card.left.kind === 'bridge' && (
                      <small className="bridge-card-note">Build within 5 spaces. Earn 1 Credit each time an opponent crosses.</small>
                    )}
                  </button>
                  <em>OR</em>
                  <button
                    className={`card-half right ${selectedCard === card.id && selectedSide === 'right' ? 'chosen' : ''}`}
                    onClick={() => chooseSide('right', card)}
                    disabled={boardTouched}
                  >
                    {card.right.label}
                    {card.right.kind === 'bridge' && (
                      <small className="bridge-card-note">Build within 5 spaces. Earn 1 Credit each time an opponent crosses.</small>
                    )}
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
              {boardTouched && !actionResolved && (
                <small>Card selection locked after board action began.</small>
              )}
            </div>
            {!actionResolved && action && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={
                    action.kind === 'crawler' || action.kind === 'drone'
                      ? stepsUsed === 0
                      : placedBridges.length === 0
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
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!actionResolved || claimDialogOpen || gameOver}
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
      <Dialog open={claimDialogOpen}>
        <DialogContent showCloseButton={false} className="mine-dialog">
          <DialogHeader>
            <DialogTitle>Mine claim available</DialogTitle>
            <DialogDescription>
              Discovering either mine earns 1 point. Low yield mines pay 2 points, then 1; high yield mines pay 3 points once. Choose a claim or skip the
              remaining opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="mine-options">
            {claimable.map((index) => (
              <Button
                key={index}
                variant="secondary"
                onClick={() => claimMine(index)}
              >
                Claim {terrainLabel[board[index].terrain]} +
                {miningPoints(board[index])}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={skipMining}>
              Skip remaining claims
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={passScreen}>
        <DialogContent showCloseButton={false} className="pass-dialog">
          <div
            className="pass-dialog-card"
            style={{ borderColor: colors[active] }}
          >
            <p className="eyebrow">Turn complete</p>
            <DialogHeader>
              <DialogTitle>Pass to {playerNames[active]}</DialogTitle>
              <DialogDescription>
                Hand the device to {playerNames[active]}. Only the next explorer
                should reveal their cards.
              </DialogDescription>
            </DialogHeader>
            <div
              className="pass-player-mark"
              style={{ background: colors[active] }}
              aria-hidden="true"
            >
              {playerNames[active].charAt(0)}
            </div>
            <Button size="lg" onClick={() => setPassScreen(false)}>
              Reveal {playerNames[active]}&apos;s hand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <section className="dev-controls" aria-labelledby="dev-controls-title">
        <div className="dev-heading">
          <div>
            <p className="eyebrow">Development controls</p>
            <h2 id="dev-controls-title">Terrain bag mix</h2>
          </div>
          <Button variant="secondary" onClick={() => setupGame(players)}>
            Apply mix &amp; reset game
          </Button>
        </div>
        <p className="muted">
          Adjusting one terrain type automatically rebalances the others. The
          four sliders always total 92%; volcanoes use the remaining fixed 8%.
        </p>
        <div className="mix-sliders">
          {adjustableTerrains.map((terrain) => (
            <label className="mix-slider" key={terrain}>
              <span>
                <b>{terrainLabel[terrain]}</b>
                <output>{tileMix[terrain]}%</output>
              </span>
              <input
                type="range"
                min="0"
                max="92"
                step="1"
                value={tileMix[terrain]}
                onChange={(event) =>
                  updateTileMix(terrain, Number(event.target.value))
                }
              />
              <small>
                {currentCounts[terrain]} tiles at {players} players
              </small>
            </label>
          ))}
          <div className="volcano-guideline">
            <span>Volcano</span>
            <strong>8%</strong>
            <small>
              2 players: 4 tiles · 3 players: 7 tiles · 4 players: 10 tiles
            </small>
          </div>
        </div>
      </section>
    </main>
  );
}
