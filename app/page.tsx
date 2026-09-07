'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mountain, Pickaxe, Radio, RotateCcw, Shield, TriangleAlert } from 'lucide-react';

type Terrain = 'unknown' | 'start' | 'plain' | 'canyon' | 'low' | 'high' | 'volcano';
type Card = { id: number; left: string; right: string };
const cards: Omit<Card, 'id'>[] = [
  { left: 'Crawler · 3', right: 'Drone · 6' }, { left: 'Crawler · 4', right: 'Drone · 5' },
  { left: 'Crawler · 5', right: 'Drone · 4' }, { left: 'Build · 2 bridges', right: 'Crawler · 1' },
  { left: 'Build · 1 bridge', right: 'Crawler · 2 + mine en route' }, { left: 'Build · 1 bridge', right: 'Drone · 4' },
];
const colors = ['#ffe08a', '#79d2a6', '#82b9ff', '#ef91b8'];
const playerNames = ['Astra', 'Beacon', 'Cosmo', 'Dawn'];
const terrainLabel: Record<Terrain, string> = { unknown:'Unexplored',start:'Base',plain:'Plain',canyon:'Canyon',low:'Low mine',high:'High mine',volcano:'Volcano' };
function shuffledBag() { return ([...Array(16).fill('plain'),...Array(7).fill('canyon'),...Array(9).fill('low'),...Array(5).fill('high'),...Array(4).fill('volcano')] as Terrain[]).sort(() => Math.random() - .5); }
function makeBoard() { const board=Array<Terrain>(37).fill('unknown'); board[18]='start'; return board; }
function makeHand(seed=0):Card[] { return Array.from({length:5},(_,i)=>({...cards[(i+seed)%cards.length],id:seed*10+i})); }

