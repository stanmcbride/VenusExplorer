// Execute the working game's handlers, rather than reimplementing its rules.
import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export function rng(seed) {
  return { state: seed >>> 0, next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  } };
}
export const seedFor = text => parseInt(hash(text).slice(0, 8), 16);
const source = fs.readFileSync(process.env.RULES_SOURCE ?? new URL('../../app/page.tsx', import.meta.url), 'utf8');
export const sourceHash = hash(source);
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let body = source.slice(0, source.indexOf('  if (!clientReady) return'));
if (!body.includes('function endTurn()') || !body.includes('function setupGame(')) throw Error('Game adapter needs review: source structure changed.');
for (const node of [...ast.statements].reverse()) {
  if (ts.isImportDeclaration(node)) body = body.slice(0, node.getFullStart()) + body.slice(node.end);
}
body = 'const useSyncExternalStore = () => true;\n' + body.replace('export default function Home()', 'function Home()');
export const stateNames = [...body.matchAll(/\[\s*(\w+)\s*,\s*(set\w+)\s*\]\s*=\s*useState/g)].map(m => [m[1], m[2]]);
const names = ['players','active','turn','variant','layout','hexes','board','bag','bagSize','setAsideTiles','setAsideVolcanoes','hands','crawlerPositions','scores','selectedCard','selectedSide','path','placedBridges','boardTouched','actionResolved','claimable','claimDialogOpen','passScreen','action','gameOver','volcanoTarget','volcanoes','stepsUsed','currentCounts','cardSupply','mulligan'];
const handlers = ['beginMulligan','setupGame','chooseCard','chooseSide','tileIsLegal','handleTile','undoStep','resolveAction','claimMine','skipMining','endTurn','setPassScreen'];
body += `return {${[...names,...handlers,...stateNames.map(x=>x[1])].join(',')}};\n}\nreturn {Home, makeLayout, terrainCounts, defaultTileMix, cardTypes, miningPoints, adjacent, bridgeDistance};`;
const compiled = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
// Trusted local, fingerprinted source only; this intentionally executes the existing handlers.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const factory = new Function('useState','useMemo','useEffect','Math', compiled);

export class Engine {
  constructor(spec, saved) {
    this.random = rng(spec.terrainSeed);
    this.slots = [];
    this.memos = [];
    const seededMath = Object.create(Math);
    seededMath.random = () => this.random.next();
    this.rules = factory(initial => {
      const i = this.cursor++;
      if (!(i in this.slots)) this.slots[i] = typeof initial === 'function' ? initial() : initial;
      return [this.slots[i], value => { this.slots[i] = typeof value === 'function' ? value(this.slots[i]) : value; }];
    }, (fn, deps) => {
      const i = this.memoCursor++;
      const old = this.memos[i];
      if (!old || deps.some((d,k)=> !Object.is(d,old.deps[k]))) this.memos[i] = {deps,value:fn()};
      return this.memos[i].value;
    }, () => {}, seededMath);
    this.render();
    this.call('setupGame', spec.players, spec.variant);
    if (saved) { this.slots = structuredClone(saved.slots); this.random.state = saved.random; this.memos = []; this.render(); }
    this.neighbors = this.s.hexes.map(a => this.s.hexes.flatMap((b,i)=>this.rules.adjacent(a,b)?[i]:[]));
  }
  render() { this.cursor = 0; this.memoCursor = 0; this.s = this.rules.Home(); return this.s; }
  call(name,...args) { this.s[name](...args); return this.render(); }
  save() { return {slots:structuredClone(this.slots),random:this.random.state}; }
  // Explicit whitelist: policies never receive bag, other hands, RNG, setters or engine.
  observe() {
    const s = this.s;
    return structuredClone({ players:s.players, active:s.active, turn:s.turn, variant:s.variant,
      hexes:s.hexes, neighbors:this.neighbors, board:s.board, positions:s.crawlerPositions,
      scores:s.scores.slice(0,s.players), hand:s.hands[s.active], volcanoes:s.volcanoes,
      volcanoTarget:s.volcanoTarget, path:s.path, action:s.action, stepsUsed:s.stepsUsed,
      gameOver:s.gameOver, counts:s.currentCounts, bagSize:s.bagSize, bagRemaining:s.bag.length,
      setAsideCount:s.setAsideTiles.length,setAsideVolcanoes:s.setAsideVolcanoes });
  }
}