export default function Home() {
  const [players,setPlayers]=useState(3), [active,setActive]=useState(0), [turn,setTurn]=useState(1);
  const [board,setBoard]=useState<Terrain[]>(makeBoard), [bag,setBag]=useState<Terrain[]>(shuffledBag);
  const [hand,setHand]=useState<Card[]>(()=>makeHand()), [selected,setSelected]=useState<number|null>(null);
  const [scores,setScores]=useState([0,0,0,0]);
  const volcanoes=board.filter(t=>t==='volcano').length, gameOver=volcanoes>=4, explored=board.filter(t=>t!=='unknown').length;
  const status=useMemo(()=>gameOver?'Mission ended — compare scores.':`${playerNames[active]}'s turn`,[active,gameOver]);
  function reveal(index:number){if(gameOver||board[index]!=='unknown'||selected===null||!bag.length)return;setBoard(c=>c.map((t,i)=>i===index?bag[0]:t));setBag(c=>c.slice(1));}
  function scoreMine(value:number){if(!gameOver)setScores(c=>c.map((s,i)=>i===active?s+value:s));}
  function endTurn(){if(selected===null||gameOver)return;const fresh={...cards[(turn+active)%cards.length],id:Date.now()};setHand(c=>c.map(card=>card.id===selected?fresh:card));setSelected(null);setActive((active+1)%players);setTurn(v=>v+1);}
  function reset(){setActive(0);setTurn(1);setBoard(makeBoard());setBag(shuffledBag());setHand(makeHand());setSelected(null);setScores([0,0,0,0]);}
  useEffect(()=>{
    type ToolContext={registerTool:(tool:Record<string,unknown>,options:{signal:AbortSignal})=>void|Promise<void>};
    const context=(document as Document&{modelContext?:ToolContext}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    void Promise.resolve(context.registerTool({name:'start_new_game',title:'Start a new Venus Explorer game',description:'Reset the visible game and set the pass-and-play crew size.',inputSchema:{type:'object',properties:{playerCount:{type:'integer',minimum:2,maximum:4}},required:['playerCount'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input:unknown)=>{const value=(input as {playerCount?:unknown}).playerCount;if(!Number.isInteger(value)||Number(value)<2||Number(value)>4)throw new Error('playerCount must be 2, 3, or 4');setPlayers(Number(value));setActive(0);setTurn(1);setBoard(makeBoard());setBag(shuffledBag());setHand(makeHand());setSelected(null);setScores([0,0,0,0]);return{status:'ready',playerCount:value};}},{signal:lifecycle.signal})).catch(()=>{});
    return()=>lifecycle.abort();
  },[]);
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-white/10 bg-[#11100f]/90 px-4 py-3 backdrop-blur md:px-7"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="brand-mark">V</div><div><h1 className="text-xl font-black tracking-tight">VENUS EXPLORER</h1><p className="text-xs uppercase tracking-[.18em] text-[#bdb5a8]">Veld Mining Company · v0.0</p></div></div>
      <div className="flex items-center gap-2 text-sm"><span className="status-dot" />{status}<Button variant="outline" size="sm" onClick={reset}><RotateCcw/>Reset</Button></div>
    </div></header>
    <section className="mx-auto grid max-w-[1500px] gap-4 p-4 md:p-7 xl:grid-cols-[250px_minmax(540px,1fr)_330px]">
      <aside className="panel order-2 xl:order-1"><p className="eyebrow">Crew manifest</p><div className="mb-5 grid grid-cols-3 gap-2">{[2,3,4].map(n=><Button key={n} size="sm" variant={players===n?'default':'outline'} onClick={()=>{setPlayers(n);setActive(0)}}>{n} players</Button>)}</div>
        <div className="space-y-2">{playerNames.slice(0,players).map((name,i)=><div key={name} className={`crew ${i===active?'active':''}`}><span className="crew-color" style={{background:colors[i]}}/><div className="flex-1"><strong>{name}</strong><small>{i===active?'Active explorer':'Standing by'}</small></div><b>{scores[i]}</b></div>)}</div>
        <div className="divider"/><p className="eyebrow">Mission clock</p><div className="volcano-track">{[0,1,2,3].map(i=><span key={i} className={i<volcanoes?'lit':''}><TriangleAlert/></span>)}</div><p className="muted">The fourth volcano ends the mission immediately.</p>
        <div className="stat-row"><span>Turn</span><b>{turn}</b></div><div className="stat-row"><span>Mapped</span><b>{explored} / 37</b></div><div className="stat-row"><span>Tiles left</span><b>{bag.length}</b></div>
      </aside>
      <section className="board-shell order-1 xl:order-2" aria-label="Venus exploration board"><div className="board-heading"><div><p className="eyebrow">Ishtar Terra sector</p><h2>Shared survey map</h2></div><div className="legend"><span><i className="plain"/>Plain</span><span><i className="low"/>Low</span><span><i className="high"/>High</span><span><i className="canyon"/>Canyon</span></div></div>
        <div className="hex-grid">{board.map((tile,i)=><button key={i} className={`hex ${tile}`} onClick={()=>reveal(i)} disabled={tile!=='unknown'||selected===null} aria-label={`${terrainLabel[tile]} sector ${i+1}`} title={terrainLabel[tile]}>{tile==='start'&&<Shield/>}{tile==='low'&&<Pickaxe/>}{tile==='high'&&<Pickaxe/>}{tile==='volcano'&&<TriangleAlert/>}{tile==='canyon'&&<Mountain/>}{tile==='unknown'&&<span>?</span>}</button>)}</div>
        <p className="board-note"><Radio/>Select a card, then choose an unexplored hex to simulate drone discovery.</p>
      </section>
      <aside className="panel order-3"><p className="eyebrow">Command hand · choose one card</p><div className="space-y-2">{hand.map(card=><button key={card.id} className={`action-card ${selected===card.id?'selected':''}`} onClick={()=>setSelected(card.id)}><span>{card.left}</span><em>OR</em><span>{card.right}</span></button>)}</div>
        <div className="divider"/><p className="eyebrow">Prototype mining controls</p><div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={()=>scoreMine(1)}>Claim low +1</Button><Button variant="secondary" onClick={()=>scoreMine(3)}>Claim high +3</Button></div><p className="muted mt-3">Movement paths and claims will be enforced in the next rules-engine stage. These controls let you test scoring now.</p>
        <Button className="mt-5 w-full" size="lg" disabled={selected===null||gameOver} onClick={endTurn}>Discard card &amp; end turn</Button>{gameOver&&<div className="end-state"><TriangleAlert/><strong>Surface evacuation triggered</strong><span>Highest score wins.</span></div>}
      </aside>
    </section>
  </main>;
}
